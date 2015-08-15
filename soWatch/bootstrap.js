'use strict';

Components.utils.import('resource:///modules/CustomizableUI.jsm'); // Require Gecko 29 and later
Components.utils.import('resource://gre/modules/osfile.jsm'); // Require Gecko 27 and later
Components.utils.import('resource://gre/modules/Downloads.jsm'); // Require Gecko 26 and later
Components.utils.import('resource://gre/modules/NetUtil.jsm'); // Promise chain that require Gecko 25 and later

var Utilities = {}, PlayerRules = {}, FilterRules = {}, RefererRules = {};

var Services = {
  io: Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),
  obs: Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService),
  pps: Components.classes['@mozilla.org/network/protocol-proxy-service;1'].getService(Components.interfaces.nsIProtocolProxyService),
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

var SiteLists = {
/**  Template sample to add new site
     请参考下面模板添加新的网站  */
  'youku': {
  /**  Multilingual label & tooltiptext must be addded in function, better in CustomizableUI.addwidget()
       多国语言的菜单信息必须添加在function里，最好添加在下面的CustomizableUI.addwidget()中。  */
//  label: 'Youku.com',
//  tooltiptext: 'http://www.youku.com',
    hasPlayer: true,
    hasFilter: true,
    hasReferer: true,
    getPlayer: function () {
      PlayerRules['youku_loader'] = {
        object: FileIO.path + 'loader.swf',
        remote: FileIO.link + 'loader.swf',
        target: /http:\/\/static\.youku\.com\/.*\/v\/swf\/loaders?\.swf/i,
      };
      PlayerRules['youku_player'] = {
        object: FileIO.path + 'player.swf',
        remote: FileIO.link + 'player.swf',
        target: /http:\/\/static\.youku\.com\/.*\/v\/swf\/q?player.*\.swf/i,
      };
    },
    getFilter: function () {
      FilterRules['youku_tudou'] = {
        target: /http:\/\/val[fcopb]\.atm\.youku\.com\//i,
      };
    },
    getReferer: function () {
      RefererRules['referer-youku'] = {
        object: 'http://www.youku.com/',
        target: /http:\/\/.*\.youku\.com/i,
      };
    },
  },
/**  Template End
     模板结束  */
  'tudou': {
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
      PlayerRules['tudou_portal'] = {
        object: FileIO.path + 'tudou.swf',
        remote: FileIO.link + 'tudou.swf',
        target: /http:\/\/js\.tudouui\.com\/bin\/lingtong\/PortalPlayer.*\.swf/i,
      };
      PlayerRules['tudou_olc'] = {
        object: 'http://js.tudouui.com/bin/player2/olc.swf',
        target: /http:\/\/js\.tudouui\.com\/bin\/player2\/olc.+\.swf/i,
      };
      PlayerRules['tudou_social'] = {
        object: FileIO.path + 'sp.swf',
        remote: FileIO.link + 'sp.swf',
        target: /http:\/\/js\.tudouui\.com\/bin\/lingtong\/SocialPlayer.*\.swf/i,
      };
    },
    getFilter: function () {
      FilterRules['youku_tudou'] = {
        target: /http:\/\/val[fcopb]\.atm\.youku\.com\//i,
      };
    },
  },
  'iqiyi': {
    hasPlayer: true,
    hasFilter: false,
    hasReferer: true,
    getPlayer: function () {
      PlayerRules['iqiyi5'] = {
        object: FileIO.path + 'iqiyi5.swf',
        remote: FileIO.link + 'iqiyi5.swf',
        target: /http:\/\/www\.iqiyi\.com\/common\/flashplayer\/\d+\/MainPlayer.*\.swf/i,
      };
      PlayerRules['iqiyi_out'] = {
        object: FileIO.path + 'iqiyi_out.swf',
        remote: FileIO.link + 'iqiyi_out.swf',
        target: /https?:\/\/www\.iqiyi\.com\/(common\/flash)?player\/\d+\/(Share|Enjoy)?Player.*\.swf/i,
      };
    },
    getReferer: function () {
      RefererRules['referer-iqiyi'] = {
        object: 'http://www.iqiyi.com/',
        target: /http:\/\/.*\.qiyi\.com/i,
      };
    },
  },
  'letv': {
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
      PlayerRules['letv'] = {
        object: FileIO.path + 'letv.swf',
        remote: FileIO.link + 'letv.swf',
        target: /http:\/\/.*\.letv(cdn)?\.com\/.*(new)?player\/((SDK)?Letv|swf)Player\.swf/i,
      };
      PlayerRules['letv_skin'] = {
        object: 'http://player.letvcdn.com/p/201407/24/15/newplayer/1/SSLetvPlayer.swf',
        target: /http:\/\/player\.letvcdn\.com\/p\/((?!15)\d+\/){3}newplayer\/1\/S?SLetvPlayer\.swf/i,
      };
    },
    getFilter: function () {
      FilterRules['letv'] = {
        target: /http:\/\/(ark|fz)\.letv\.com\//i,
      };
    },
  },
  'sohu': {
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
      PlayerRules['sohu'] = {
        object: FileIO.path + 'sohu_live.swf',
        remote: FileIO.link + 'sohu_live.swf',
        target: /http:\/\/(tv\.sohu\.com\/upload\/swf\/(p2p\/|56\/)?\d+|(\d+\.){3}\d+\/webplayer)\/Main\.swf/i,
      };
    },
    getFilter: function () {
      FilterRules['sohu'] = {
        target: /http:\/\/v\.aty\.sohu\.com\/v\?/i,
      };
    },
  },
  'pptv': {
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
      PlayerRules['pptv'] = {
        object: FileIO.path + 'player4player2.swf',
        remote: FileIO.link + 'player4player2.swf',
        target: /http:\/\/player.pplive.cn\/ikan\/.*\/player4player2\.swf/i,
      };
      PlayerRules['pptv_live'] = {
        object: FileIO.path + 'pptv.in.Live.swf',
        remote: FileIO.server + 'pptv.in.Live.swf',
        target: /http:\/\/player.pplive.cn\/live\/.*\/player4live2\.swf/i,
      };
    },
    getFilter: function () {
      FilterRules['pptv'] = {
        target: /http:\/\/de\.as\.pptv\.com\/ikandelivery\/vast\/.*draft/i,
      };
    },
  },
  'qq': {
    hasPlayer: false,
    hasFilter: true,
    hasReferer: false,
    getFilter: function () {
      FilterRules['qq'] = {
        target: /http:\/\/livew\.l\.qq\.com\/livemsg\?/i,
      };
    },
  },
  '163': {
    hasPlayer: false,
    hasFilter: true,
    hasReferer: false,
    getFilter: function () {
      FilterRules['163'] = {
        target: /http:\/\/v\.163\.com\/special\/.*\.xml/i,
      };
    },
  },
  'sina': {
    hasPlayer: false,
    hasFilter: true,
    hasReferer: false,
    getFilter: function () {
      FilterRules['sina'] = {
        target: /http:\/\/sax\.sina\.com\.cn\/video\/newimpress/i,
      };
    },
  },
};

var PrefBranch = Services.prefs.getBranch('extensions.sowatch.');
var PrefValue = {
  'autoupdate': {
    name: 'autoupdate.enabled',
    type: 'bool',
    value: false,
  },
  'lastdate': {
    name: 'autoupdate.lastdate',
    type: 'integer',
    value: parseInt(Date.now() / 1000),
  },
  'period': {
    name: 'autoupdate.period',
    type: 'integer',
    value: 7,
  },
  'remote': {
    name: 'remote.access.enabled',
    type: 'bool',
    value: false,
  },
  'override': {
    name: 'remote.override.enabled',
    type: 'bool',
    value: false,
  },
  'directory': {
    name: 'file.directory',
    type: 'string',
    value: OS.Path.join(OS.Constants.Path.profileDir, 'soWatch'),
  },
  'server': {
    name: 'remote.server.defined',
    type: 'string',
    value: '',
  },
  'bitbucket': {
    name: 'remote.server.bitbucket',
    type: 'string',
    value: 'https://bitbucket.org/kafan15536900/haoutil/raw/master/player/testmod/',
  },
  'player': {
    name: 'general.player.enabled',
    type: 'bool',
    value: true,
  },
  'filter': {
    name: 'general.filter.enabled',
    type: 'bool',
    value: true,
  },
  'referer': {
    name: 'general.referer.enabled',
    type: 'bool',
    value: true,
  },
  'toolbar': {
    name: 'general.interface.enabled',
    type: 'bool',
    value: true,
  },
  'firstrun': {
    name: 'general.firstrun.done',
    type: 'bool',
    value: false,
  },
};
var Preferences = {
  getValue: function (aPref) {
    if (aPref.type == 'bool') {
      return PrefBranch.getBoolPref(aPref.name);
    }
    if (aPref.type == 'integer') {
      return PrefBranch.getIntPref(aPref.name);
    }
    if (aPref.type == 'string') {
      return PrefBranch.getComplexValue(aPref.name, Components.interfaces.nsISupportsString).data;
    }
  },
  setValue: function (aPref, aValue) {
    if (aValue == undefined) aValue = aPref.value;
    if (aPref.type == 'bool') {
      PrefBranch.setBoolPref(aPref.name, aValue);
    }
    if (aPref.type == 'integer') {
      PrefBranch.setIntPref(aPref.name, aValue);
    }
    if (aPref.type == 'string') {
      var aChar = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
      aChar.data = aValue;
      PrefBranch.setComplexValue(aPref.name, Components.interfaces.nsISupportsString, aChar);
    }
  },
  pending: function () {
    for (var i in PrefValue) {
      try {
        this.getValue(PrefValue[i]);
      } catch (e) {
        this.setValue(PrefValue[i]);
      }
    }

    this.setValue(PrefValue['bitbucket']);  // 禁止修改bitbucket否则会影响扩展工作

    if (this.getValue(PrefValue['directory'])) FileIO.extDir = this.getValue(PrefValue['directory']);
    FileIO.path = OS.Path.toFileURI(this.getValue(PrefValue['directory'])) + '/';

    if (this.getValue(PrefValue['server'])) {
      FileIO.server = this.getValue(PrefValue['server']);
    } else {
      this.setValue(PrefValue['override'], false);
      FileIO.server = 'https://raw.githubusercontent.com/jc3213/soWatch/master/player/';
    }

    if (this.getValue(PrefValue['override'])) FileIO.link = this.getValue(PrefValue['server']);
    else FileIO.link = this.getValue(PrefValue['bitbucket']);

    if (this.getValue(PrefValue['autoupdate'])) {
      if (this.getValue(PrefValue['lastdate']) + this.getValue(PrefValue['period']) * 86400 < Date.now() / 1000) QueryFiles.start('no');
    }

    if (this.getValue(PrefValue['toolbar'])) Toolbar.addIcon();
    else Toolbar.removeIcon();

    if (!this.getValue(PrefValue['firstrun'])) {
      QueryFiles.start('no');
      this.setValue(PrefValue['firstrun'], true);
    }

    this.manifest();
  },
  manifest: function () {
    for (var i in SiteLists) {
      if (SiteLists[i].hasPlayer) SiteLists[i].getPlayer();
      if (SiteLists[i].hasFilter) SiteLists[i].getFilter();
      if (SiteLists[i].hasReferer) SiteLists[i].getReferer();
    }
  },
  setDefault: function () {
    for (var i in PrefValue) {
      if (i == 'directory' || i == 'server' || i == 'firstrun') continue; // 这里是那些不受“恢复默认”功能限制的参数
      this.setValue(PrefValue[i]);
    }
  },
  remove: function () {
    Services.prefs.deleteBranch('extensions.sowatch.');
  },
};

var QueryFiles = {
  hash: function (aMode, aLink, aFile, aPref, aProbe) {
    if (!aProbe) aProbe = 0;
    if (aProbe <= 3) {
      aProbe = aProbe + 1;
      var aClient = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Components.interfaces.nsIXMLHttpRequest);
      aClient.open('HEAD', aLink, false);
      aClient.onload = function () {
        var aSize = new Number(aClient.getResponseHeader('Content-Length'));
        if (aSize < 5000) aClient.onerror();
        var aHash = aSize.toString(16);
        aLink = aClient.responseURL;
        if (aMode == 'no') QueryFiles.check(aLink, aFile, aPref, aHash);
        if (aMode == 'yes') QueryFiles.fetch(aLink, aFile, aPref, aHash);
      }
      aClient.onerror = function () {
        aClient.abort();
        QueryFiles.hash(aMode, aLink, aFile, aPref, aProbe);
      }
      aClient.send();
    } else return;
  },
  check: function (aLink, aFile, aPref, aHash) {
    try {
      var xHash = Preferences.getValue(aPref);
      if (xHash == aHash) return;
      else QueryFiles.fetch(aLink, aFile, aPref, aHash);
    } catch (e) {
      OS.File.stat(aFile).then(function onSuccess(aData) {
        var xSize = aData.size;
        var xHash = xSize.toString(16);
        if (xHash == aHash) Preferences.setValue(aPref, aHash);
        else QueryFiles.fetch(aLink, aFile, aPref, aHash);
      }, function onFailure(aReason) {
        if (aReason instanceof OS.File.Error && aReason.becauseNoSuchFile) {
          QueryFiles.fetch(aLink, aFile, aPref, aHash);
        }
      });
    }
  },
  fetch: function (aLink, aFile, aPref, aHash, aProbe) {
    if (!aProbe) aProbe = 0;
    if (aProbe <= 3) {
      aProbe = aProbe + 1;
      var aTemp = aFile + '_sw'; // 因为Downloads.jsm并不能直接覆盖原文件所以需要使用临时文件
      Downloads.fetch(aLink, aTemp, {
        isPrivate: true
      }).then(function onSuccess() {
        OS.File.move(aTemp, aFile);
        Preferences.setValue(aPref, aHash);
      }, function onFailure() {
        OS.File.remove(aTemp);
        QueryFiles.fetch(aLink, aFile, aPref, aHash, aProbe);
      });
    } else return;
  },
  start: function (aMode) {
    FileIO.addFolder();
    for (var i in PlayerRules) {
      if ('remote' in PlayerRules[i]) {
        var aLink = PlayerRules[i]['remote'];
        var aFile = OS.Path.fromFileURI(PlayerRules[i]['object']);
        var aPref = {
          name: 'file.hash.' + OS.Path.split(aFile).components[OS.Path.split(aFile).components.length - 1],
          type: 'string',
        };
        QueryFiles.hash(aMode, aLink, aFile, aPref);
      }
    }
    Preferences.setValue(PrefValue['lastdate']); // 下载完成后记录时间以供下次更新时检测
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
          S1: null, // Menu separator
          'remote': {
            label: Utilities.GetStringFromName('remoteAccessLabel'),
            tooltiptext: Utilities.GetStringFromName('remoteAccessDescription'),
          },
          'autoupdate': {
            label: Utilities.GetStringFromName('autoUpdateLabel'),
            tooltiptext: Utilities.GetStringFromName('autoUpdateDescription'),
          },
          S2: null, // Menu separator
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
        aMenu.setAttribute('label', 'soWatch!');

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
          if (Preferences.getValue(PrefValue['remote'])) Preferences.setValue(PrefValue['remote'], false);
          else Preferences.setValue(PrefValue['remote'], true);
        }

        if (aEvent.target.id == 'sowatch-autoupdate') {
          if (Preferences.getValue(PrefValue['autoupdate'])) Preferences.setValue(PrefValue['autoupdate'], false);
          else Preferences.setValue(PrefValue['autoupdate'], true);
        }

        if (aEvent.target.id == 'sowatch-checkupdate') QueryFiles.start('no');

        if (aEvent.target.id == 'sowatch-forceupdate') QueryFiles.start('yes');
      },
      onPopup: function (aEvent) {
        if (aEvent.target.id == 'sowatch-popup') {
          if (Preferences.getValue(PrefValue['remote'])) aEvent.target.querySelector('#sowatch-remote').setAttribute('checked', 'true');
          else aEvent.target.querySelector('#sowatch-remote').setAttribute('checked', 'false');

          if (Preferences.getValue(PrefValue['autoupdate'])) aEvent.target.querySelector('#sowatch-autoupdate').setAttribute('checked', 'true');
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

var RuleExecution = {
  getPlayer: function (remote, rule, callback) {
    if (remote) var aObject = rule['remote'];
    else var aObject = rule['object'];
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
  getFilter: Services.pps.newProxyInfo('http', '127.0.0.1', '50086', 1, 0, null),
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) || aIID.equals(Components.interfaces.nsIObserver)) return this;
    return Components.results.NS_ERROR_NO_INTERFACE;
  },
  referer: function (aSubject) {
    if (!Preferences.getValue(PrefValue['referer'])) return;

    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    for (var i in RefererRules) {
      if (RefererRules[i]['target'] && RefererRules[i]['target'].test(httpChannel.originalURI.spec)) {
        httpChannel.setRequestHeader('Referer', RefererRules[i]['host'], false);
      }
    }
  },
  player: function (aSubject) {
    if (!Preferences.getValue(PrefValue['player'])) return;

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
          var remote = Preferences.getValue(PrefValue['remote']);
          this.getPlayer(remote, rule, function () {
            httpChannel.resume();
            if (typeof rule['callback'] === 'function') rule['callback'].apply(fn, args);
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
  applyFilter: function (aService, aURI, aProxy) {
    for (var i in FilterRules) {
      if (FilterRules[i]['target'] && FilterRules[i]['target'].test(aURI.spec)) {
        if (Preferences.getValue(PrefValue['filter'])) return RuleExecution.getFilter;
      }
    }
    return aProxy;
  },
  observe: function (aSubject, aTopic, aData) {
    if (aTopic == 'nsPref:changed') {
      Preferences.pending();
    }
    if (aTopic == 'http-on-modify-request') {
      RuleExecution.referer(aSubject);
    }
    if (aTopic == 'http-on-examine-response') {
      RuleExecution.player(aSubject);
    }
  },
  startUp: function () {
    PrefBranch.addObserver('', this, false);
    Services.pps.registerFilter(this, 0);
    Services.obs.addObserver(this, 'http-on-examine-response', false);
    Services.obs.addObserver(this, 'http-on-modify-request', false);
  },
  shutDown: function () {
    PrefBranch.removeObserver('', this);
    Services.pps.unregisterFilter(this);
    Services.obs.removeObserver(this, 'http-on-examine-response', false);
    Services.obs.removeObserver(this, 'http-on-modify-request', false);
  },
};

function startup(aData, aReason) {
  Utilities = Services.strings.createBundle('chrome://sowatch/locale/global.properties?' + Math.random());
  Preferences.pending();
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
