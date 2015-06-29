'use strict';

const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;
Cu.import("resource:///modules/CustomizableUI.jsm"); //Require Gecko 29 and later
Cu.import('resource://gre/modules/osfile.jsm'); //Require Gecko 27 and later
Cu.import('resource://gre/modules/Downloads.jsm'); //Require Gecko 26 and later
Cu.import('resource://gre/modules/NetUtil.jsm'); //Promise chain that require Gecko 25 and later

var Utilities = {}, RemoteURLs = {}, SiteLists = {},PlayerRules = {}, FilterRules = {}, RefererRules = {};

var Services = {
  io: Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService),
  obs: Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService),
  prefs: Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch),
  sss: Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService),
  strings: Cc['@mozilla.org/intl/stringbundle;1'].getService(Ci.nsIStringBundleService),
};

var aURI = 'chrome://sowatchmk2/content/';  //文件存放在content/soWatch文件夹中
var aURL = aURI; //用户可以自己指定远程服务器的链接
var aORG = 'https://bitbucket.org/kafan15536900/haoutil/src/master/player/testmod/'; // bitbucket链接

var PrefBranch = Services.prefs.getBranch('extensions.sowatchmk2.');
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
  'chrome': {
    get: function () {
      return PrefBranch.getCharPref('file.chrome');
    },
    set: function () {
      PrefBranch.setCharPref('file.chrome', 'chrome://sowatchmk2/content/');
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
  'youku_referer': {
    get: function () {
      return PrefBranch.getBoolPref('referer.youku.enabled');
    },
    set: function (aBool) {
      if (aBool == false) PrefBranch.setBoolPref('referer.youku.enabled', aBool);
      else PrefBranch.setBoolPref('referer.youku.enabled', true);
    },
  },
  'iqiyi_referer': {
    get: function () {
      return PrefBranch.getBoolPref('referer.iqiyi.enabled');
    },
    set: function (aBool) {
      if (aBool == false) PrefBranch.setBoolPref('referer.iqiyi.enabled', aBool);
      else PrefBranch.setBoolPref('referer.iqiyi.enabled', true);
    },
  },
  'youku': {
    get: function () {
      return PrefBranch.getCharPref('rule.youku.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.youku.defined', aChar);
      else PrefBranch.setCharPref('rule.youku.defined', 'player');
    },
  },
  'tudou': {
    get: function () {
      return PrefBranch.getCharPref('rule.tudou.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.tudou.defined', aChar);
      else PrefBranch.setCharPref('rule.tudou.defined', 'player');
    },
  },
  'iqiyi': {
    get: function () {
      return PrefBranch.getCharPref('rule.iqiyi.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.iqiyi.defined', aChar);
      else PrefBranch.setCharPref('rule.iqiyi.defined', 'player');
    },
  },
  'letv': {
    get: function () {
      return PrefBranch.getCharPref('rule.letv.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.letv.defined', aChar);
      else PrefBranch.setCharPref('rule.letv.defined', 'filter');
    },
  },
  'sohu': {
    get: function () {
      return PrefBranch.getCharPref('rule.sohu.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.sohu.defined', aChar);
      else PrefBranch.setCharPref('rule.sohu.defined', 'filter');
    },
  },
  'pptv': {
    get: function () {
      return PrefBranch.getCharPref('rule.pptv.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.pptv.defined', aChar);
      else PrefBranch.setCharPref('rule.pptv.defined', 'player');
    },
  },
  'qq': {
    get: function () {
      return PrefBranch.getCharPref('rule.qq.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.qq.defined', aChar);
      else PrefBranch.setCharPref('rule.qq.defined', 'filter');
    },
  },
  '163': {
    get: function () {
      return PrefBranch.getCharPref('rule.163.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.163.defined', aChar);
      else PrefBranch.setCharPref('rule.163.defined', 'filter');
    },
  },
  'sina': {
    get: function () {
      return PrefBranch.getCharPref('rule.sina.defined');
    },
    set: function (aChar) {
      if (aChar) PrefBranch.setCharPref('rule.sina.defined', aChar);
      else PrefBranch.setCharPref('rule.sina.defined', 'filter');
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
};
var Preferences = {
// 移除参数设置
  remove: function () {
    Services.prefs.deleteBranch('extensions.sowatchmk2.');
  },
// 恢复默认设置(暂时未添加)
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
    PrefValue['chrome'].set();  // 禁止修改chrome否则会影响扩展工作
    PrefValue['bitbucket'].set(); // 禁止修改bitbucket否则会影响扩展工作

    if (PrefValue['remote'].get()) PrefValue['autoupdate'].set(false);

    if (PrefValue['chrome'].get()) FileIO.chrome = PrefValue['chrome'].get();

    if (PrefValue['directory'].get()) FileIO.extDir = PrefValue['directory'].get();

    if (PrefValue['server'].get()) {
      FileIO.server = PrefValue['server'].get();
    } else {
      PrefValue['override'].set(false);
      FileIO.server = 'https://github.com/jc3213/soWatch/raw/master/player/';
    }

    if (PrefValue['override'].get()) FileIO.link = PrefValue['server'].get();
    else FileIO.link = PrefValue['bitbucket'].get()

    if (PrefValue['autoupdate'].get()) {
      FileIO.path = OS.Path.toFileURI(PrefValue['directory'].get()) + '/';
      if (PrefValue['lastdate'].get() + PrefValue['period'].get() * 86400 < Date.now() / 1000) QueryFiles.start(0);
    } else {
      FileIO.path = PrefValue['chrome'].get();
    }
  },
  resolver: function () {
    QueryFiles.loopCast();

    if (PrefValue['youku_referer'].get()) RuleResolver['youku'].refererOn();
    else RuleResolver['youku'].refererOff();
    if (PrefValue['iqiyi_referer'].get()) RuleResolver['iqiyi'].refererOn();
    else RuleResolver['iqiyi'].refererOff();

    if ((PrefValue['youku'].get() == 'filter' && PrefValue['tudou'].get() == 'none') || (PrefValue['youku'].get() == 'none' && PrefValue['tudou'].get() == 'filter')) {
      PrefValue['youku'].set('filter');
      PrefValue['tudou'].set('filter');
    }

    for (var i in RuleResolver) {
      if (PrefValue[i].get() == 'player') {
        if (i == 'qq' || i == '163' || i == 'sina') continue;
        RuleResolver[i].playerOn();
      } else if (PrefValue[i].get() == 'filter') {
        if (i == 'iqiyi') continue;
        RuleResolver[i].playerOff();
        RuleResolver[i].filterOn();
      } else if (PrefValue[i].get() == 'none'){
        RuleResolver[i].playerOff();
        RuleResolver[i].filterOff();
      } else {
        PrefValue[i].set();
      }
    }

    if (PrefValue['toolbar'].get()) Toolbar.addIcon();
    else Toolbar.removeIcon();
  },
};

var FileIO = {
  addFolder: function () {
    OS.File.makeDir(this.extDir);
  },
  delFolder: function () {
    OS.File.removeDir(this.extDir);
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
    aClient.open('HEAD', aLink, true);
    aClient.timeout = 30000;
    aClient.send();
    aClient.onload = function () {
      var aSize = new Number(aClient.getResponseHeader('Content-Length'));
      if (aSize < 5000) return;
      var aHash = aSize.toString(16);
      if (aMode == 0) QueryFiles.check(aLink, aFile, aName, aHash);
      if (aMode == 1) QueryFiles.fetch(aLink, aFile, aName, aHash);
    }
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

// Add toolbar ui for quick management
// 添加工具栏界面以快速管理设置
var Toolbar = {
  css: Services.io.newURI('chrome://sowatchmk2/skin/toolbar.css', null, null),
  addIcon: function () {
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
          'youku_referer': {
            label: Utilities.GetStringFromName('youkuRefererLabel'),
            tooltiptext: Utilities.GetStringFromName('youkuRefererDescription'),
          },
          'iqiyi_referer': {
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
        aMenu.setAttribute('tooltiptext', Utilities.GetStringFromName('extTooltip'));

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
            if (i == 'remote' || i == 'youku_referer' || i == 'iqiyi_referer') aItem.setAttribute('type', 'checkbox');
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
          if (PrefValue['remote'].get()) PrefValue['remote'].set(false);
          else PrefValue['remote'].set(true);
        }

        if (aEvent.target.id == 'sowatchmk2-autoupdate') {
          if (PrefValue['autoupdate'].get()) PrefValue['autoupdate'].set(false);
          else PrefValue['autoupdate'].set(true);
        }

        if (aEvent.target.id == 'sowatchmk2-checkupdate') {
          if (PrefValue['remote'].get()) return;
          QueryFiles.start(0);
        }

        if (aEvent.target.id == 'sowatchmk2-forceupdate') {
          if (PrefValue['remote'].get()) return;
          QueryFiles.start(1);
        }

        for (var x in SiteLists) {
          if (aEvent.target.id == 'sowatchmk2-' + x + '-player') {
            if (x == 'qq' || x == '163' || x == 'sina') return;
            PrefValue[x].set('player');
          } else if (aEvent.target.id == 'sowatchmk2-' + x + '-filter') {
            if (x == 'iqiyi') return;
            PrefValue[x].set('filter');
          } else if (aEvent.target.id == 'sowatchmk2-' + x + '-none') PrefValue[x].set('none');
        }
      },
      onPopup: function (aEvent) {
        if (aEvent.target.id == 'sowatchmk2-popup') {
          if (PrefValue['remote'].get()) {
            aEvent.target.querySelector('#sowatchmk2-remote').setAttribute('checked', 'true');
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('disabled', 'true');
          } else {
            aEvent.target.querySelector('#sowatchmk2-remote').setAttribute('checked', 'false');
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('disabled', 'false');
          }

          if (PrefValue['autoupdate'].get()) {
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('checked', 'true');
            aEvent.target.querySelector('#sowatchmk2-checkupdate').setAttribute('disabled', 'false');
            aEvent.target.querySelector('#sowatchmk2-forceupdate').setAttribute('disabled', 'false');
          } else {
            aEvent.target.querySelector('#sowatchmk2-autoupdate').setAttribute('checked', 'false');
            aEvent.target.querySelector('#sowatchmk2-checkupdate').setAttribute('disabled', 'true');
            aEvent.target.querySelector('#sowatchmk2-forceupdate').setAttribute('disabled', 'true');
          }

          if (PrefValue['youku_referer'].get()) aEvent.target.querySelector('#sowatchmk2-youku_referer').setAttribute('checked', 'true');
          else aEvent.target.querySelector('#sowatchmk2-youku_referer').setAttribute('checked', 'false');

          if (PrefValue['iqiyi_referer'].get()) aEvent.target.querySelector('#sowatchmk2-iqiyi_referer').setAttribute('checked', 'true');
          else aEvent.target.querySelector('#sowatchmk2-iqiyi_referer').setAttribute('checked', 'false');
        }

        for (var x in SiteLists) {
          if (aEvent.target.id == 'sowatchmk2-popup') {
            if (!SiteLists[x].url.test(aEvent.target.ownerDocument.defaultView.content.location.href) && !SiteLists[x].popup) {
              aEvent.target.querySelector('#sowatchmk2-' + x).setAttribute('hidden', 'true');
              if (x == 'youku') aEvent.target.querySelector('#sowatchmk2-youku_referer').setAttribute('hidden', 'true');
              if (x == 'iqiyi') aEvent.target.querySelector('#sowatchmk2-iqiyi_referer').setAttribute('hidden', 'true');
            } else {
              aEvent.target.querySelector('#sowatchmk2-' + x).setAttribute('hidden', 'false');
              if (x == 'youku') aEvent.target.querySelector('#sowatchmk2-youku_referer').setAttribute('hidden', 'false');
              if (x == 'iqiyi') aEvent.target.querySelector('#sowatchmk2-iqiyi_referer').setAttribute('hidden', 'false');
            }
          }
          if (aEvent.target.id == 'sowatchmk2-popup-' + x) {
            if (PrefValue[x].get() == 'player') aEvent.target.querySelector('#sowatchmk2-' + x + '-player').setAttribute('checked', 'true');
            else if (PrefValue[x].get() == 'filter') aEvent.target.querySelector('#sowatchmk2-' + x + '-filter').setAttribute('checked', 'true');
            else if (PrefValue[x].get() == 'none') aEvent.target.querySelector('#sowatchmk2-' + x + '-none').setAttribute('checked', 'true');
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
    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);

    var aVisitor = new HttpHeaderVisitor();
    httpChannel.visitResponseHeaders(aVisitor);
    if (!aVisitor.isFlash()) return;

    for (var i in SiteLists) {
      if (SiteLists[i] && SiteLists[i].target.test(httpChannel.URI.spec)) SiteLists[i].popup = true;
      else SiteLists[i].popup = false;
    }
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
    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
    for (var i in RefererRules) {
      var rule = RefererRules[i];
      if (rule && rule['target'].test(httpChannel.originalURI.spec)) {
        httpChannel.setRequestHeader('Referer', rule['host'], false);
      }
    }
  },
  filter: function (aSubject) {
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
  onStartRequest: function (request, context) {
    this.originalListener.onStartRequest(request, context);
  },
  onStopRequest: function (request, context) {
    this.originalListener.onStopRequest(request, context, Cr.NS_OK);
  },
  onDataAvailable: function (request, context) {
    this.originalListener.onDataAvailable(request, context, this.rule['storageStream'].newInputStream(0), 0, this.rule['count']);
  }
}

//判断是否是SWF文件，总感觉意义不太大
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
  RuleExecution.iqiyi();
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
