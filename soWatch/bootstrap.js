'use strict';

const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;
Cu.import('resource:///modules/CustomizableUI.jsm'); //Require Gecko 29 and later
Cu.import('resource://gre/modules/osfile.jsm'); //Require Gecko 27 and later
Cu.import('resource://gre/modules/Downloads.jsm'); //Require Gecko 26 and later
Cu.import('resource://gre/modules/NetUtil.jsm'); //Promise chain that require Gecko 25 and later

var Utilities = {}, RemoteURLs = {}, PlayerRules = {}, FilterRules = {}, RefererRules = {};

var Services = {
  io: Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService),
  obs: Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService),
  prefs: Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch),
  sss: Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService),
  strings: Cc['@mozilla.org/intl/stringbundle;1'].getService(Ci.nsIStringBundleService),
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
    get: function () {
      return PrefBranch.getBoolPref('autoupdate.enabled');
    },
    set: function (aBool) {
      if (aBool) PrefBranch.setBoolPref('autoupdate.enabled', aBool);
      else PrefBranch.setBoolPref('autoupdate.enabled', false);
    },
  },
  'lastdate': {
    get: function () {
      return PrefBranch.getIntPref('autoupdate.lastdate');
    },
    set: function () {
      PrefBranch.setIntPref('autoupdate.lastdate', Date.now() / 1000);
    },
  },
  'period': {
    get: function () {
      return PrefBranch.getIntPref('autoupdate.period');
    },
    set: function () {
      PrefBranch.setIntPref('autoupdate.period', 7);
    },
  },
  'remote': {
    get: function () {
      return PrefBranch.getBoolPref('remote.access.enabled');
    },
    set: function (aBool) {
      if (aBool) PrefBranch.setBoolPref('remote.access.enabled', aBool);
      else PrefBranch.setBoolPref('remote.access.enabled', false);
    },
  },
  'override': {
    get: function () {
      return PrefBranch.getBoolPref('remote.override.enabled');
    },
    set: function (aBool) {
      if (aBool) PrefBranch.setBoolPref('remote.override.enabled', aBool);
      else PrefBranch.setBoolPref('remote.override.enabled', false);
    },
  },
  'directory': {
    get: function () {
      return PrefBranch.getCharPref('file.directory');
    },
    set: function () {
      PrefBranch.setCharPref('file.directory', OS.Path.join(OS.Constants.Path.profileDir, 'soWatch'));
    },
  },
  'server': {
    get: function () {
      return PrefBranch.getCharPref('remote.server.defined');
    },
    set: function () {
      try {
        if (this.get()) return;
      } catch (e) {}
      PrefBranch.setCharPref('remote.server.defined', '');
    },
  },
  'bitbucket': {
    get: function () {
      return PrefBranch.getCharPref('remote.server.bitbucket');
    },
    set: function () {
      PrefBranch.setCharPref('remote.server.bitbucket', 'https://bitbucket.org/kafan15536900/haoutil/src/master/player/testmod/');
    },
  },
  'player': {
    get: function () {
      return PrefBranch.getBoolPref('general.player.enabled');
    },
    set: function () {
      PrefBranch.setBoolPref('general.player.enabled', true);
    },
  },
  'filter': {
    get: function () {
      return PrefBranch.getBoolPref('general.filter.enabled');
    },
    set: function () {
      PrefBranch.setBoolPref('general.filter.enabled', true);
    },
  },
  'referer': {
    get: function () {
      return PrefBranch.getBoolPref('general.referer.enabled');
    },
    set: function () {
      PrefBranch.setBoolPref('general.referer.enabled', true);
    },
  },
  'toolbar': {
    get: function () {
      return PrefBranch.getBoolPref('general.interface.enabled');
    },
    set: function () {
      PrefBranch.setBoolPref('general.interface.enabled', true);
    },
  },
  'firstrun': {
    get: function () {
      return PrefBranch.getBoolPref('general.firstrun.done');
    },
    set: function (aBool) {
      if (aBool) PrefBranch.setBoolPref('general.firstrun.done', aBool);
      else PrefBranch.setBoolPref('general.firstrun.done', false);
    },
  },
};
var Preferences = {
  remove: function () {
    Services.prefs.deleteBranch('extensions.sowatch.');
  },
  setDefault: function () {
    for (var i in PrefValue) {
      PrefValue[i].set();
    }
  },
  pending: function () {
    for (var i in PrefValue) {
      try {
        PrefValue[i].get();
      } catch (e) {
        PrefValue[i].set();
      }
    }
    this.manifest();
    this.resolver();
  },
  manifest: function () {
    PrefValue['bitbucket'].set();  // 禁止修改bitbucket否则会影响扩展工作

    if (PrefValue['remote'].get() == true) PrefValue['autoupdate'].set(false);

    if (PrefValue['directory'].get()) FileIO.extDir = PrefValue['directory'].get();

    if (PrefValue['server'].get()) {
      FileIO.server = PrefValue['server'].get();
    } else {
      PrefValue['override'].set(false);
      FileIO.server = 'https://github.com/jc3213/soWatch/raw/master/player/';
    }

    if (PrefValue['override'].get()) FileIO.link = PrefValue['server'].get();
    else FileIO.link = PrefValue['bitbucket'].get()

    FileIO.path = OS.Path.toFileURI(PrefValue['directory'].get()) + '/';

    if (PrefValue['autoupdate'].get()) {
      if (PrefValue['lastdate'].get() + PrefValue['period'].get() * 86400 < Date.now() / 1000) QueryFiles.start(0);
    }

    if (!PrefValue['firstrun'].get()) {
      QueryFiles.start(0);
      PrefValue['firstrun'].set(true);
    }
  },
  resolver: function () {
    QueryFiles.loopCast();

    for (var i in RuleResolver) {
      if (RuleResolver[i].playerOn) RuleResolver[i].playerOn();
      if (RuleResolver[i].filterOn) RuleResolver[i].filterOn();
      if (RuleResolver[i].refererOn) RuleResolver[i].refererOn();
    }

    if (PrefValue['toolbar'].get()) Toolbar.addIcon();
    else Toolbar.removeIcon();
  },
};

var QueryFiles = {
  loopCast: function () {
    RemoteURLs = {
      'youku_loader': {
        'object': FileIO.link + 'loader.swf',
      },
      'youku_player': {
        'object': FileIO.link + 'player.swf',
      },
      'tudou_portal': {
        'object': FileIO.link + 'tudou.swf',
      },
      'tudou_social': {
        'object': FileIO.link + 'sp.swf',
      },
      'iqiyi5': {
        'object': FileIO.link + 'iqiyi5.swf',
      },
      'iqiyi_out': {
        'object': FileIO.link + 'iqiyi_out.swf',
      },
      'letv': {
        'object': FileIO.link + 'letv.swf',
      },
      'sohu': {
        'object': FileIO.link + 'sohu_live.swf',
      },
      'pptv': {
        'object': FileIO.link + 'player4player2.swf',
      },
      'pptv_live': {
        'object': FileIO.server + 'pptv.in.Live.swf',
      },
    };
  },
  hash: function (aMode, aLink, aFile, aName) {
    var aClient = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Ci.nsIXMLHttpRequest);
    aClient.open('HEAD', aLink, false);
    aClient.onload = function () {
      var aSize = new Number(aClient.getResponseHeader('Content-Length'));
      if (aSize < 5000) return;
      var aHash = aSize.toString(16);
      if (aMode == 0) QueryFiles.check(aLink, aFile, aName, aHash);
      if (aMode == 1) QueryFiles.fetch(aLink, aFile, aName, aHash);
    }
    aClient.send();
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
  fetch: function (aLink, aFile, aName, aHash) {
    var aTemp = aFile + '_sw';  // 因为Downloads.jsm并不能直接覆盖原文件所以需要使用临时文件
    Downloads.fetch(aLink, aTemp, {
      isPrivate: true
    }).then(function onSuccess() {
      OS.File.move(aTemp, aFile);
      PrefBranch.setCharPref('file.hash.' + aName, aHash);
    }, function onFailure() {
      OS.File.remove(aTemp);
    });
  },
  start: function (aMode) {
    FileIO.addFolder();
    for (var i in RemoteURLs) {
      if (PlayerRules[i]) {
        var aLink = RemoteURLs[i]['object'];
        var aFile = OS.Path.fromFileURI(PlayerRules[i]['object']);
        var aName = OS.Path.split(aFile).components[OS.Path.split(aFile).components.length - 1];
        QueryFiles.hash(aMode, aLink, aFile, aName);
      }
    }
    PrefValue['lastdate'].set();  // 下载完成后记录时间以供下次更新时检测
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
          if (PrefValue['remote'].get()) PrefValue['remote'].set(false);
          else PrefValue['remote'].set(true);
        }

        if (aEvent.target.id == 'sowatch-autoupdate') {
          if (PrefValue['autoupdate'].get()) PrefValue['autoupdate'].set(false);
          else PrefValue['autoupdate'].set(true);
        }

        if (aEvent.target.id == 'sowatch-checkupdate') {
          if (PrefValue['remote'].get()) return;
          QueryFiles.start(0);
        }

        if (aEvent.target.id == 'sowatch-forceupdate') {
          if (PrefValue['remote'].get()) return;
          QueryFiles.start(1);
        }
      },
      onPopup: function (aEvent) {
        if (aEvent.target.id == 'sowatch-popup') {
          if (PrefValue['remote'].get()) {
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

          if (PrefValue['autoupdate'].get()) aEvent.target.querySelector('#sowatch-autoupdate').setAttribute('checked', 'true');
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

var RuleResolver = {
  'youku': {
    playerOn: function () {
      PlayerRules['youku_loader'] = {
        'object': FileIO.path + 'loader.swf',
        'target': /http:\/\/static\.youku\.com\/.*\/v\/swf\/loaders?\.swf/i,
      };
      PlayerRules['youku_player'] = {
        'object': FileIO.path + 'player.swf',
        'target': /http:\/\/static\.youku\.com\/.*\/v\/swf\/q?player.*\.swf/i,
      };
    },
    playerOff: function () {
      PlayerRules['youku_loader'] = null;
      PlayerRules['youku_player'] = null;
    },
    filterOn: function () {
      FilterRules['youku_tudou'] = {
        'object': 'http://valf.atm.youku.com/vf',
        'target': /http:\/\/val[fcopb]\.atm\.youku\.com\/v[fcopb]/i,
      };
    },
    filterOff: function () {
      FilterRules['youku_tudou'] = null;
    },
    refererOn: function () {
      RefererRules['youku'] = {
        'object': 'http://www.youku.com/',
        'target': /http:\/\/.*\.youku\.com/i,
      };
    },
    refererOff: function () {
      RefererRules['youku'] = null;
    },
  },
  'tudou': {
    playerOn: function () {
      PlayerRules['tudou_portal'] = {
        'object': FileIO.path + 'tudou.swf',
        'target': /http:\/\/js\.tudouui\.com\/bin\/lingtong\/PortalPlayer.*\.swf/i,
      };
      FilterRules['tudou_css'] = {
        'object': 'https://raw.githubusercontent.com/jc3213/soWatch/master/misc/tudou_play_88.css',
        'target': /http:\/\/css\.tudouui\.com\/v3\/dist\/css\/play\/play.+\.css/i,
      };
      PlayerRules['tudou_olc'] = {
        'object': 'http://js.tudouui.com/bin/player2/olc.swf',
        'target': /http:\/\/js\.tudouui\.com\/bin\/player2\/olc.+\.swf/i,
      };
      PlayerRules['tudou_social'] = {
        'object': FileIO.path + 'sp.swf',
        'target': /http:\/\/js\.tudouui\.com\/bin\/lingtong\/SocialPlayer.*\.swf/i,
      };
    },
    playerOff: function () {
      PlayerRules['tudou_portal'] = null;
      FilterRules['tudou_css'] = null;
      PlayerRules['tudou_olc'] = null;
      PlayerRules['tudou_social'] = null;
    },
    filterOn: function () {
      FilterRules['youku_tudou'] = {
        'object': 'http://valf.atm.youku.com/vf',
        'target': /http:\/\/val[fcopb]\.atm\.youku\.com\/v[fcopb]/i,
      };
    },
    filterOff: function () {
      FilterRules['youku_tudou'] = null;
    },
  },
  'iqiyi': {
    playerOn: function () {
      PlayerRules['iqiyi5'] = {
        'object': FileIO.path + 'iqiyi5.swf',
        'target': /http:\/\/www\.iqiyi\.com\/common\/flashplayer\/\d+\/MainPlayer.*\.swf/i,
      };
      PlayerRules['iqiyi_out'] = {
        'object': FileIO.path + 'iqiyi_out.swf',
        'target': /https?:\/\/www\.iqiyi\.com\/(common\/flash)?player\/\d+\/(Share|Enjoy)?Player.*\.swf/i,
      };
    },
    playerOff: function () {
      PlayerRules['iqiyi5'] = null;
      PlayerRules['iqiyi_out'] = null;
    },
    filterOn: function () {},
    filterOff: function () {},
    refererOn: function () {
      RefererRules['iqiyi'] = {
        'object': 'http://www.iqiyi.com/',
        'target': /http:\/\/.*\.qiyi\.com/i,
      };
    },
    refererOff: function () {
      RefererRules['iqiyi'] = null;
    },
  },
  'letv': {
    playerOn: function () {
      PlayerRules['letv'] = {
        'object': FileIO.path + 'letv.swf',
        'target': /http:\/\/.*\.letv(cdn)?\.com\/.*(new)?player\/((SDK)?Letv|swf)Player\.swf/i,
      };
      PlayerRules['letv_skin'] = {
        'object': 'http://player.letvcdn.com/p/201407/24/15/newplayer/1/SSLetvPlayer.swf',
        'target': /http:\/\/player\.letvcdn\.com\/p\/((?!15)\d+\/){3}newplayer\/1\/S?SLetvPlayer\.swf/i,
      };
    },
    playerOff: function () {
      PlayerRules['letv'] = null;
      PlayerRules['letv_skin'] = null;
    },
    filterOn: function () {
      FilterRules['letv'] = {
        'object': 'http://ark.letv.com/s',
        'target': /http:\/\/(ark|fz)\.letv\.com\/s\?ark/i,
      };
    },
    filterOff: function () {
      FilterRules['letv'] = null;
    },
  },
  'sohu': {
    playerOn: function () {
      PlayerRules['sohu'] = {
        'object': FileIO.path + 'sohu_live.swf',
        'target': /http:\/\/(tv\.sohu\.com\/upload\/swf\/(p2p\/|56\/)?\d+|(\d+\.){3}\d+\/webplayer)\/Main\.swf/i,
      };
    },
    playerOff: function () {
      PlayerRules['sohu'] = null;
    },
    filterOn: function () {
      FilterRules['sohu'] = {
        'object': 'http://v.aty.sohu.com/v',
        'target': /http:\/\/v\.aty\.sohu\.com\/v\?/i,
      };
    },
    filterOff: function () {
      FilterRules['sohu'] = null;
    },
  },
  'pptv': {
    playerOn: function () {
      PlayerRules['pptv'] = {
        'object': FileIO.path + 'player4player2.swf',
        'target': /http:\/\/player.pplive.cn\/ikan\/.*\/player4player2\.swf/i,
      };
      PlayerRules['pptv_live'] = {
        'object': FileIO.path + 'pptv.in.Live.swf',
        'target': /http:\/\/player.pplive.cn\/live\/.*\/player4live2\.swf/i,
      };
    },
    playerOff: function () {
      PlayerRules['pptv'] = null;
      PlayerRules['pptv_live'] = null;
    },
    filterOn: function () {
      FilterRules['pptv'] = {
        'object': 'http://de.as.pptv.com/ikandelivery/vast/draft',
        'target': /http:\/\/de\.as\.pptv\.com\/ikandelivery\/vast\/.+draft/i,
      };
    },
    filterOff: function () {
      FilterRules['pptv'] = null;
    },
  },
  'qq': {
    playerOn: function () {},
    playerOff: function () {},
    filterOn: function () {
      FilterRules['qq'] = {
        'object': 'http://livep.l.qq.com/livemsg',
        'target': /http:\/\/livew\.l\.qq\.com\/livemsg\?/i,
      };
    },
    filterOff: function () {
      FilterRules['qq'] = null;
    },
  },
  '163': {
    playerOn: function () {},
    playerOff: function () {},
    filterOn: function () {
      FilterRules['163'] = {
        'object': 'http://v.163.com',
        'target': /http:\/\/v\.163\.com\/special\/.*\.xml/i,
      };
    },
    filterOff: function () {
      FilterRules['163'] = null;
    },
  },
  'sina': {
    playerOn: function () {},
    playerOff: function () {},
    filterOn: function () {
      FilterRules['sina'] = {
        'object': 'http://sax.sina.com.cn/video/newimpress',
        'target': /http:\/\/sax\.sina\.com\.cn\/video\/newimpress/i,
      };
    },
    filterOff: function () {
      FilterRules['sina'] = null;
    },
  },
};

var RuleExecution = {
  getObject: function (rule, callback) {
    var aObject = rule['object'];
    NetUtil.asyncFetch(aObject, function (inputStream, status) {
      var binaryOutputStream = Cc['@mozilla.org/binaryoutputstream;1'].createInstance(Ci['nsIBinaryOutputStream']);
      var storageStream = Cc['@mozilla.org/storagestream;1'].createInstance(Ci['nsIStorageStream']);
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
    if (aIID.equals(Ci.nsISupports) || aIID.equals(Ci.nsIObserver)) return this;
    return Cr.NS_ERROR_NO_INTERFACE;
  },
  referer: function (aSubject) {
    if (!PrefValue['referer'].get()) return;

    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);

    for (var i in RefererRules) {
      var rule = RefererRules[i];
      if (rule && rule['target'].test(httpChannel.originalURI.spec)) {
        httpChannel.setRequestHeader('Referer', rule['host'], false);
      }
    }
  },
  filter: function (aSubject) {
    if (!PrefValue['filter'].get()) return;

    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);

    for (var i in FilterRules) {
      var rule = FilterRules[i];
      if (rule && rule['target'].test(httpChannel.URI.spec)) {
        if (!rule['storageStream'] || !rule['count']) {
          httpChannel.suspend();
          this.getObject(rule, function () {
            httpChannel.resume();
          });
        }
        var newListener = new TrackingListener();
        aSubject.QueryInterface(Ci.nsITraceableChannel);
        newListener.originalListener = aSubject.setNewListener(newListener);
        newListener.rule = rule;
        break;
      }
    }
  },
  player: function (aSubject) {
    if (!PrefValue['player'].get()) return;

    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);

    var aVisitor = new HttpHeaderVisitor();
    httpChannel.visitResponseHeaders(aVisitor);
    if (!aVisitor.isFlash()) return;

    for (var i in PlayerRules) {
      var rule = PlayerRules[i];
      if (rule && rule['target'].test(httpChannel.URI.spec)) {
        var fn = this, args = Array.prototype.slice.call(arguments);
        if (typeof rule['preHandle'] === 'function') rule['preHandle'].apply(fn, args);
        if (!rule['storageStream'] || !rule['count']) {
          httpChannel.suspend();
          if (PrefValue['remote'].get()) rule = RemoteURLs[i];
          else rule = PlayerRules[i];
          this.getObject(rule, function () {
            httpChannel.resume();
            if (typeof rule['callback'] === 'function') rule['callback'].apply(fn, args);
          });
        }
        var newListener = new TrackingListener();
        aSubject.QueryInterface(Ci.nsITraceableChannel);
        newListener.originalListener = aSubject.setNewListener(newListener);
        newListener.rule = rule;
        break;
      }
    }
  },
  getWindowForRequest: function (aRequest) {
    if (aRequest instanceof Ci.nsIRequest) {
      try {
        if (aRequest.notificationCallbacks) {
          return aRequest.notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;
        }
      } catch (e) {}
      try {
        if (aRequest.loadGroup && aRequest.loadGroup.notificationCallbacks) {
          return aRequest.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;
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
    this.originalListener.onStopRequest(aRequest, aContext, Cr.NS_OK);
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
  RuleExecution.iqiyi();
  Preferences.pending();
  Observers.startUp();
}

function shutdown(aData, aReason) {
  Toolbar.removeIcon();
  Observers.shutDown();
}

function install(aData, aReason) {
//Remove useless files after update.
//升级后删除无用的文件。
/*
  if (aReason == ADDON_UPGRADE) {
    OS.File.remove(OS.Path.join(FileIO.extDir(), '56.in.NM.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), '56.in.TM.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), 'sohu.inyy.Lite.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), 'sohu.injs.Lite.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), 'sohu.inbj.Live.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), 'sohu.inyy+injs.Lite.s1.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), '17173.in.Vod.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), '17173.out.Vod.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), '17173.in.Live.swf'));
    OS.File.remove(OS.Path.join(FileIO.extDir(), '17173.out.Live.swf'));
  }
*/
}

function uninstall(aData, aReason) {
  if (aReason == ADDON_UNINSTALL) {
    FileIO.delFolder();
    Preferences.remove();
  }
}
