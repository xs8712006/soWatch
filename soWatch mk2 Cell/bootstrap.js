'use strict';

Components.utils.import('resource:///modules/CustomizableUI.jsm'); //Require Gecko 29 and later
Components.utils.import('resource://gre/modules/osfile.jsm'); //Require Gecko 27 and later
Components.utils.import('resource://gre/modules/Downloads.jsm'); //Require Gecko 26 and later
Components.utils.import('resource://gre/modules/NetUtil.jsm'); //Promise chain that require Gecko 25 and later

var Utilities = {}, SiteLists = {}, PlayerRules = {}, FilterRules = {}, RefererRules = {};

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

var PrefBranch = Services.prefs.getBranch('extensions.sowatchmk2.');
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
  'referer-youku': {
    pref: 'referer.youku.enabled',
    bool: true,
  },
  'referer-iqiyi': {
    pref: 'referer.iqiyi.enabled',
    bool: true,
  },
  'youku': {
    pref: 'rule.youku.defined',
    string: 'player',
  },
  'tudou': {
    pref: 'rule.tudou.defined',
    string: 'player',
  },
  'iqiyi': {
    pref: 'rule.iqiyi.defined',
    string: 'player',
  },
  'letv': {
    pref: 'rule.letv.defined',
    string: 'filter',
  },
  'sohu': {
    pref: 'rule.sohu.defined',
    string: 'filter',
  },
  'pptv': {
    pref: 'rule.pptv.defined',
    string: 'player',
  },
  'qq': {
    pref: 'rule.qq.defined',
    string: 'filter',
  },
  '163': {
    pref: 'rule.163.defined',
    string: 'filter',
  },
  'sina': {
    pref: 'rule.sina.defined',
    string: 'filter',
  },
  'toolbar': {
    pref: 'general.interface.enabled',
    bool: true,
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
      FileIO.path = OS.Path.toFileURI(this.getChar(PrefValue['directory'].pref)) + '/';
      if (this.getInteger(PrefValue['lastdate'].pref) + this.getInteger(PrefValue['period'].pref) * 86400 < Date.now() / 1000) QueryFiles.start('no');
    } else {
      FileIO.path = 'chrome://sowatchmk2/content/';
    }

    this.manifest();
  },
  manifest: function () {
    RuleManager.player();
    RuleManager.filter();
    RuleManager.referer();

    if (this.getBool(PrefValue['referer-youku'].pref)) RuleResolver['youku'].referer('on');
    else RuleResolver['youku'].referer('off');
    if (this.getBool(PrefValue['referer-iqiyi'].pref)) RuleResolver['iqiyi'].referer('on');
    else RuleResolver['iqiyi'].referer('off');

    if ((this.getChar(PrefValue['youku'].pref) == 'filter' && this.getChar(PrefValue['tudou'].pref) == 'none') || (this.getChar(PrefValue['youku'].pref) == 'none' && this.getChar(PrefValue['tudou'].pref) == 'filter')) {
      this.setChar(PrefValue['youku'].pref, 'filter');
      this.setChar(PrefValue['tudou'].pref, 'filter');
    }

    for (var i in RuleResolver) {
      if (this.getChar(PrefValue[i].pref) == 'player') {
        if (i == 'qq' || i == '163' || i == 'sina') continue;
        RuleResolver[i].player('on');
      } else if (this.getChar(PrefValue[i].pref) == 'filter') {
        if (i == 'iqiyi') continue;
        RuleResolver[i].player('off');
        RuleResolver[i].filter('on');
      } else if (this.getChar(PrefValue[i].pref) == 'none') {
        RuleResolver[i].player('off');
        RuleResolver[i].filter('off');
      } else {
        this.setChar(PrefValue[i].pref, PrefValue[i].string);
      }
    }

    if (this.getBool(PrefValue['toolbar'].pref)) Toolbar.addIcon();
    else Toolbar.removeIcon();
  },
  setDefault: function () {
    for (var i in PrefValue) {
      if (i == 'directory' || i == 'server') continue;
      var aValue = PrefValue[i];
      this.setValue(aValue);
    }
  },
  remove: function () {
    Services.prefs.deleteBranch('extensions.sowatchmk2.');
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
        if (aMode == 'no') QueryFiles.check(aLink, aFile, aName, aHash);
        if (aMode == 'yes') QueryFiles.fetch(aLink, aFile, aName, aHash);
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
      if ('remote' in PlayerRules[i]) {
        var aLink = PlayerRules[i]['remote'];
        var aFile = OS.Path.fromFileURI(PlayerRules[i]['object']);
        var aName = OS.Path.split(aFile).components[OS.Path.split(aFile).components.length - 1];
        QueryFiles.hash(aMode, aLink, aFile, aName);
      }
    }
    Preferences.setInteger(PrefValue['lastdate'].pref, PrefValue['lastdate'].integer);  // 下载完成后记录时间以供下次更新时检测
  },
};

// Add toolbar ui for quick management
// 添加工具栏界面以快速管理设置
var Toolbar = {
  css: Services.io.newURI('chrome://sowatchmk2/skin/toolbar.css', null, null),
  addIcon: function () {
    if (this.buttonOn) return;
    CustomizableUI.createWidget({
      id: 'sowatchmk2-button',
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
            label: Utilities.GetStringFromName('updatePlayerLabel'),
            tooltiptext: Utilities.GetStringFromName('updatePlayerDescription'),
          },
          S2: null,
          'checkupdate': {
            label: Utilities.GetStringFromName('checkUpdateLabel'),
            tooltiptext: Utilities.GetStringFromName('checkUpdateDescription'),
          },
          'forceupdate': {
            label: Utilities.GetStringFromName('forceUpdateLabel'),
            tooltiptext: Utilities.GetStringFromName('forceUpdateDescription'),
          },
          S3: null,  // Menu separator
          'referer-youku': {
            label: Utilities.GetStringFromName('youkuRefererLabel'),
            tooltiptext: Utilities.GetStringFromName('youkuRefererDescription'),
          },
          'referer-iqiyi': {
            label: Utilities.GetStringFromName('iqiyiRefererLabel'),
            tooltiptext: Utilities.GetStringFromName('iqiyiRefererDescription'),
          },
        };

        SiteLists = {
          'youku': {
            label: Utilities.GetStringFromName('youkuSiteLabel'),
            tooltiptext: 'http://www.youku.com/',
            target: /http:\/\/static\.youku\.com\/.+player.*\.swf/i,
            url: /https?:\/\/[^\/]+youku\.com\//i,
          },
          'tudou': {
            label: Utilities.GetStringFromName('tudouSiteLabel'),
            tooltiptext: 'http://www.tudou.com/',
            target: /http:\/\/js\.tudouui\.com\/.+player.+\.swf/i,
            url: /https?:\/\/[^\/]+tudou\.com\//i,
          },
          'iqiyi': {
            label: Utilities.GetStringFromName('iqiyiSiteLabel'),
            tooltiptext: 'http://www.iqiyi.com/',
            target: /http:\/\/www\.iqiyi\.com\/.+\/(Main|Share|Enjoy)Player.+\.swf/i,
            url: /https?:\/\/[^\/]+(iqiyi\.com)\//i,
          },
          'letv': {
            label: Utilities.GetStringFromName('letvSiteLabel'),
            tooltiptext: 'http://www.letv.com/',
            target: /http:\/\/player\.letvcdn\.com\/.+player\.swf/i,
            url: /https?:\/\/[^\/]+letv\.com\//i,
          },
          'sohu': {
            label: Utilities.GetStringFromName('sohuSiteLabel'),
            tooltiptext: 'http://tv.sohu.com/',
            target: /http:\/\/tv\.sohu\.com\/.+main\.swf/i,
            url: /https?:\/\/(tv\.sohu|[^\/]+56)\.com\//i,
          },
          'pptv': {
            label: Utilities.GetStringFromName('pptvSiteLabel'),
            tooltiptext: 'http://www.pptv.com/',
            target: /http:\/\/player\.pplive\.cn\/.+(player|live).+\.swf/i,
            url: /https?:\/\/[^\/]+pptv\.com\//i,
          },
          'qq': {
            label: Utilities.GetStringFromName('qqSiteLabel'),
            tooltiptext: 'http://v.qq.com/',
            target: /http:\/\/imgcache\.qq\.com\/.+mediaplugin\.swf/i,
            url: /https?:\/\/v\.qq\.com\//i,
          },
          '163': {
            label: Utilities.GetStringFromName('163SiteLabel'),
            tooltiptext: 'http://v.163.com/',
            target: /http:\/\/v\.163\.com\/.+player.+\.swf/i,
            url: /https?:\/\/v\.163\.com\//i,
          },
          'sina': {
            label: Utilities.GetStringFromName('sinaSiteLabel'),
            tooltiptext: 'http://video.sina.com.cn/',
            target: /http:\/\/[^/]+\.sina\.com\.cn\/.+player.+\.swf/i,
            url: /https?:\/\/video\.+sina\.com\.cn\//i,
          },
        };

        var nLists = {
          'player': {
            label: Utilities.GetStringFromName('rulePlayerLabel'),
            tooltiptext: Utilities.GetStringFromName('rulePlayerDescription'),
          },
          'filter': {
            label: Utilities.GetStringFromName('ruleFilterLabel'),
            tooltiptext: Utilities.GetStringFromName('ruleFilterDescription'),
          },
          'none': {
            label: Utilities.GetStringFromName('ruleNoneLabel'),
            tooltiptext: Utilities.GetStringFromName('ruleNoneDescription'),
          },
        };

        var aMenu = aDocument.createElement('toolbarbutton');
        aMenu.setAttribute('id', 'sowatchmk2-button');
        aMenu.setAttribute('class', 'toolbarbutton-1');
        aMenu.setAttribute('type', 'menu');
        aMenu.setAttribute('label', 'soWatch! mk2');

        var aPopup = aDocument.createElement('menupopup');
        aPopup.setAttribute('id', 'sowatchmk2-popup');
        aPopup.addEventListener('click', this.onClick, false);
        aPopup.addEventListener('popupshowing', this.onPopup, false);
        aMenu.appendChild(aPopup);

        for (var i in aLists) {
          if (i.length < 3) {
            var aSeparator = aDocument.createElement('menuseparator');
            aPopup.appendChild(aSeparator);
          } else {
            var aItem = aDocument.createElement('menuitem');
            aItem.setAttribute('id', 'sowatchmk2-' + i);
            aItem.setAttribute('label', aLists[i].label);
            aItem.setAttribute('tooltiptext', aLists[i].tooltiptext);
            aItem.setAttribute('class', 'menuitem-iconic');
            if (i == 'remote' || i == 'referer-youku' || i == 'referer-iqiyi') aItem.setAttribute('type', 'checkbox');
            aPopup.appendChild(aItem);
          }
        }

        for (var x in SiteLists) {
          var xItem = aDocument.createElement('menu');
          xItem.setAttribute('id', 'sowatchmk2-' + x);
          xItem.setAttribute('label', SiteLists[x].label);
          xItem.setAttribute('tooltiptext', SiteLists[x].tooltiptext);
          xItem.setAttribute('class', 'menu-iconic');
          aPopup.appendChild(xItem);

          var xPopup = aDocument.createElement('menupopup');
          xPopup.setAttribute('id', 'sowatchmk2-popup-' + x);
          xItem.appendChild(xPopup);

          for (var n in nLists) {
            var nItem = aDocument.createElement('menuitem');
            nItem.setAttribute('id', 'sowatchmk2-' + x + '-' + n);
            nItem.setAttribute('label', nLists[n].label);
            nItem.setAttribute('tooltiptext', nLists[n].tooltiptext);
            nItem.setAttribute('type', 'radio');
            nItem.setAttribute('name', x);
            if ((x == 'qq' || x == '163' || x == 'sina') && n == 'player') nItem.setAttribute('disabled', 'true');
            if ((x == 'iqiyi') && n == 'filter') nItem.setAttribute('disabled', 'true');
            xPopup.appendChild(nItem);
          }
        }

        return aMenu;
      },
      onClick: function (aEvent) {
        if (aEvent.target.id == 'sowatchmk2-default') Preferences.setDefault();

        if (aEvent.target.id == 'sowatchmk2-remote') {
          if (Preferences.getBool(PrefValue['remote'].pref)) Preferences.setBool(PrefValue['remote'].pref, false);
          else Preferences.setBool(PrefValue['remote'].pref, true);
        }

        if (aEvent.target.id == 'sowatchmk2-autoupdate') {
          if (Preferences.getBool(PrefValue['autoupdate'].pref)) Preferences.setBool(PrefValue['autoupdate'].pref, false);
          else Preferences.setBool(PrefValue['autoupdate'].pref, true);
        }

        if (aEvent.target.id == 'sowatchmk2-checkupdate') QueryFiles.start('no');

        if (aEvent.target.id == 'sowatchmk2-forceupdate') QueryFiles.start('yes');

        if (aEvent.target.id == 'sowatchmk2-referer-youku') {
          if (Preferences.getBool(PrefValue['referer-youku'].pref)) Preferences.setBool(PrefValue['referer-youku'].pref, false);
          else Preferences.setBool(PrefValue['referer-youku'].pref, true);
        }

        if (aEvent.target.id == 'sowatchmk2-referer-iqiyi') {
          if (Preferences.getBool(PrefValue['referer-iqiyi'].pref)) Preferences.setBool(PrefValue['referer-iqiyi'].pref, false);
          else Preferences.setBool(PrefValue['referer-iqiyi'].pref, true);
        }

        for (var x in SiteLists) {
          if (aEvent.target.id == 'sowatchmk2-' + x + '-player') {
            if (x == 'qq' || x == '163' || x == 'sina') continue;
            Preferences.setChar(PrefValue[x].pref, 'player');
          } else if (aEvent.target.id == 'sowatchmk2-' + x + '-filter') {
            if (x == 'iqiyi') continue;
            Preferences.setChar(PrefValue[x].pref, 'filter');
          } else if (aEvent.target.id == 'sowatchmk2-' + x + '-none') Preferences.setChar(PrefValue[x].pref, 'none');
        }
      },
      onPopup: function (aEvent) {
        if (aEvent.target.id == 'sowatchmk2-popup') {
          if (Preferences.getBool(PrefValue['remote'].pref)) {
            aEvent.target.querySelector('#sowatchmk2-remote').setAttribute('checked', 'true');
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('disabled', 'true');
          } else {
            aEvent.target.querySelector('#sowatchmk2-remote').setAttribute('checked', 'false');
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('disabled', 'false');
          }

          if (Preferences.getBool(PrefValue['autoupdate'].pref)) {
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('checked', 'true');
            aEvent.target.querySelector('#sowatchmk2-checkupdate').setAttribute('disabled', 'false');
            aEvent.target.querySelector('#sowatchmk2-forceupdate').setAttribute('disabled', 'false');
          } else {
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('checked', 'false');
            aEvent.target.querySelector('#sowatchmk2-checkupdate').setAttribute('disabled', 'true');
            aEvent.target.querySelector('#sowatchmk2-forceupdate').setAttribute('disabled', 'true');
          }

          if (Preferences.getBool(PrefValue['referer-youku'].pref)) aEvent.target.querySelector('#sowatchmk2-referer-youku').setAttribute('checked', 'true');
          else aEvent.target.querySelector('#sowatchmk2-referer-youku').setAttribute('checked', 'false');

          if (Preferences.getBool(PrefValue['referer-iqiyi'].pref)) aEvent.target.querySelector('#sowatchmk2-referer-iqiyi').setAttribute('checked', 'true');
          else aEvent.target.querySelector('#sowatchmk2-referer-iqiyi').setAttribute('checked', 'false');
        }

        for (var x in SiteLists) {
          if (aEvent.target.id == 'sowatchmk2-popup') {
            if (!SiteLists[x].url.test(aEvent.target.ownerDocument.defaultView.content.location.href) && !SiteLists[x].popup) {
              aEvent.target.querySelector('#sowatchmk2-' + x).setAttribute('hidden', 'true');
              if (x == 'youku' || x == 'iqiyi') aEvent.target.querySelector('#sowatchmk2-referer-' + x).setAttribute('hidden', 'true');
            } else {
              aEvent.target.querySelector('#sowatchmk2-' + x).setAttribute('hidden', 'false');
              if (x == 'youku' || x == 'iqiyi') aEvent.target.querySelector('#sowatchmk2-referer-' + x).setAttribute('hidden', 'false');
            }
          }
          if (aEvent.target.id == 'sowatchmk2-popup-' + x) {
            if (Preferences.getChar(PrefValue[x].pref) == 'player') aEvent.target.querySelector('#sowatchmk2-' + x + '-player').setAttribute('checked', 'true');
            else if (Preferences.getChar(PrefValue[x].pref) == 'filter') aEvent.target.querySelector('#sowatchmk2-' + x + '-filter').setAttribute('checked', 'true');
            else if (Preferences.getChar(PrefValue[x].pref) == 'none') aEvent.target.querySelector('#sowatchmk2-' + x + '-none').setAttribute('checked', 'true');
          }
        }
      },
    });
    Services.sss.loadAndRegisterSheet(this.css, Services.sss.AUTHOR_SHEET);
    this.buttonOn = true;
  },
  removeIcon: function () {
    if (!this.buttonOn) return;
    Services.sss.unregisterSheet(this.css, Services.sss.AUTHOR_SHEET);
    CustomizableUI.destroyWidget('sowatchmk2-button');
    this.buttonOn = false;
  },
  UserInterface: function (aSubject) {
    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    var aVisitor = new HttpHeaderVisitor();
    httpChannel.visitResponseHeaders(aVisitor);
    if (!aVisitor.isFlash()) return;

    for (var i in SiteLists) {
      if (SiteLists[i] && SiteLists[i].target.test(httpChannel.URI.spec)) SiteLists[i].popup = true;
      else SiteLists[i].popup = false;
    }
  },
};

var RuleManager = {
  player: function () {
    PlayerRules['youku_loader'] = {
      object: FileIO.path + 'loader.swf',
      remote: FileIO.link + 'loader.swf',
      string: /http:\/\/static\.youku\.com\/.*\/v\/swf\/loaders?\.swf/i,
    };
    PlayerRules['youku_player'] = {
      object: FileIO.path + 'player.swf',
      remote: FileIO.link + 'player.swf',
      string: /http:\/\/static\.youku\.com\/.*\/v\/swf\/q?player.*\.swf/i,
    };
    PlayerRules['tudou_portal'] = {
      object: FileIO.path + 'tudou.swf',
      remote: FileIO.link + 'tudou.swf',
      string: /http:\/\/js\.tudouui\.com\/bin\/lingtong\/PortalPlayer.*\.swf/i,
    };
    PlayerRules['tudou_olc'] = {
      object: 'http://js.tudouui.com/bin/player2/olc.swf',
      string: /http:\/\/js\.tudouui\.com\/bin\/player2\/olc.+\.swf/i,
    };
    PlayerRules['tudou_social'] = {
      object: FileIO.path + 'sp.swf',
      remote: FileIO.link + 'sp.swf',
      string: /http:\/\/js\.tudouui\.com\/bin\/lingtong\/SocialPlayer.*\.swf/i,
    };
    PlayerRules['iqiyi5'] = {
      object: FileIO.path + 'iqiyi5.swf',
      remote: FileIO.link + 'iqiyi5.swf',
      string: /http:\/\/www\.iqiyi\.com\/common\/flashplayer\/\d+\/MainPlayer.*\.swf/i,
    };
    PlayerRules['iqiyi_out'] = {
      object: FileIO.path + 'iqiyi_out.swf',
      remote: FileIO.link + 'iqiyi_out.swf',
      string: /https?:\/\/www\.iqiyi\.com\/(common\/flash)?player\/\d+\/(Share|Enjoy)?Player.*\.swf/i,
    };
    PlayerRules['letv'] = {
      object: FileIO.path + 'letv.swf',
      remote: FileIO.link + 'letv.swf',
      string: /http:\/\/.*\.letv(cdn)?\.com\/.*(new)?player\/((SDK)?Letv|swf)Player\.swf/i,
    };
    PlayerRules['letv_skin'] = {
      object: 'http://player.letvcdn.com/p/201407/24/15/newplayer/1/SSLetvPlayer.swf',
      string: /http:\/\/player\.letvcdn\.com\/p\/((?!15)\d+\/){3}newplayer\/1\/S?SLetvPlayer\.swf/i,
    };
    PlayerRules['sohu'] = {
      object: FileIO.path + 'sohu_live.swf',
      remote: FileIO.link + 'sohu_live.swf',
      string: /http:\/\/(tv\.sohu\.com\/upload\/swf\/(p2p\/|56\/)?\d+|(\d+\.){3}\d+\/webplayer)\/Main\.swf/i,
    };
    PlayerRules['pptv'] = {
      object: FileIO.path + 'player4player2.swf',
      remote: FileIO.link + 'player4player2.swf',
      string: /http:\/\/player.pplive.cn\/ikan\/.*\/player4player2\.swf/i,
    };
    PlayerRules['pptv_live'] = {
      object: FileIO.path + 'pptv.in.Live.swf',
      remote: FileIO.server + 'pptv.in.Live.swf',
      string: /http:\/\/player.pplive.cn\/live\/.*\/player4live2\.swf/i,
    };
  },
  filter: function () {
    FilterRules['youku_tudou'] = {
      object: 'http://valf.atm.youku.com/vf',
      string: /http:\/\/val[fcopb]\.atm\.youku\.com\/v[fcopb]/i,
    };
    FilterRules['letv'] = {
      object: 'http://ark.letv.com/s',
      string: /http:\/\/(ark|fz)\.letv\.com\/s\?ark/i,
    };
    FilterRules['sohu'] = {
      object: 'http://v.aty.sohu.com/v',
      string: /http:\/\/v\.aty\.sohu\.com\/v\?/i,
    };
    FilterRules['pptv'] = {
      object: 'http://de.as.pptv.com/ikandelivery/vast/draft',
      string: /http:\/\/de\.as\.pptv\.com\/ikandelivery\/vast\/.+draft/i,
    };
    FilterRules['qq'] = {
      object: 'http://livep.l.qq.com/livemsg',
      string: /http:\/\/livew\.l\.qq\.com\/livemsg\?/i,
    };
    FilterRules['163'] = {
      object: 'http://v.163.com',
      string: /http:\/\/v\.163\.com\/special\/.*\.xml/i,
    };
    FilterRules['sina'] = {
      object: 'http://sax.sina.com.cn/video/newimpress',
      string: /http:\/\/sax\.sina\.com\.cn\/video\/newimpress/i,
    };
  },
  referer: function () {
    RefererRules['referer-youku'] = {
      object: 'http://www.youku.com/',
      string: /http:\/\/.*\.youku\.com/i,
    };
    RefererRules['referer-iqiyi'] = {
      object: 'http://www.iqiyi.com/',
      string: /http:\/\/.*\.qiyi\.com/i,
    };
  },
  toggle: function (aState, aRule) {
    if (aState == 'on') aRule['target'] = aRule['string'];
    if (aState == 'off') aRule['target'] = null;
  },
};
var RuleResolver = {
  'youku': {
    player: function (aState) {
      RuleManager.toggle(aState, PlayerRules['youku_loader']);
      RuleManager.toggle(aState, PlayerRules['youku_player']);
    },
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['youku_tudou']);
    },
    referer: function (aState) {
      RuleManager.toggle(aState, RefererRules['referer-youku']);
    },
  },
  'tudou': {
    player: function (aState) {
      RuleManager.toggle(aState, PlayerRules['tudou_portal']);
      RuleManager.toggle(aState, PlayerRules['tudou_olc']);
      RuleManager.toggle(aState, PlayerRules['tudou_social']);
    },
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['youku_tudou']);
    },
  },
  'iqiyi': {
    player: function (aState) {
      RuleManager.toggle(aState, PlayerRules['iqiyi5']);
      RuleManager.toggle(aState, PlayerRules['iqiyi_out']);
    },
    filter: function (aState) {},
    referer: function (aState) {
      RuleManager.toggle(aState, RefererRules['referer-iqiyi']);
    },
  },
  'letv': {
    player: function (aState) {
      RuleManager.toggle(aState, PlayerRules['letv']);
      RuleManager.toggle(aState, PlayerRules['letv_skin']);
    },
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['letv']);
    },
  },
  'sohu': {
    player: function (aState) {
      RuleManager.toggle(aState, PlayerRules['sohu']);
    },
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['sohu']);
    },
  },
  'pptv': {
    player: function (aState) {
      RuleManager.toggle(aState, PlayerRules['pptv']);
      RuleManager.toggle(aState, PlayerRules['pptv_live']);
    },
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['pptv']);
    },
  },
  'qq': {
    player: function (aState) {},
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['qq']);
    },
  },
  '163': {
    player: function (aState) {},
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['163']);
    },
  },
  'sina': {
    player: function (aState) {},
    filter: function (aState) {
      RuleManager.toggle(aState, FilterRules['sina']);
    },
  },
};

var RuleExecution = {
  getObject: function (remote, rule, callback) {
    if (remote == 'on') var aObject = rule['remote'];
    if (remote == 'off') var aObject = rule['object'];
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
    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    for (var i in RefererRules) {
      var rule = RefererRules[i];
      if (rule['target'] && rule['target'].test(httpChannel.originalURI.spec)) {
        httpChannel.setRequestHeader('Referer', rule['host'], false);
      }
    }
  },
  filter: function (aSubject) {
    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    for (var i in FilterRules) {
      var rule = FilterRules[i];
      if (rule['target'] && rule['target'].test(httpChannel.URI.spec)) {
        if (!rule['storageStream'] || !rule['count']) {
          httpChannel.suspend();
          this.getObject('off', rule, function () {
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
            this.getObject('on', rule, function () {
              httpChannel.resume();
              if (typeof rule['callback'] === 'function') rule['callback'].apply(fn, args);
            });
          } else {
            this.getObject('off', rule, function () {
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
      Toolbar.UserInterface(aSubject);
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
  Utilities = Services.strings.createBundle('chrome://sowatchmk2/locale/global.properties?' + Math.random());
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
