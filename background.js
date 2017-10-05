/* -------------------- Classes -------------------- */

function TabHistory(){
	//Variables
	this.data = [];
	var self = this;
	
	//Retrieves tab list
	browser.tabs.query({},function(tabs){
		self.update(tabs);
	});
	
	//Private methods
	var objcontains = function(val,obj){
		for(var prop in obj){
			if(val[prop]!=obj[prop]) return false;}
		return true;
	};
	
	//Public methods
	this.get = function(tabid){
		return this.data.find(function(val){
			return (val.id==tabid);
		});
	};
	
	this.getAll = function(obj){
		return this.data.findAll(function(val){
			return objcontains(val,obj);
		});
	};
	
	this.set = function(obj){
		var val = this.get(obj.id);
		if(!val){
			obj.mode = obj.mode || 1;
			this.data.push(obj);}
		else for(var prop in obj) val[prop] = obj[prop];
	};
	
	this.update = function(list){
		for(var i=0; i<list.length; i++){
			var obj = list[i];
			if(obj.id!=browser.tabs.TAB_ID_NONE){
				var val = this.get(obj.id);
				if(!val){
					obj.mode = obj.mode || 1;
					this.data.push(obj);}
				else for(var prop in obj){
					if(val.mode==1 || prop!="url") val[prop] = obj[prop];}}}
	};
	
	this.remove = function(tabid){
		return this.data.remove(function(val){
			return (val.id==tabid);
		});
	};
	
	this.clear = function(tabid){
		this.data.removeAll(function(val){
			if(val.mode==2) browser.tabs.remove(val.id);
			return (val.mode==2 || val.mode==3);
		});
	};
}

function PortConnect(){
	//Variables
	this.data = [];
	var self = this;
	
	//Public methods
	this.connect = function(obj){
		this.data.push({
			port: obj.port,
			msgpost: obj.msgpost
		});
		obj.port.onMessage.addListener(obj.msgget);
		obj.port.onDisconnect.addListener(function(){
			self.data.remove(function(val){
				return (val.port.name==obj.port.name);
			});
		});
	};
	
	this.send = function(namelist){
		this.data.forEach(function(val){
			if(namelist.contains(val.port.name)) val.port.postMessage(val.msgpost());
		});
	};
}

function Settings(){
	//Variables
	this.mode = 1;
	this.options = {};
	this.tab = null;
	this.focus = false;
	this.sync = false;
	var self = this;
	var timeout = null;
	
	//Retrieves data from local storage
	browser.storage.local.get(function(storage){
		self.mode = storage.mode || 1;
		updateicon(self.mode);
		self.options = storage.options || {};
		self.options = {
			popupfocus: self.options.popupfocus || 1
		};
	});
	
	//Private methods
	var createtab = function(tab){
		self.tab = tab;
		self.focus = true;
		if(!android) browser.windows.onFocusChanged.addListener(focuswin);
		browser.tabs.onActivated.addListener(focustab);
		browser.tabs.onMoved.addListener(movetab);
		browser.tabs.onAttached.addListener(movetab);
		browser.tabs.onRemoved.addListener(removetab);
	};
	
	var focuswin = function(winid){
		self.focus = (self.tab.active && (self.tab.windowId==winid || winid==browser.windows.WINDOW_ID_NONE));
		if(self.sync) self.send();
	};
	
	var focustab = function(info){
		self.focus = self.tab.active = (self.tab.id==info.tabId || self.tab.windowId!=info.windowId && self.tab.active);
		if(self.sync) self.send();
	};
	
	var movetab = function(tabid,info){
		if(self.tab.id==tabid){
			self.tab.windowId = info.newWindowId || self.tab.windowId;
			self.tab.index = info.toIndex || info.newPosition;
			self.focus = true;}
	};
	
	var removetab = function(tabid){
		if(self.tab.id==tabid){
			self.tab = null;
			self.focus = false;
			if(!android) browser.windows.onFocusChanged.removeListener(focuswin);
			browser.tabs.onActivated.removeListener(focustab);
			browser.tabs.onMoved.removeListener(movetab);
			browser.tabs.onAttached.removeListener(movetab);
			browser.tabs.onRemoved.removeListener(removetab);}
	};
	
	//Public methods
	this.setmode = function(val){
		this.mode = parseInt(val);
		browser.storage.local.set({mode: this.mode});
		updateicon(this.mode);
	};
	
	this.setoptions = function(obj){
		for(var prop in obj) this.options[prop] = obj[prop];
		browser.storage.local.set({options: this.options});
	};
	
	this.open = function(){
		if(this.tab){
			if(!android) browser.windows.update(this.tab.windowId,{focused: true});
			browser.tabs.update(this.tab.id,{active: true});}
		else browser.tabs.create({url: "/settings/index.html"},createtab);
		//Firefox Android issue with browserAction popup and Settings page
		if(android) setTimeout(function(){browser.tabs.update(self.tab.id,{active: true})},500);
	};
	
	this.close = function(){
		if(this.tab) browser.tabs.remove(this.tab.id);
	};
	
	this.send = function(){
		if(this.focus){
			if(timeout) clearTimeout(timeout);
			timeout = setTimeout(function(){
				browser.tabs.query({},function(tabs){
					tabhistory.update(tabs);
					portcon.send(["settings"]);
				});
				self.sync = false;
				timeout = null;
			},200);}
		else this.sync = true;
	};
}

/* -------------------- Main Process -------------------- */

//Browser compatibility
var browser = browser || chrome;
var android = !browser.windows;

//Global variables
var tabhistory = new TabHistory();
var portcon = new PortConnect();
var settings = new Settings();
var syncpopup = [];

//Popup open
//Note: Firefox Android not firing with links
//Note: Chrome doesn't support info.windowId
browser.webNavigation.onCreatedNavigationTarget.addListener(function(info){
	var tab = tabhistory.get(info.tabId);
	if(tab){
		preventpopup(tab,info);
		settings.send();}
	else syncpopup.push(info);
});

//Tab open
//Note: Firefox not firing on previous session restore
browser.tabs.onCreated.addListener(function(tab){
	var info = syncpopup.remove(function(val){
		return (val.tabId==tab.id);
	});
	if(info) preventpopup(tab,info);
	else tabhistory.set(tab);
	settings.send();
});

//Tab update
browser.tabs.onUpdated.addListener(function(tabid,info,tab){
	var val = tabhistory.get(tab.id);
	if(!val || val.mode==1){
		tabhistory.set(tab);
		settings.send();}
});

//Tab move within a window
browser.tabs.onMoved.addListener(function(tabid,info){
	settings.send();
});

//Tab move between windows
browser.tabs.onAttached.addListener(function(tabid,info){
	settings.send();
});

//Tab close
browser.tabs.onRemoved.addListener(function(tabid,info){
	var tab = tabhistory.get(tabid);
	if(tab){
		if(tab.mode==1) tabhistory.remove(tabid);
		if(tab.mode==2) tabhistory.set({id: tabid, mode: 3});
		settings.send();
		updatebadge();}
});

//Script communication with content scripts
browser.runtime.onConnect.addListener(function(port){
	switch(port.name){
	case "confirm" : confirmcon(port);
	break;
	case "popup" :
	case "settings" : settingscon(port);
	break;}
});

/* -------------------- Functions -------------------- */

//Redirects to confirm page
function redirectconfirm(info){
	var url = "/confirm/index.html#"+info.tabId;
	switch(settings.options.popupfocus){
	case 1 : //Default focus
		browser.tabs.update(info.tabId,{url: url});
	break;
	case 2 : //Background focus
		browser.tabs.update(info.tabId,{url: url, active: false});
		if(!android) browser.windows.update(tabhistory.get(info.sourceTabId).windowId,{focused: true});
		browser.tabs.update(info.sourceTabId,{active: true});
	break;
	case 3 : //Foreground focus
		if(!android) browser.windows.update(info.windowId,{focused: true});
		browser.tabs.update(info.tabId,{url: url, active: true});
	break;}
}

//Closes specified tab and its window
//Note: about:config --> browser.tabs.closeWindowWithLastTab
function closetab(tab){
	if(!android)
		browser.windows.get(tab.windowId,{populate: true},function(window){
			if(window.tabs.length<=1) browser.windows.remove(window.id);
			else browser.tabs.remove(tab.id);
		});
	else browser.tabs.remove(tab.id);
}

//Prevents popup opening
function preventpopup(tab,info){
	info.windowId = info.windowId || tab.windowId;
	tab.url = info.url;
	tab.mode = settings.mode;
	tabhistory.set(tab);
	switch(settings.mode){
	case 1 : //Normal Mode
	break;
	case 2 : //Confirm Mode
		redirectconfirm(info);
		updatebadge();
	break;
	case 3 : //Blocking Mode
		closetab(tab);
		updatebadge();
	break;}
}

//Updates browserAction icon (No Firefox Android support)
function updateicon(mode){
	if(!android){
		var icons = {
			1: "/images/icon-normal.png",
			2: "/images/icon-confirm.png",
			3: "/images/icon-blocking.png"
		};
		var colors = {1: "green", 2: "orange", 3: "red"};
		browser.browserAction.setIcon({path: icons[mode]});
		browser.browserAction.setBadgeBackgroundColor({color: colors[mode]});}
};

//Updates browserAction badge (No Firefox Android support)
function updatebadge(){
	if(!android){
		var badge = settings.mode!=1 && tabhistory.getAll({mode: settings.mode}).length || "";
		browser.browserAction.setBadgeText({text: badge.toString()});}
}

//Connects to confirm script
function confirmcon(port){
	var tab = tabhistory.get(port.sender.tab.id);
	portcon.connect({
		port: port,
		msgpost: function(){return {tab: tab}},
		msgget: function(msg){
			switch(msg.status){
			case "open" :
				tabhistory.set({id: tab.id, mode: 1});
				browser.tabs.update(tab.id,{url: tab.url});
				updatebadge();
			break;
			case "close" :
				tabhistory.set({id: tab.id, mode: 3});
				closetab(tab);
			break;}
		}
	});
	portcon.send(["confirm"]);
}

//Tab sort
var sortbylast = function(tab1,tab2){
	return tab2.id-tab1.id;
};
var sortbyposition = function(tab1,tab2){
	if(tab1.windowId==tab2.windowId) return tab1.index-tab2.index;
	else return tab1.windowId-tab2.windowId;
};

//Connects to popup and settings scripts
function settingscon(port){
	portcon.connect({
		port: port,
		msgpost: function(){return {
			opentabs: tabhistory.getAll({mode: 1}).sort(sortbyposition),
			confirmtabs: tabhistory.getAll({mode: 2}).sort(sortbylast),
			closetabs: tabhistory.getAll({mode: 3}).sort(sortbylast),
			mode: settings.mode,
			options: settings.options
		}},
		msgget: function(msg){
			switch(msg.status){
			case "settings" : settings.open();
			break;
			case "mode" :
				settings.setmode(msg.mode);
				updatebadge();
			break;
			case "options" : settings.setoptions(msg.options);
			break;
			case "open" :
				tabhistory.set({id: msg.tab.id, mode: 1});
				browser.tabs.update(msg.tab.id,{url: msg.tab.url});
				updatebadge();
			break;
			case "close" : closetab(msg.tab);
			break;
			case "restore" :
				tabhistory.remove(msg.tab.id);
				browser.tabs.create({url: msg.tab.url, active: false});
				updatebadge();
			break;
			case "clear" :
				tabhistory.clear();
				updatebadge();
			break;}
			portcon.send(["popup","settings"]);
		}
	});
	portcon.send(["popup","settings"]);
}
