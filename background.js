/* -------------------- PreProcess -------------------- */

//Global constants
const PORT_BROWSERACTION = "browseraction", PORT_CONFIRM = "confirm", PORT_SETTINGS = "settings";
const URL_CONFIRM = "/confirm/index.html", URL_SETTINGS = "/settings/index.html";
const MODE_NORMAL=1, MODE_CONFIRM=2, MODE_BLOCKING=3;
const FOCUS_DEFAULT=1, FOCUS_BACKGROUND=2, FOCUS_FOREGROUND=3;
const THEME_LIGHT=1, THEME_DARK=2;
const BROWSERACTION_TITLE = {
	1: "PopupFilter ("+geti18ndata("Normal")+")",
	2: "PopupFilter ("+geti18ndata("Confirm")+")",
	3: "PopupFilter ("+geti18ndata("Blocking")+")"
};
const BROWSERACTION_ICON = {
	1: "/images/icon-normal.png",
	2: "/images/icon-confirm.png",
	3: "/images/icon-blocking.png"
};
const BROWSERACTION_BADGECOLOR = {1: "#32BC10", 2: "orange", 3: "red"};
const CSP_SANDBOX_NOPOPUPS = "sandbox allow-forms allow-orientation-lock allow-pointer-lock"
	+" allow-presentation allow-same-origin allow-scripts allow-top-navigation;";

/* -------------------- Classes -------------------- */

function TabHistory(){
//#	Variables
	this.data = [];
	var self = this;
	var timeout = null;
	
//#	Constructors
	//Retrieves tab list
	browser.tabs.query({},function(tabs){
		self.merge(tabs);
	});
	
//#	Public methods
	//Getters & Setters
	this.get = function(tabid){
		return this.data.find(tab => (tab.id==tabid));
	};
	
	this.set = function(obj){
		if(obj.id!=browser.tabs.TAB_ID_NONE){
			var tab = this.get(obj.id);
			if(!tab){
				obj.mode = obj.mode || MODE_NORMAL;
				this.data.push(obj);}
			else for(var prop in obj) tab[prop] = obj[prop];}
	};
	
	//Merges tab list with the specified list
	this.merge = function(list){
		list.forEach(function(obj){
			if(obj.id!=browser.tabs.TAB_ID_NONE){
				var tab = self.get(obj.id);
				if(!tab){
					obj.mode = obj.mode || MODE_NORMAL;
					self.data.push(obj);}
				else for(var prop in obj){
					if(tab.mode==MODE_NORMAL || prop!="url") tab[prop] = obj[prop];}}
		});
		self.data = self.data.filter(val1 => (val1.mode!=MODE_NORMAL || list.find(val2 => (val1.id==val2.id))));
	};
	
	//Removes duplicate tabs
	this.unique = function(){
		this.data = this.data.groupBy(tab => tab.mode)
			.sort((group1,group2) => (group1.key-group2.key))
			.flatMap(group => group.value.sort(sortbyposition))
			.reduce(function(acc,tab){
				if(tab.mode==MODE_BLOCKING || !acc.find(val => (val.url==tab.url))) acc.push(tab);
				else closetab(tab);
				return acc;
			},[]);
	};
	
	//Displays all confirm tabs
	this.displayall = function(){
		this.data.filter(tab => (tab.mode==MODE_CONFIRM))
			.forEach(function(tab){
				tab.mode = MODE_NORMAL;
				browser.tabs.update(tab.id,{url: tab.url});
			});
	};
	
	//Blocks all confirm tabs
	this.blockall = function(){
		this.data.filter(tab => (tab.mode==MODE_CONFIRM))
			.forEach(function(tab){
				tab.mode = MODE_BLOCKING;
				closetab(tab);
			});
	};
	
	//Restores all blocked tabs
	this.restoreall = function(){
		this.data = this.data.sort(sortbylast)
			.filter(function(tab){
				if(tab.mode==MODE_BLOCKING) opentab({url: tab.url, index: "next", active: false});
				return (tab.mode!=MODE_BLOCKING);
			});
	};
	
	//Removes specifed tab from list
	this.remove = function(tabid){
		return this.data.remove(tab => (tab.id==tabid));
	};
	
	//Removes confirm and blocked tabs from list
	this.clear = function(tabid){
		this.data = this.data.filter(function(tab){
			if(tab.mode==MODE_CONFIRM) closetab(tab);
			return (tab.mode==MODE_NORMAL);
		});
	};
}

function Settings(){
//#	Variables
	this.mode = MODE_NORMAL;
	this.options = {};
	this.ui = {};
	this.tab = null;
	this.sync = false;
	var self = this;
	
//#	Constructors
	var sendtimer = new Timer({
		func: function(){
			portcon.send(PORT_SETTINGS);
			self.sync = false;
		},
		delay: 200
	});
	
	var updatetimer = new Timer({
		func: function(){
			browser.tabs.query({},function(tabs){
				tabhistory.merge(tabs);
				self.updatebadge();
				self.send();
			});
		},
		delay: 200
	});
	
	//Retrieves data from local storage
	browser.storage.local.get(function(storage){
		self.mode = storage.mode || MODE_NORMAL;
		self.options = storage.options || {};
		self.options = {
			applycsp: (self.options.applycsp!=false),
			popupfocus: self.options.popupfocus || FOCUS_DEFAULT,
			showbadge: (!ANDROID && self.options.showbadge!=false)
		};
		self.ui = storage.ui || {
			theme: THEME_LIGHT,
			browseraction: {actionmenu: null},
			confirm: {},
			settings: {section: null, accordion: null}
		};
		self.updatebutton();
		self.updatebadge();
	});
	
//#	Public methods
	//Getters & Setters
	this.setmode = function(val){
		this.mode = parseInt(val);
		this.updatebutton();
		this.updatebadge();
		browser.storage.local.set({mode: this.mode});
	};
	
	this.setoptions = function(obj){
		for(var prop in obj) this.options[prop] = obj[prop];
		this.updatebadge();
		browser.storage.local.set({options: this.options});
	};
	
	this.setui = function(page,obj){
		if(obj.uitheme) this.ui.theme = obj.uitheme;
		else for(var prop in obj.uistate) this.ui[page][prop] = obj.uistate[prop];
		browser.storage.local.set({ui: this.ui});
	};
	
	this.settab = function(tab){
		if(!self.tab){
			browser.tabs.onActivated.addListener(ontabfocus);
			browser.tabs.onRemoved.addListener(ontabremove);}
		else if(self.tab.id!=tab.id) closetab(self.tab);
		self.tab = tab;
	};
	
	//Opens Settings page
	//Note: No Firefox Android 56- support + Firefox and Opera issue with openOptionsPage()
	//Note: Firefox Android 58- issue with browserAction popup focus
	this.open = function(){
		//browser.runtime.openOptionsPage();
		if(this.tab) focustab(this.tab);
		else opentab({url: URL_SETTINGS, active: true},this.settab);
		if(ANDROID) setTimeout(function(){ focustab(self.tab) },500);
	};
	
	//Closes Settings page
	this.close = function(){
		if(this.tab) ontabremove(this.tab.id);
	};
	
	//Sends data synchronously to Settings page
	this.send = function(){
		if(this.tab && this.tab.active) sendtimer.restart();
		else this.sync = true;
	};
	
	//Updates all tabs in history and sends data to Settings page
	this.updatetabs = function(){
		updatetimer.restart();
	};
	
	//Updates browserAction button
	//Note: No Firefox Android support for browserAction.setIcon() and setBadgeBackgroundColor()
	this.updatebutton = function(){
		browser.browserAction.setTitle({title: BROWSERACTION_TITLE[this.mode]});
		if(!ANDROID){
			browser.browserAction.setIcon({path: BROWSERACTION_ICON[this.mode]});
			browser.browserAction.setBadgeBackgroundColor({color: BROWSERACTION_BADGECOLOR[this.mode]});}
	};
	
	//Updates browserAction badge
	//Note: No Firefox Android support for browserAction.setBadgeText()
	this.updatebadge = function(){
		if(!ANDROID){
			var badge = this.options.showbadge && tabhistory.data.count(tab => (tab.mode==this.mode)) || "";
			browser.browserAction.setBadgeText({text: badge.toString()});}
	}
	
//#	Private methods
	var ontabfocus = function(info){
		self.tab.active = (self.tab.id==info.tabId || self.tab.active && self.tab.windowId!=info.windowId);
		if(self.sync) self.send();
	};
	
	var ontabremove = function(tabid){
		if(self.tab.id==tabid){
			browser.tabs.onActivated.removeListener(ontabfocus);
			browser.tabs.onRemoved.removeListener(ontabremove);
			self.tab = null;}
	};
}

/* -------------------- Functions -------------------- */

//Tab sort
var sortbylast = (tab1,tab2) => (tab2.id-tab1.id);
var sortbyposition = (tab1,tab2) => (
	(tab1.windowId==tab2.windowId)? tab1.index-tab2.index : tab1.windowId-tab2.windowId
);

//Redirects to confirm page
//Note: Chrome and Opera don't redirect in private mode
function redirectconfirm(info){
	var url = URL_CONFIRM+"#"+info.tabId;
	switch(settings.options.popupfocus){
	case FOCUS_DEFAULT :
		browser.tabs.update(info.tabId,{url: url});
	break;
	case FOCUS_BACKGROUND :
		browser.tabs.update(info.tabId,{url: url, active: false});
		focustab(tabhistory.get(info.sourceTabId));
	break;
	case FOCUS_FOREGROUND :
		if(!ANDROID) browser.windows.update(info.windowId,{focused: true});
		browser.tabs.update(info.tabId,{url: url, active: true});
	break;}
}

//Prevents popup opening
function preventpopup(tab,info){
	info.windowId = info.windowId || tab.windowId;
	tab.url = info.url;
	tab.mode = settings.mode;
	tabhistory.set(tab);
	switch(settings.mode){
	case MODE_NORMAL :
	break;
	case MODE_CONFIRM :
		redirectconfirm(info);
	break;
	case MODE_BLOCKING :
		closetab(tab);
	break;}
}

//Returns true if HTTP request is opened by Chromium PDF Viewer
function ischromiumpdf(info){
	return (CHROMIUM && info.responseHeaders.find(val => (val.name=="Content-Type" && val.value=="application/pdf")));
}

//Connects to confirm script
function confirmcon(port){
	var tab = tabhistory.get(port.sender.tab.id);
	portcon.connect({
		port: port,
		msgpost: function(){ return {tab: tab} },
		msgget: function(msg){
			switch(msg.status){
			case "display" :
				tabhistory.set({id: tab.id, mode: MODE_NORMAL});
				browser.tabs.update(tab.id,{url: tab.url});
			break;
			case "block" :
				tabhistory.set({id: tab.id, mode: MODE_BLOCKING});
				closetab(tab);
			break;}
		}
	});
	portcon.send(PORT_CONFIRM);
}

//Sends settings data to port
function sendsettingsdata(){
	return {
		status: "settings",
		opentabs: tabhistory.data.filter(val => (val.mode==MODE_NORMAL)).sort(sortbyposition),
		confirmtabs: tabhistory.data.filter(val => (val.mode==MODE_CONFIRM)).sort(sortbylast),
		blockedtabs: tabhistory.data.filter(val => (val.mode==MODE_BLOCKING)).sort(sortbylast),
		mode: settings.mode,
		options: settings.options
	};
}

//Gets browseraction data received from port message
function getbrowseractiondata(msg){
	switch(msg.status){
	case "mode" : settings.setmode(msg.mode);
	break;
	case "ui" : settings.setui(PORT_BROWSERACTION,msg);
	break;
	case "open_settings" : settings.open();
	break;
	case "remove_duplicates" : tabhistory.unique();
	break;
	case "restore_tab" :
		tabhistory.remove(msg.tab.id);
		opentab({url: msg.tab.url, index: "next", active: false});
	break;}
	portcon.send([PORT_BROWSERACTION,PORT_SETTINGS]);
}

//Connects to browseraction script
function browseractioncon(port){
	portcon.connect({
		port: port,
		msgpost: sendsettingsdata,
		msgget: getbrowseractiondata,
		disconnect: function(){
			if(ANDROID && port.sender.tab.id) tabhistory.remove(port.sender.tab.id);
		}
	});
	portcon.send({
		port: PORT_BROWSERACTION,
		msg: {status: "ui", uitheme: settings.ui.theme, uistate: settings.ui[PORT_BROWSERACTION]}
	});
	portcon.send([PORT_BROWSERACTION,PORT_SETTINGS]);
}

//Gets settings data received from port message
function getsettingsdata(msg){
	switch(msg.status){
	case "mode" : settings.setmode(msg.mode);
	break;
	case "options" : settings.setoptions(msg.options);
	break;
	case "ui" : settings.setui(PORT_SETTINGS,msg);
	break;
	case "display_tab" :
		tabhistory.set({id: msg.tab.id, mode: MODE_NORMAL});
		browser.tabs.update(msg.tab.id,{url: msg.tab.url});
	break;
	case "display_all" : tabhistory.displayall();
	break;
	case "remove_duplicates" : tabhistory.unique();
	break;
	case "block_tab" :
		tabhistory.set({id: msg.tab.id, mode: MODE_BLOCKING});
		closetab(msg.tab);
	break;
	case "block_all" : tabhistory.blockall();
	break;
	case "restore_tab" :
		tabhistory.remove(msg.tab.id);
		opentab({url: msg.tab.url, index: "next", active: false});
	break;
	case "restore_all" : tabhistory.restoreall();
	break;
	case "clear" :
		tabhistory.clear();
		settings.updatebadge();
	break;}
	portcon.send([PORT_BROWSERACTION,PORT_SETTINGS]);
}

//Connects to settings script
function settingscon(port){
	settings.settab(port.sender.tab);
	portcon.connect({
		port: port,
		msgpost: sendsettingsdata,
		msgget: getsettingsdata,
		disconnect: function(){ settings.close() }
	});
	portcon.send({
		port: PORT_SETTINGS,
		msg: {status: "ui", uitheme: settings.ui.theme, uistate: settings.ui[PORT_SETTINGS]}
	});
	portcon.send([PORT_BROWSERACTION,PORT_SETTINGS]);
}

/* -------------------- Main Process -------------------- */

//Global variables
var portcon = new PortConnect();
var tabhistory = new TabHistory();
var settings = new Settings();
var syncpopup = [];

//Tab open
//Note: Firefox not firing on previous session restore
browser.tabs.onCreated.addListener(function(tab){
	var info = syncpopup.remove(val => (val.tabId==tab.id));
	if(info) preventpopup(tab,info);
	else tabhistory.set(tab);
	settings.updatetabs();
});

//Popup open
//Note: No Chrome support for info.windowId
//Note: Firefox Android not firing with links
browser.webNavigation.onCreatedNavigationTarget.addListener(function(info){
	var tab = tabhistory.get(info.tabId);
	if(tab){
		preventpopup(tab,info);
		settings.updatebadge();
		settings.send();}
	else syncpopup.push(info);
});

//Blocking web requests
browser.webRequest.onBeforeRequest.addListener(
	function(info){
		var tab = tabhistory.get(info.tabId);
		return {cancel: (tab && tab.mode==MODE_BLOCKING)};
	},
	{urls: ["<all_urls>"], types: ["main_frame"]},
	["blocking"]
);

//Prevents popups with Content Security Policy
//Note: Chromium PDF Viewer Plugin issue with CSP sandbox
browser.webRequest.onHeadersReceived.addListener(
	function(info){
		if(settings.mode==MODE_BLOCKING && settings.options.applycsp && !ischromiumpdf(info))
			info.responseHeaders.push({
				name: "Content-Security-Policy",
				value: CSP_SANDBOX_NOPOPUPS
			});
		return {responseHeaders: info.responseHeaders};
	},
	{urls: ["<all_urls>"], types: ["main_frame"]},
	["blocking","responseHeaders"]
);

//Tab update
browser.tabs.onUpdated.addListener(function(tabid,info,tab){
	var val = tabhistory.get(tabid);
	if(val && val.mode==MODE_NORMAL){
		tabhistory.set(tab);
		settings.updatebadge();
		settings.send();}
	if(!val && info.status) settings.updatetabs();
});

//Tab move within windows
browser.tabs.onMoved.addListener(function(tabid,info){
	settings.updatetabs();
});

//Tab move between windows
//Note: Firefox Quantum 57-60 sets invalid tab id
browser.tabs.onAttached.addListener(function(tabid,info){
	settings.updatetabs();
});

//Tab close
//Note: Firefox Quantum not firing in some case
browser.tabs.onRemoved.addListener(function(tabid,info){
	var tab = tabhistory.get(tabid);
	if(tab){
		if(tab.mode==MODE_NORMAL) tabhistory.remove(tabid);
		if(tab.mode==MODE_CONFIRM) tabhistory.set({id: tabid, mode: MODE_BLOCKING});
		settings.updatebadge();
		settings.send();}
	else settings.updatetabs();
});

//Port communication between scripts
browser.runtime.onConnect.addListener(function(port){
	switch(port.name){
	case PORT_CONFIRM : confirmcon(port);
	break;
	case PORT_BROWSERACTION : browseractioncon(port);
	break;
	case PORT_SETTINGS : settingscon(port);
	break;}
});
