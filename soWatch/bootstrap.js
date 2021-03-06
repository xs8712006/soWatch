'use strict';

Components.utils.import('resource:///modules/CustomizableUI.jsm'); //Require Gecko 29 and later
Components.utils.import('resource://gre/modules/osfile.jsm'); //Require Gecko 27 and later
Components.utils.import('resource://gre/modules/Downloads.jsm'); //Require Gecko 26 and later
Components.utils.import('resource://gre/modules/NetUtil.jsm'); //Promise chain that require Gecko 25 and later

var Utilities = {}, PlayerRules = {}, FilterRules = {}, RefererRules = {};

var Services = {
  io: Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),
  obs: Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService),
  prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).QueryInterface(Components.interfaces.nsIPrefBranch),
  sss: Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService),
  strings: Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService),
};

var FileIO = {
  addFolder: function () {
    OS.File.makeDir(this.extDir);
  },
  delFolder: function () {
    OS.File.removeDir(this.extDir);
  },
};

var PrefBranch = Services.prefs.getBranch('extensions.sowatch.');
var PrefValue = {
  'autoupdate': {
    pref: 'autoupdate.enabled',
    bool: false,
  },
  'lastdate': {
    pref: 'autoupdate.lastdate',
    integer: parseInt(Date.now() / 1000),
  },
  'period': {
    pref: 'autoupdate.period',
    integer: 7,
  },
  'remote': {
    pref: 'remote.access.enabled',
    bool: false,
  },
  'override': {
    pref: 'remote.override.enabled',
    bool: false,
  },
  'directory': {
    pref: 'file.directory',
    string: OS.Path.join(OS.Constants.Path.profileDir, 'soWatch'),
  },
  'server': {
    pref: 'remote.server.defined',
    string: '',
  },
  'bitbucket': {
    pref: 'remote.server.bitbucket',
    string: 'https://bitbucket.org/kafan15536900/haoutil/raw/master/player/testmod/',
  },
  'player': {
    pref: 'general.player.enabled',
    bool: true,
  },
  'filter': {
    pref: 'general.filter.enabled',
    bool: true,
  },
  'referer': {
    pref: 'general.referer.enabled',
    bool: true,
  },
  'toolbar': {
    pref: 'general.interface.enabled',
    bool: true,
  },
  'firstrun': {
    pref: 'general.firstrun.done',
    bool: false,
  },
};
var Preferences = {
  getBool: function (aPref) {
    return PrefBranch.getBoolPref(aPref);
  },
  setBool: function (aPref, aBool) {
    PrefBranch.setBoolPref(aPref, aBool);
  },
  getInteger: function (aPref) {
    return PrefBranch.getIntPref(aPref);
  },
  setInteger: function (aPref, aInteger) {
    PrefBranch.setIntPref(aPref, aInteger);
  },
  getChar: function (aPref) {
    return PrefBranch.getComplexValue(aPref, Components.interfaces.nsISupportsString).data;
  },
  setChar: function (aPref, aString) {
    var aChar = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
    aChar.data = aString;
    PrefBranch.setComplexValue(aPref, Components.interfaces.nsISupportsString, aChar);
  },
  getValue: function (aValue) {
    if ('bool' in aValue) {
      this.getBool(aValue.pref);
    }
    if ('integer' in aValue) {
      this.getInteger(aValue.pref);
    }
    if ('string' in aValue) {
      this.getChar(aValue.pref);
    }
  },
  setValue: function (aValue) {
    if ('bool' in aValue) {
      this.setBool(aValue.pref, aValue.bool);
    }
    if ('integer' in aValue) {
      this.setInteger(aValue.pref, aValue.integer);
    }
    if ('string' in aValue) {
      this.setChar(aValue.pref, aValue.string);
    }
  },
  pending: function () {
    for (var i in PrefValue) {
      var aValue = PrefValue[i];
      try {
        this.getValue(aValue);
      } catch (e) {
        this.setValue(aValue);
      }
    }

    this.setChar(PrefValue['bitbucket'].pref, PrefValue['bitbucket'].string);  // 禁止修改bitbucket否则会影响扩展工作

    if (this.getChar(PrefValue['directory'].pref)) FileIO.extDir = this.getChar(PrefValue['directory'].pref);
    FileIO.path = OS.Path.toFileURI(this.getChar(PrefValue['directory'].pref)) + '/';

    if (this.getChar(PrefValue['server'].pref)) {
      FileIO.server = this.getChar(PrefValue['server'].pref);
    } else {
      this.setBool(PrefValue['override'].pref, false);
      FileIO.server = 'https://raw.githubusercontent.com/jc3213/soWatch/master/player/';
    }

    if (this.getBool(PrefValue['remote'].pref)) this.setBool(PrefValue['autoupdate'].pref, false);

    if (this.getBool(PrefValue['override'].pref)) FileIO.link = this.getChar(PrefValue['server'].pref);
    else FileIO.link = this.getChar(PrefValue['bitbucket'].pref);

    if (this.getBool(PrefValue['autoupdate'].pref)) {
      if (this.getInteger(PrefValue['lastdate'].pref) + this.getInteger(PrefValue['period'].pref) * 86400 < Date.now() / 1000) QueryFiles.start(0);
    }

    this.manifest();
  },
  manifest: function () {
    RuleManager.player();
    RuleManager.filter();
    RuleManager.referer();

    for (var i in RuleResolver) {
      if (RuleResolver[i].playerOn) RuleResolver[i].playerOn();
      if (RuleResolver[i].filterOn) RuleResolver[i].filterOn();
      if (RuleResolver[i].refererOn) RuleResolver[i].refererOn();
    }

    if (this.getBool(PrefValue['toolbar'].pref)) Toolbar.addIcon();
    else Toolbar.removeIcon();

    if (!this.getBool(PrefValue['firstrun'].pref)) {
      QueryFiles.start(0);
      this.setBool(PrefValue['firstrun'].pref, true);
    }
  },
  setDefault: function () {
    for (var i in PrefValue) {
      if (i == 'directory' || i == 'server') continue;
      var aValue = PrefValue[i];
      this.setValue(aValue);
    }
  },
  remove: function () {
    Services.prefs.deleteBranch('extensions.sowatch.');
  },
};

var QueryFiles = {
  hash: function (aMode, aLink, aFile, aName, aProbe) {
    if (!aProbe) var aProbe = 0;
    if (aProbe <= 3) {
      aProbe = aProbe + 1;
      var aClient = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
      aClient.open('HEAD', aLink, false);
      aClient.onload = function () {
        var aSize = new Number(aClient.getResponseHeader('Content-Length'));
        if (aSize < 5000) aClient.onerror();
        var aHash = aSize.toString(16);
        aLink = aClient.responseURL;
        if (aMode == 0) QueryFiles.check(aLink, aFile, aName, aHash);
        if (aMode == 1) QueryFiles.fetch(aLink, aFile, aName, aHash);
      }
      aClient.onerror = function () {
        aClient.abort();
        QueryFiles.hash(aMode, aLink, aFile, aName, aProbe);
      }
      aClient.send();
    } else return;
  },
  check: function (aLink, aFile, aName, aHash) {
    try {
      var xHash = PrefBranch.getCharPref('file.hash.' + aName);
      if (xHash == aHash) return;
      else QueryFiles.fetch(aLink, aFile, aName, aHash);
    } catch (e) {
      OS.File.stat(aFile).then(function onSuccess(aData) {
        var xSize = aData.size;
        var xHash = xSize.toString(16);
        if (xHash == aHash) PrefBranch.setCharPref('file.hash.' + aName, aHash);
        else QueryFiles.fetch(aLink, aFile, aName, aHash);
      }, function onFailure(aReason) {
        if (aReason instanceof OS.File.Error && aReason.becauseNoSuchFile) {
          QueryFiles.fetch(aLink, aFile, aName, aHash);
        }
      });
    }
  },
  fetch: function (aLink, aFile, aName, aHash, aProbe) {
    if (!aProbe) var aProbe = 0;
    if (aProbe <= 3) {
      aProbe = aProbe + 1;
      var aTemp = aFile + '_sw';  // 因为Downloads.jsm并不能直接覆盖原文件所以需要使用临时文件
      Downloads.fetch(aLink, aTemp, {
        isPrivate: true
      }).then(function onSuccess() {
        OS.File.move(aTemp, aFile);
        PrefBranch.setCharPref('file.hash.' + aName, aHash);
      }, function onFailure() {
        OS.File.remove(aTemp);
        QueryFiles.fetch(aLink, aFile, aName, aHash, aProbe);
      });
    } else return;
  },
  start: function (aMode) {
    FileIO.addFolder();
    for (var i in PlayerRules) {
      if (PlayerRules[i]['remote']) {
        var aLink = PlayerRules[i]['remote'];
        var aFile = OS.Path.fromFileURI(PlayerRules[i]['object']);
        var aName = OS.Path.split(aFile).components[OS.Path.split(aFile).components.length - 1];
        QueryFiles.hash(aMode, aLink, aFile, aName);
      }
    }
    Preferences.setInteger(PrefValue['lastdate'].pref, PrefValue['lastdate'].integer);  // 下载完成后记录时间以供下次更新时检测
  },
};

var Toolbar = {
  css: Services.io.newURI('chrome://sowatch/skin/toolbar.css', null, null),
  addIcon: function () {
    if (this.buttonOn) return;
    CustomizableUI.createWidget({
      id: 'sowatch-button',
      type: 'custom',
      defaultArea: CustomizableUI.AREA_NAVBAR,
      onBuild: function (aDocument) {
        var aLists = {
          'default': {
            label: Utilities.GetStringFromName('setDefaultLabel'),
            tooltiptext: Utilities.GetStringFromName('setDefaultDescription'),
          },
          S1: null,  // Menu separator
          'remote': {
            label: Utilities.GetStringFromName('remoteAccessLabel'),
            tooltiptext: Utilities.GetStringFromName('remoteAccessDescription'),
          },
          'autoupdate': {
            label: Utilities.GetStringFromName('autoUpdateLabel'),
            tooltiptext: Utilities.GetStringFromName('autoUpdateDescription'),
          },
          S2: null,  // Menu separator
          'checkupdate': {
            label: Utilities.GetStringFromName('checkUpdateLabel'),
            tooltiptext: Utilities.GetStringFromName('checkUpdateDescription'),
          },
          'forceupdate': {
            label: Utilities.GetStringFromName('forceUpdateLabel'),
            tooltiptext: Utilities.GetStringFromName('forceUpdateDescription'),
          },
        };

        var aMenu = aDocument.createElement('toolbarbutton');
        aMenu.setAttribute('id', 'sowatch-button');
        aMenu.setAttribute('class', 'toolbarbutton-1');
        aMenu.setAttribute('type', 'menu');
        aMenu.setAttribute('label', 'soWatch! ');

        var aPopup = aDocument.createElement('menupopup');
        aPopup.setAttribute('id', 'sowatch-popup');
        aPopup.addEventListener('click', this.onClick, false);
        aPopup.addEventListener('popupshowing', this.onPopup, false);
        aMenu.appendChild(aPopup);

        for (var i in aLists) {
          if (i.length < 3) {
            var aSeparator = aDocument.createElement('menuseparator');
            aPopup.appendChild(aSeparator);
          } else {
            var aItem = aDocument.createElement('menuitem');
            aItem.setAttribute('id', 'sowatch-' + i);
            aItem.setAttribute('label', aLists[i].label);
            aItem.setAttribute('tooltiptext', aLists[i].tooltiptext);
            aItem.setAttribute('class', 'menuitem-iconic');
            if (i == 'autoupdate' || i == 'remote') aItem.setAttribute('type', 'checkbox');
            aPopup.appendChild(aItem);
          }
        }

        return aMenu;
      },
      onClick: function (aEvent) {
        if (aEvent.target.id == 'sowatch-default') Preferences.setDefault();

        if (aEvent.target.id == 'sowatch-remote') {
          if (Preferences.getBool(PrefValue['remote'].pref)) Preferences.setBool(PrefValue['remote'].pref, false);
          else Preferences.setBool(PrefValue['remote'].pref, true);
        }

        if (aEvent.target.id == 'sowatch-autoupdate') {
          if (Preferences.getBool(PrefValue['autoupdate'].pref)) Preferences.setBool(PrefValue['autoupdate'].pref, false);
          else Preferences.setBool(PrefValue['autoupdate'].pref, true);
        }

        if (aEvent.target.id == 'sowatch-checkupdate') {
          if (Preferences.getBool(PrefValue['remote'].pref)) return;
          QueryFiles.start(0);
        }

        if (aEvent.target.id == 'sowatch-forceupdate') {
          if (Preferences.getBool(PrefValue['remote'].pref)) return;
          QueryFiles.start(1);
        }
      },
      onPopup: function (aEvent) {
        if (aEvent.target.id == 'sowatch-popup') {
          if (Preferences.getBool(PrefValue['remote'].pref)) {
            aEvent.target.querySelector('#sowatch-remote').setAttribute('checked', 'true');
            aEvent.target.querySelector('#sowatch-autoupdate').setAttribute('disabled', 'true');
            aEvent.target.querySelector('#sowatch-checkupdate').setAttribute('disabled', 'true');
            aEvent.target.querySelector('#sowatch-forceupdate').setAttribute('disabled', 'true');
          } else {
            aEvent.target.querySelector('#sowatch-remote').setAttribute('checked', 'false');
            aEvent.target.querySelector('#sowatch-autoupdate').setAttribute('disabled', 'false');
            aEvent.target.querySelector('#sowatch-checkupdate').setAttribute('disabled', 'false');
            aEvent.target.querySelector('#sowatch-forceupdate').setAttribute('disabled', 'false');
          }

          if (Preferences.getBool(PrefValue['autoupdate'].pref)) aEvent.target.querySelector('#sowatch-autoupdate').setAttribute('checked', 'true');
          else aEvent.target.querySelector('#sowatch-autoupdate').setAttribute('checked', 'false');
        }
      },
    });
    Services.sss.loadAndRegisterSheet(this.css, Services.sss.AUTHOR_SHEET);
    this.buttonOn = true;
  },
  removeIcon: function () {
    if (!this.buttonOn) return;
    Services.sss.unregisterSheet(this.css, Services.sss.AUTHOR_SHEET);
    CustomizableUI.destroyWidget('sowatch-button');
    this.buttonOn = false;
  },
};

var RuleManager = {
  player: function () {
    PlayerRules['youku_loader'] = {
      'object': FileIO.path + 'loader.swf',
      'remote': FileIO.link + 'loader.swf',
    };
    PlayerRules['youku_player'] = {
      'object': FileIO.path + 'player.swf',
      'remote': FileIO.link + 'player.swf',
    };
    PlayerRules['tudou_portal'] = {
      'object': FileIO.path + 'tudou.swf',
      'remote': FileIO.link + 'tudou.swf',
    };
    PlayerRules['tudou_olc'] = {
      'object': 'http://js.tudouui.com/bin/player2/olc.swf',
    };
    PlayerRules['tudou_social'] = {
      'object': FileIO.path + 'sp.swf',
      'remote': FileIO.link + 'sp.swf',
    };
    PlayerRules['iqiyi5'] = {
      'object': FileIO.path + 'iqiyi5.swf',
      'remote': FileIO.link + 'iqiyi5.swf',
    };
    PlayerRules['iqiyi_out'] = {
      'object': FileIO.path + 'iqiyi_out.swf',
      'remote': FileIO.link + 'iqiyi_out.swf',
    };
    PlayerRules['letv'] = {
      'object': FileIO.path + 'letv.swf',
      'remote': FileIO.link + 'letv.swf',
    };
    PlayerRules['letv_skin'] = {
      'object': 'http://player.letvcdn.com/p/201407/24/15/newplayer/1/SSLetvPlayer.swf',
    };
    PlayerRules['sohu'] = {
      'object': FileIO.path + 'sohu_live.swf',
      'remote': FileIO.link + 'sohu_live.swf',
    };
    PlayerRules['pptv'] = {
      'object': FileIO.path + 'player4player2.swf',
      'remote': FileIO.link + 'player4player2.swf',
    };
    PlayerRules['pptv_live'] = {
      'object': FileIO.path + 'pptv.in.Live.swf',
      'remote': FileIO.server + 'pptv.in.Live.swf',
    };
  },
  filter: function () {
    FilterRules['youku_tudou'] = {
      'object': 'http://valf.atm.youku.com/vf',
    };
    FilterRules['letv'] = {
      'object': 'http://ark.letv.com/s',
    };
    FilterRules['sohu'] = {
      'object': 'http://v.aty.sohu.com/v',
    };
    FilterRules['pptv'] = {
      'object': 'http://de.as.pptv.com/ikandelivery/vast/draft',
    };
    FilterRules['qq'] = {
      'object': 'http://livep.l.qq.com/livemsg',
    };
    FilterRules['163'] = {
      'object': 'http://v.163.com',
    };
    FilterRules['sina'] = {
      'object': 'http://sax.sina.com.cn/video/newimpress',
    };
  },
  referer: function () {
    RefererRules['referer-youku'] = {
      'object': 'http://www.youku.com/',
    };
    RefererRules['referer-iqiyi'] = {
      'object': 'http://www.iqiyi.com/',
    };
  },
};
var RuleResolver = {
  'youku': {
    playerOn: function () {
      PlayerRules['youku_loader']['target'] = /http:\/\/static\.youku\.com\/.*\/v\/swf\/loaders?\.swf/i;
      PlayerRules['youku_player']['target'] = /http:\/\/static\.youku\.com\/.*\/v\/swf\/q?player.*\.swf/i;
    },
    playerOff: function () {
      PlayerRules['youku_loader']['target'] = null;
      PlayerRules['youku_player']['target'] = null;
    },
    filterOn: function () {
      FilterRules['youku_tudou']['target'] = /http:\/\/val[fcopb]\.atm\.youku\.com\/v[fcopb]/i;
    },
    filterOff: function () {
      FilterRules['youku_tudou']['target'] = null;
    },
    refererOn: function () {
      RefererRules['referer-youku']['target'] = /http:\/\/.*\.youku\.com/i;
    },
    refererOff: function () {
      RefererRules['referer-youku']['target'] = null;
    },
  },
  'tudou': {
    playerOn: function () {
      PlayerRules['tudou_portal']['target'] = /http:\/\/js\.tudouui\.com\/bin\/lingtong\/PortalPlayer.*\.swf/i;
      PlayerRules['tudou_olc']['target'] = /http:\/\/js\.tudouui\.com\/bin\/player2\/olc.+\.swf/i;
      PlayerRules['tudou_social']['target'] = /http:\/\/js\.tudouui\.com\/bin\/lingtong\/SocialPlayer.*\.swf/i;
    },
    playerOff: function () {
      PlayerRules['tudou_portal']['target'] = null;
      PlayerRules['tudou_olc']['target'] = null;
      PlayerRules['tudou_social']['target'] = null;
    },
    filterOn: function () {
      FilterRules['youku_tudou']['target'] = /http:\/\/val[fcopb]\.atm\.youku\.com\/v[fcopb]/i;
    },
    filterOff: function () {
      FilterRules['youku_tudou']['target'] = null;
    },
  },
  'iqiyi': {
    playerOn: function () {
      PlayerRules['iqiyi5']['target'] = /http:\/\/www\.iqiyi\.com\/common\/flashplayer\/\d+\/MainPlayer.*\.swf/i;
      PlayerRules['iqiyi_out']['target'] = /https?:\/\/www\.iqiyi\.com\/(common\/flash)?player\/\d+\/(Share|Enjoy)?Player.*\.swf/i;
    },
    playerOff: function () {
      PlayerRules['iqiyi5']['target'] = null;
      PlayerRules['iqiyi_out']['target'] = null;
    },
    filterOn: function () {},
    filterOff: function () {},
    refererOn: function () {
      RefererRules['referer-iqiyi']['target'] = /http:\/\/.*\.qiyi\.com/i;
    },
    refererOff: function () {
      RefererRules['referer-iqiyi']['target'] = null;
    },
  },
  'letv': {
    playerOn: function () {
      PlayerRules['letv']['target'] = /http:\/\/.*\.letv(cdn)?\.com\/.*(new)?player\/((SDK)?Letv|swf)Player\.swf/i;
      PlayerRules['letv_skin']['target'] = /http:\/\/player\.letvcdn\.com\/p\/((?!15)\d+\/){3}newplayer\/1\/S?SLetvPlayer\.swf/i;
    },
    playerOff: function () {
      PlayerRules['letv']['target'] = null;
      PlayerRules['letv_skin']['target'] = null;
    },
    filterOn: function () {
      FilterRules['letv']['target'] = /http:\/\/(ark|fz)\.letv\.com\/s\?ark/i;
    },
    filterOff: function () {
      FilterRules['letv']['target'] = null;
    },
  },
  'sohu': {
    playerOn: function () {
      PlayerRules['sohu']['target'] = /http:\/\/(tv\.sohu\.com\/upload\/swf\/(p2p\/|56\/)?\d+|(\d+\.){3}\d+\/webplayer)\/Main\.swf/i;
    },
    playerOff: function () {
      PlayerRules['sohu']['target'] = null;
    },
    filterOn: function () {
      FilterRules['sohu']['target'] = /http:\/\/v\.aty\.sohu\.com\/v\?/i;
    },
    filterOff: function () {
      FilterRules['sohu']['target'] = null;
    },
  },
  'pptv': {
    playerOn: function () {
      PlayerRules['pptv']['target'] = /http:\/\/player.pplive.cn\/ikan\/.*\/player4player2\.swf/i;
      PlayerRules['pptv_live']['target'] = /http:\/\/player.pplive.cn\/live\/.*\/player4live2\.swf/i;
    },
    playerOff: function () {
      PlayerRules['pptv']['target'] = null;
      PlayerRules['pptv_live']['target'] = null;
    },
    filterOn: function () {
      FilterRules['pptv']['target'] = /http:\/\/de\.as\.pptv\.com\/ikandelivery\/vast\/.+draft/i;
    },
    filterOff: function () {
      FilterRules['pptv']['target'] = null;
    },
  },
  'qq': {
    playerOn: function () {},
    playerOff: function () {},
    filterOn: function () {
      FilterRules['qq']['target'] = /http:\/\/livew\.l\.qq\.com\/livemsg\?/i;
    },
    filterOff: function () {
      FilterRules['qq']['target'] = null;
    },
  },
  '163': {
    playerOn: function () {},
    playerOff: function () {},
    filterOn: function () {
      FilterRules['163']['target'] = /http:\/\/v\.163\.com\/special\/.*\.xml/i
    },
    filterOff: function () {
      FilterRules['163']['target'] = null;
    },
  },
  'sina': {
    playerOn: function () {},
    playerOff: function () {},
    filterOn: function () {
      FilterRules['sina']['target'] = /http:\/\/sax\.sina\.com\.cn\/video\/newimpress/i;
    },
    filterOff: function () {
      FilterRules['sina']['target'] = null;
    },
  },
};

var RuleExecution = {
  getObject: function (aMode, rule, callback) {
    if (aMode == 0) var aObject = rule['object'];
    if (aMode == 1) var aObject = rule['remote'];
    NetUtil.asyncFetch(aObject, function (inputStream, status) {
      var binaryOutputStream = Components.classes['@mozilla.org/binaryoutputstream;1'].createInstance(Components.interfaces.nsIBinaryOutputStream);
      var storageStream = Components.classes['@mozilla.org/storagestream;1'].createInstance(Components.interfaces.nsIStorageStream);
      var count = inputStream.available();
      var data = NetUtil.readInputStreamToString(inputStream, count);
        storageStream.init(512, count, null);
        binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
        binaryOutputStream.writeBytes(data, count);
        rule['storageStream'] = storageStream;
        rule['count'] = count;
      if (typeof callback === 'function') {
        callback();
      }
    });
  },
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) || aIID.equals(Components.interfaces.nsIObserver)) return this;
    return Components.results.NS_ERROR_NO_INTERFACE;
  },
  referer: function (aSubject) {
    if (!Preferences.getBool(PrefValue['referer'].pref)) return;

    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    for (var i in RefererRules) {
      var rule = RefererRules[i];
      if (rule['target'] && rule['target'].test(httpChannel.originalURI.spec)) {
        httpChannel.setRequestHeader('Referer', rule['host'], false);
      }
    }
  },
  filter: function (aSubject) {
    if (!Preferences.getBool(PrefValue['filter'].pref)) return;

    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    for (var i in FilterRules) {
      var rule = FilterRules[i];
      if (rule['target'] && rule['target'].test(httpChannel.URI.spec)) {
        if (!rule['storageStream'] || !rule['count']) {
          httpChannel.suspend();
          this.getObject(0, rule, function () {
            httpChannel.resume();
          });
        }
        var newListener = new TrackingListener();
        aSubject.QueryInterface(Components.interfaces.nsITraceableChannel);
        newListener.originalListener = aSubject.setNewListener(newListener);
        newListener.rule = rule;
        break;
      }
    }
  },
  player: function (aSubject) {
    if (!Preferences.getBool(PrefValue['player'].pref)) return;

    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    var aVisitor = new HttpHeaderVisitor();
    httpChannel.visitResponseHeaders(aVisitor);
    if (!aVisitor.isFlash()) return;

    for (var i in PlayerRules) {
      var rule = PlayerRules[i];
      if (rule['target'] && rule['target'].test(httpChannel.URI.spec)) {
        var fn = this, args = Array.prototype.slice.call(arguments);
        if (typeof rule['preHandle'] === 'function') rule['preHandle'].apply(fn, args);
        if (!rule['storageStream'] || !rule['count']) {
          httpChannel.suspend();
          if (Preferences.getBool(PrefValue['remote'].pref)) {
            this.getObject(1, rule, function () {
              httpChannel.resume();
              if (typeof rule['callback'] === 'function') rule['callback'].apply(fn, args);
            });
          } else {
            this.getObject(0, rule, function () {
              httpChannel.resume();
              if (typeof rule['callback'] === 'function') rule['callback'].apply(fn, args);
            });
          }
        }
        var newListener = new TrackingListener();
        aSubject.QueryInterface(Components.interfaces.nsITraceableChannel);
        newListener.originalListener = aSubject.setNewListener(newListener);
        newListener.rule = rule;
        break;
      }
    }
  },
  getWindowForRequest: function (aRequest) {
    if (aRequest instanceof Components.interfaces.nsIRequest) {
      try {
        if (aRequest.notificationCallbacks) {
          return aRequest.notificationCallbacks.getInterface(Components.interfaces.nsILoadContext).associatedWindow;
        }
      } catch (e) {}
      try {
        if (aRequest.loadGroup && aRequest.loadGroup.notificationCallbacks) {
          return aRequest.loadGroup.notificationCallbacks.getInterface(Components.interfaces.nsILoadContext).associatedWindow;
        }
      } catch (e) {}
    }
    return null;
  },
  iqiyi: function () {
    var rule = PlayerRules['iqiyi'];
    if (!rule) return;
    rule['preHandle'] = function (aSubject) {
      var wnd = this.getWindowForRequest(aSubject);
      if (wnd) {
        rule['command'] = [
          !/(^((?!baidu|61|178).)*\.iqiyi\.com|pps\.tv)/i.test(wnd.self.location.host),
          wnd.self.document.querySelector('span[data-flashplayerparam-flashurl]'),
          true
        ];
        if (!rule['command']) return;
        for (var i = 0; i < rule['command'].length; i++) {
          if (rule['command'][i]) {
            if (rule['object'] != rule['object' + i]) {
              rule['object'] = rule['object' + i];
              rule['storageStream'] = rule['storageStream' + i] ? rule['storageStream' + i] : null;
              rule['count'] = rule['count' + i] ? rule['count' + i] : null;
            }
            break;
          }
        }
      }
    };
    rule['callback'] = function () {
      if (!rule['command']) return;
      for (var i = 0; i < rule['command'].length; i++) {
        if (rule['object' + i] == rule['object']) {
          rule['storageStream' + i] = rule['storageStream'];
          rule['count' + i] = rule['count'];
          break;
        }
      }
    };
  },
};

function TrackingListener() {
  this.originalListener = null;
  this.rule = null;
}
TrackingListener.prototype = {
  onStartRequest: function (aRequest, aContext) {
    this.originalListener.onStartRequest(aRequest, aContext);
  },
  onStopRequest: function (aRequest, aContext) {
    this.originalListener.onStopRequest(aRequest, aContext, Components.results.NS_OK);
  },
  onDataAvailable: function (aRequest, aContext) {
    this.originalListener.onDataAvailable(aRequest, aContext, this.rule['storageStream'].newInputStream(0), 0, this.rule['count']);
  }
}

function HttpHeaderVisitor() {
  this._isFlash = false;
}
HttpHeaderVisitor.prototype = {
  visitHeader: function (aHeader, aValue) {
    if (aHeader.indexOf('Content-Type') !== -1) {
      if (aValue.indexOf('application/x-shockwave-flash') !== -1) {
        this._isFlash = true;
      }
    }
  },
  isFlash: function () {
    return this._isFlash;
  }
}

var Observers = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic == 'nsPref:changed') {
      Preferences.pending();
    }
    if (aTopic == 'http-on-modify-request') {
      RuleExecution.referer(aSubject);
    }
    if (aTopic == 'http-on-examine-response') {
      RuleExecution.filter(aSubject);
      RuleExecution.player(aSubject);
    }
  },
  startUp: function () {
    PrefBranch.addObserver('', this, false);
    Services.obs.addObserver(this, 'http-on-examine-response', false);
    Services.obs.addObserver(this, 'http-on-modify-request', false);
  },
  shutDown: function () {
    PrefBranch.removeObserver('', this);
    Services.obs.removeObserver(this, 'http-on-examine-response', false);
    Services.obs.removeObserver(this, 'http-on-modify-request', false);
  },
};

function startup(aData, aReason) {
  Utilities = Services.strings.createBundle('chrome://sowatch/locale/global.properties?' + Math.random());
  Preferences.pending();
  RuleExecution.iqiyi();
  Observers.startUp();
}

function shutdown(aData, aReason) {
  Toolbar.removeIcon();
  Observers.shutDown();
}

function install(aData, aReason) {}

function uninstall(aData, aReason) {
  if (aReason == ADDON_UNINSTALL) {
    FileIO.delFolder();
    Preferences.remove();
  }
}
