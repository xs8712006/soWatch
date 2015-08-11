'use strict';

Components.utils.import('resource:///modules/CustomizableUI.jsm'); // Require Gecko 29 and later
Components.utils.import('resource://gre/modules/osfile.jsm'); // Require Gecko 27 and later
Components.utils.import('resource://gre/modules/Downloads.jsm'); // Require Gecko 26 and later
Components.utils.import('resource://gre/modules/NetUtil.jsm'); // Promise chain that require Gecko 25 and later

var Utilities = {}, SiteLists = {}, PlayerRules = {}, FilterRules = {}, RefererRules = {};

var Services = {
  io: Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),
  obs: Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService),
  pps: Components.classes['@mozilla.org/network/protocol-proxy-service;1'].getService(Components.interfaces.nsIProtocolProxyService),
  prefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).QueryInterface(Components.interfaces.nsIPrefBranch),
  sss: Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService),
  strings: Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService),
};

var SiteLists = {
/**  Template sample to add new site
     请参考下面模板添加新的网站  */
  'youku': {
/**  If no multilingual label & tooltiptext is needed, you can add them here directly
     如果菜单信息不需要做多国语言，那么你可以直接在下面添加。  */
//    label: 'some text',
//    tooltiptext: 'some text',
    target: /http:\/\/static\.youku\.com\/.+player.*\.swf/i,
    url: /http:\/\/[^\/]+youku\.com\//i,
    hasPlayer: true,
    hasFilter: true,
    hasReferer: true,
    getPlayer: function () {
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
    },
    setPlayer: function (aState) {
      RuleExecution.toggle(aState, PlayerRules['youku_loader']);
      RuleExecution.toggle(aState, PlayerRules['youku_player']);
    },
    getFilter: function () {
      FilterRules['youku_tudou'] = {
        string: /http:\/\/val[fcopb]\.atm\.youku\.com\//i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['youku_tudou']);
    },
    getReferer: function () {
      RefererRules['referer-youku'] = {
        object: 'http://www.youku.com/',
        string: /http:\/\/.*\.youku\.com/i,
      };
    },
    setReferer: function (aState) {
      RuleExecution.toggle(aState, RefererRules['referer-youku']);
    },
  },
/**  Template End
     模板结束  */
  'tudou': {
    target: /http:\/\/js\.tudouui\.com\/.+player.+\.swf/i,
    url: /http:\/\/[^\/]+tudou\.com\//i,
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
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
    },
    setPlayer: function (aState) {
      RuleExecution.toggle(aState, PlayerRules['tudou_portal']);
      RuleExecution.toggle(aState, PlayerRules['tudou_olc']);
      RuleExecution.toggle(aState, PlayerRules['tudou_social']);
    },
    getFilter: function () {
      FilterRules['youku_tudou'] = {
        string: /http:\/\/val[fcopb]\.atm\.youku\.com\//i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['youku_tudou']);
    },
  },
  'iqiyi': {
    target: /http:\/\/www\.iqiyi\.com\/.+\/(Main|Share|Enjoy)Player.+\.swf/i,
    url: /http:\/\/[^\/]+(iqiyi\.com)\//i,
    hasPlayer: true,
    hasFilter: false,
    hasReferer: true,
    getPlayer: function () {
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
    },
    setPlayer: function (aState) {
      RuleExecution.toggle(aState, PlayerRules['iqiyi5']);
      RuleExecution.toggle(aState, PlayerRules['iqiyi_out']);
    },
    getReferer: function () {
      RefererRules['referer-iqiyi'] = {
        object: 'http://www.iqiyi.com/',
        string: /http:\/\/.*\.qiyi\.com/i,
      };
    },
    setReferer: function (aState) {
      RuleExecution.toggle(aState, RefererRules['referer-iqiyi']);
    },
  },
  'letv': {
    target: /http:\/\/player\.letvcdn\.com\/.+player\.swf/i,
    url: /http:\/\/[^\/]+letv\.com\//i,
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
      PlayerRules['letv'] = {
        object: FileIO.path + 'letv.swf',
        remote: FileIO.link + 'letv.swf',
        string: /http:\/\/.*\.letv(cdn)?\.com\/.*(new)?player\/((SDK)?Letv|swf)Player\.swf/i,
      };
      PlayerRules['letv_skin'] = {
        object: 'http://player.letvcdn.com/p/201407/24/15/newplayer/1/SSLetvPlayer.swf',
        string: /http:\/\/player\.letvcdn\.com\/p\/((?!15)\d+\/){3}newplayer\/1\/S?SLetvPlayer\.swf/i,
      };
    },
    setPlayer: function (aState) {
      RuleExecution.toggle(aState, PlayerRules['letv']);
      RuleExecution.toggle(aState, PlayerRules['letv_skin']);
    },
    getFilter: function () {
      FilterRules['letv'] = {
        string: /http:\/\/(ark|fz)\.letv\.com\/s\?ark/i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['letv']);
    },
  },
  'sohu': {
    target: /http:\/\/tv\.sohu\.com\/.+main\.swf/i,
    url: /http:\/\/(tv\.sohu|[^\/]+56)\.com\//i,
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
      PlayerRules['sohu'] = {
        object: FileIO.path + 'sohu_live.swf',
        remote: FileIO.link + 'sohu_live.swf',
        string: /http:\/\/(tv\.sohu\.com\/upload\/swf\/(p2p\/|56\/)?\d+|(\d+\.){3}\d+\/webplayer)\/Main\.swf/i,
      };
    },
    setPlayer: function (aState) {
      RuleExecution.toggle(aState, PlayerRules['sohu']);
    },
    getFilter: function () {
      FilterRules['sohu'] = {
        string: /http:\/\/v\.aty\.sohu\.com\/v\?/i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['sohu']);
    },
  },
  'pptv': {
    target: /http:\/\/player\.pplive\.cn\/.+(player|live).+\.swf/i,
    url: /http:\/\/[^\/]+pptv\.com\//i,
    hasPlayer: true,
    hasFilter: true,
    hasReferer: false,
    getPlayer: function () {
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
    setPlayer: function (aState) {
      RuleExecution.toggle(aState, PlayerRules['pptv']);
      RuleExecution.toggle(aState, PlayerRules['pptv_live']);
    },
    getFilter: function () {
      FilterRules['pptv'] = {
        string: /http:\/\/de\.as\.pptv\.com\/ikandelivery\/vast\/.*draft/i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['pptv']);
    },
  },
  'qq': {
    target: /http:\/\/imgcache\.qq\.com\/.+mediaplugin\.swf/i,
    url: /http:\/\/v\.qq\.com\//i,
    hasPlayer: false,
    hasFilter: true,
    hasReferer: false,
    getFilter: function () {
      FilterRules['qq'] = {
        string: /http:\/\/livew\.l\.qq\.com\/livemsg\?/i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['qq']);
    },
  },
  '163': {
    target: /http:\/\/v\.163\.com\/.+player.+\.swf/i,
    url: /http:\/\/v\.163\.com\//i,
    hasPlayer: false,
    hasFilter: true,
    hasReferer: false,
    getFilter: function () {
      FilterRules['163'] = {
        string: /http:\/\/v\.163\.com\/special\/.*\.xml/i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['163']);
    },
  },
  'sina': {
    target: /http:\/\/[^/]+\.sina\.com\.cn\/.+player.+\.swf/i,
    url: /http:\/\/video\.+sina\.com\.cn\//i,
    hasPlayer: false,
    hasFilter: true,
    hasReferer: false,
    getFilter: function () {
      FilterRules['sina'] = {
        string: /http:\/\/sax\.sina\.com\.cn\/video\/newimpress/i,
      };
    },
    setFilter: function (aState) {
      RuleExecution.toggle(aState, FilterRules['sina']);
    },
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
/**  When new site is added, you must add pref value for it
     当你添加新的网站，你必须为其添加参数  */
  'youku': {
    pref: 'rule.youku.defined',
    string: 'filter',
  },
/**  Pref sample end
     参数样例完毕  */
  'tudou': {
    pref: 'rule.tudou.defined',
    string: 'filter',
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
    if ('bool' in aValue) this.getBool(aValue.pref);
    if ('integer' in aValue) this.getInteger(aValue.pref);
    if ('string' in aValue) this.getChar(aValue.pref);
  },
  setValue: function (aValue) {
    if ('bool' in aValue) this.setBool(aValue.pref, aValue.bool);
    if ('integer' in aValue) this.setInteger(aValue.pref, aValue.integer);
    if ('string' in aValue) this.setChar(aValue.pref, aValue.string);
  },
  pending: function () {
    for (var i in PrefValue) {
      try {
        this.getValue(PrefValue[i]);
      } catch (e) {
        this.setValue(PrefValue[i]);
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
/**  Minor tweak on pref > rule. If nothing special is required, There's need to modify.
     微调参数与规则间的关系。如果新加网站不需要特殊规则可以不管这部分  */
    if ((this.getChar(PrefValue['youku'].pref) == 'filter' && this.getChar(PrefValue['tudou'].pref) == 'none') || (this.getChar(PrefValue['youku'].pref) == 'none' && this.getChar(PrefValue['tudou'].pref) == 'filter')) {
      this.setChar(PrefValue['youku'].pref, 'filter');
      this.setChar(PrefValue['tudou'].pref, 'filter');
    }

    for (var i in SiteLists) {
      if (SiteLists[i].hasReferer) {
        SiteLists[i].getReferer();
        if (this.getBool(PrefValue['referer-' + i].pref)) SiteLists[i].setReferer('on')
        else SiteLists[i].setReferer('off');
      }

      if (SiteLists[i].hasPlayer) {
        SiteLists[i].getPlayer();
        if (this.getChar(PrefValue[i].pref) == 'player') SiteLists[i].setPlayer('on');
        else SiteLists[i].setPlayer('off');
      }

      if (SiteLists[i].hasFilter) {
        SiteLists[i].getFilter();
        if (this.getChar(PrefValue[i].pref) == 'filter') SiteLists[i].setFilter('on');
        else SiteLists[i].setFilter('off');
      }
      
      if (this.getChar(PrefValue[i].pref) == 'player' || this.getChar(PrefValue[i].pref) == 'filter' || this.getChar(PrefValue[i].pref) == 'none') continue;
      else this.setChar(PrefValue[i].pref, PrefValue[i].string);
    }
/**  Pref > rule end
     规则参数完毕  */

    if (this.getBool(PrefValue['toolbar'].pref)) Toolbar.addIcon();
    else Toolbar.removeIcon();
  },
  setDefault: function () {
    for (var i in PrefValue) {
      if (i == 'directory' || i == 'server') continue;
      this.setValue(PrefValue[i]);
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
          S3: null, // Menu separator
        };

/**  If hasReferer is true, you must add menuitem label & tooltiptext separately
     如果新网站hasReferer设置为true，你需要按照下面格式单独添加菜单信息  */
        SiteLists['youku'].refererlabel = Utilities.GetStringFromName('youkuRefererLabel');
        SiteLists['youku'].referertooltiptext = Utilities.GetStringFromName('youkuRefererDescription');
        SiteLists['iqiyi'].refererlabel = Utilities.GetStringFromName('iqiyiRefererLabel');
        SiteLists['iqiyi'].referertooltiptext = Utilities.GetStringFromName('iqiyiRefererDescription');
/**  The sites listed in SiteLists,and their menu label & tooltiptext.
     请在下面添加SiteLists中的网站的菜单信息。  */
        SiteLists['youku'].label = Utilities.GetStringFromName('youkuSiteLabel');
        SiteLists['youku'].tooltiptext = 'http://www.youku.com/';
        SiteLists['tudou'].label = Utilities.GetStringFromName('tudouSiteLabel');
        SiteLists['tudou'].tooltiptext = 'http://www.tudou.com/';
        SiteLists['iqiyi'].label = Utilities.GetStringFromName('iqiyiSiteLabel');
        SiteLists['iqiyi'].tooltiptext = 'http://www.iqiyi.com/';
        SiteLists['letv'].label = Utilities.GetStringFromName('letvSiteLabel');
        SiteLists['letv'].tooltiptext = 'http://www.letv.com/';
        SiteLists['sohu'].label = Utilities.GetStringFromName('sohuSiteLabel');
        SiteLists['sohu'].tooltiptext = 'http://tv.sohu.com/';
        SiteLists['pptv'].label = Utilities.GetStringFromName('pptvSiteLabel');
        SiteLists['pptv'].tooltiptext = 'http://www.pptv.com/';
        SiteLists['qq'].label = Utilities.GetStringFromName('qqSiteLabel');
        SiteLists['qq'].tooltiptext = 'http://v.qq.com/';
        SiteLists['163'].label = Utilities.GetStringFromName('163SiteLabel');
        SiteLists['163'].tooltiptext = 'http://v.163.com/';
        SiteLists['sina'].label = Utilities.GetStringFromName('sinaSiteLabel');
        SiteLists['sina'].tooltiptext = 'http://video.sina.com.cn/';

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
            if (i == 'remote') aItem.setAttribute('type', 'checkbox');
            aPopup.appendChild(aItem);
          }
        }

        for (var x in SiteLists) {
          if (SiteLists[x].hasReferer) {
            var rItem = aDocument.createElement('menuitem');
            rItem.setAttribute('id', 'sowatchmk2-referer-' + x);
            rItem.setAttribute('label', SiteLists[x].refererlabel);
            rItem.setAttribute('tooltiptext', SiteLists[x].referertooltiptext);
            rItem.setAttribute('class', 'menuitem-iconic');
            rItem.setAttribute('type', 'checkbox');
            aPopup.appendChild(rItem);
          }

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
            if (!SiteLists[x].hasPlayer && n == 'player') nItem.setAttribute('disabled', 'true');
            if (!SiteLists[x].hasFilter && n == 'filter') nItem.setAttribute('disabled', 'true');
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

        if (aEvent.target.id == 'sowatchmk2-checkupdate') {
          if (Preferences.getBool(PrefValue['remote'].pref)) return;
          QueryFiles.start('no');
        }

        if (aEvent.target.id == 'sowatchmk2-forceupdate') {
          if (Preferences.getBool(PrefValue['remote'].pref)) return;
          QueryFiles.start('yes');
        }

        if (aEvent.target.id == 'sowatchmk2-referer-youku') {
          if (Preferences.getBool(PrefValue['referer-youku'].pref)) Preferences.setBool(PrefValue['referer-youku'].pref, false);
          else Preferences.setBool(PrefValue['referer-youku'].pref, true);
        }

        for (var x in SiteLists) {
          if (SiteLists[x].hasReferer) {
            if (aEvent.target.id == 'sowatchmk2-referer-' + x) {
              if (Preferences.getBool(PrefValue['referer-' + x].pref)) Preferences.setBool(PrefValue['referer-' + x].pref, false);
              else Preferences.setBool(PrefValue['referer-' + x].pref, true);
            }
          }

          if (aEvent.target.id == 'sowatchmk2-' + x + '-player') {
            if (!SiteLists[x].hasPlayer) continue;
            Preferences.setChar(PrefValue[x].pref, 'player');
          } else if (aEvent.target.id == 'sowatchmk2-' + x + '-filter') {
            if (!SiteLists[x].hasFilter) continue;
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
        }

        for (var x in SiteLists) {
          if (aEvent.target.id == 'sowatchmk2-popup') {
            if (!SiteLists[x].url.test(aEvent.target.ownerDocument.defaultView.content.location.href) && !SiteLists[x].popup) {
              aEvent.target.querySelector('#sowatchmk2-' + x).setAttribute('hidden', 'true');
              if (SiteLists[x].hasReferer) aEvent.target.querySelector('#sowatchmk2-referer-' + x).setAttribute('hidden', 'true');
            } else {
              aEvent.target.querySelector('#sowatchmk2-' + x).setAttribute('hidden', 'false');
              if (SiteLists[x].hasReferer) aEvent.target.querySelector('#sowatchmk2-referer-' + x).setAttribute('hidden', 'false');
            }

            if (SiteLists[x].hasReferer) {
              if (Preferences.getBool(PrefValue['referer-' + x].pref)) aEvent.target.querySelector('#sowatchmk2-referer-' + x).setAttribute('checked', 'true');
              else aEvent.target.querySelector('#sowatchmk2-referer-' + x).setAttribute('checked', 'false');
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

var RuleExecution = {
  toggle: function (aState, aRule) {
    if (aState == 'on') aRule['target'] = aRule['string'];
    if (aState == 'off') aRule['target'] = null;
  },
  getPlayer: function (remote, rule, callback) {
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
  getFilter: Services.pps.newProxyInfo('http', '127.0.0.1', '50086', 1, 0, null),
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) || aIID.equals(Components.interfaces.nsIObserver)) return this;
    return Components.results.NS_ERROR_NO_INTERFACE;
  },
  referer: function (aSubject) {
    var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);

    for (var i in RefererRules) {
      if (RefererRules[i]['target'] && RefererRules[i]['target'].test(httpChannel.originalURI.spec)) {
        httpChannel.setRequestHeader('Referer', RefererRules[i]['host'], false);
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
            this.getPlayer('on', rule, function () {
              httpChannel.resume();
              if (typeof rule['callback'] === 'function') rule['callback'].apply(fn, args);
            });
          } else {
            this.getPlayer('off', rule, function () {
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
        return RuleExecution.getFilter;
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
      Toolbar.UserInterface(aSubject);
      RuleExecution.player(aSubject);
    }
  },
  startUp: function () {
    PrefBranch.addObserver('', this, false);
    Services.pps.registerFilter(this, 3);
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
  Utilities = Services.strings.createBundle('chrome://sowatchmk2/locale/global.properties?' + Math.random());
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
