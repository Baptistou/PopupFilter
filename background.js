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
	var objcontains = function(obj1,obj2){
		for(var prop in obj2){
			if(obj1[prop]!=obj2[prop]) return false;}
		return true;
	};
	
	//Public methods
	this.get = function(tabid){
		return this.data.find(function(val){
			return (val.id==tabid);
		});
	};
	
	this.getAll = function(obj){
		return this.data.filter(function(val){
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
		list.forEach(function(obj){
			if(obj.id!=browser.tabs.TAB_ID_NONE){
				var val = self.get(obj.id);
				if(!val){
					obj.mode = obj.mode || 1;
					self.data.push(obj);}
				else for(var prop in obj){
					if(val.mode==1 || prop!="url") val[prop] = obj[prop];}}
		});
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
		this.data.removeAll(function(val){
			try{
				if(namelist.contains(val.port.name)) val.port.postMessage(val.msgpost());
				return false;}
			catch(error){
				return true;}
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
		self.options = storage.options || {};
		self.options = {
			popupfocus: self.options.popupfocus || 1,
			showbadge: !(self.options.showbadge==false || android)
		};
		self.updateicon();
		self.updatebadge();
	});
	
	//Private methods
	var createtab = function(tab){
		self.tab = tab;
		self.focus = true;
		if(!android) browser.windows.onFocusChanged.addListener(onwinfocus);
		browser.tabs.onActivated.addListener(ontabfocus);
		browser.tabs.onMoved.addListener(ontabmove);
		browser.tabs.onAttached.addListener(ontabmove);
		browser.tabs.onRemoved.addListener(ontabremove);
	};
	
	var onwinfocus = function(winid){
		self.focus = (self.tab.active && (self.tab.windowId==winid || winid==browser.windows.WINDOW_ID_NONE));
		if(self.sync) self.send();
	};
	
	var ontabfocus = function(info){
		self.focus = self.tab.active = (self.tab.id==info.tabId || self.tab.windowId!=info.windowId && self.tab.active);
		if(self.sync) self.send();
	};
	
	var ontabmove = function(tabid,info){
		if(self.tab.id==tabid){
			self.tab.windowId = info.newWindowId || self.tab.windowId;
			self.tab.index = info.toIndex || info.newPosition;
			self.focus = true;}
	};
	
	var ontabremove = function(tabid){
		if(self.tab.id==tabid){
			self.tab = null;
			self.focus = false;
			if(!android) browser.windows.onFocusChanged.removeListener(onwinfocus);
			browser.tabs.onActivated.removeListener(ontabfocus);
			browser.tabs.onMoved.removeListener(ontabmove);
			browser.tabs.onAttached.removeListener(ontabmove);
			browser.tabs.onRemoved.removeListener(ontabremove);}
	};
	
	//Public methods
	this.setmode = function(val){
		this.mode = parseInt(val);
		this.updateicon();
		this.updatebadge();
		browser.storage.local.set({mode: this.mode});
	};
	
	this.setoptions = function(obj){
		for(var prop in obj) this.options[prop] = obj[prop];
		this.updatebadge();
		browser.storage.local.set({options: this.options});
	};
	
	this.open = function(){
		if(this.tab) focustab(this.tab);
		else browser.tabs.create({url: "/settings/index.html"},createtab);
		//Firefox Android issue with browserAction popup and Settings page
		if(android) setTimeout(function(){focustab(self.tab)},500);
	};
	
	this.close = function(){
		if(this.tab) browser.tabs.remove(this.tab.id);
	};
	
	//Sends data synchronously to Settings page
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
	
	//Updates browserAction icon
	//Note: No Firefox Android support
	this.updateicon = function(){
		var actionbtn = {
			1: {title: "Normal", icon: "icon-normal.png", color: "#32BC10"},
			2: {title: "Confirm", icon: "icon-confirm.png", color: "orange"},
			3: {title: "Blocking", icon: "icon-blocking.png", color: "red"}
		};
		browser.browserAction.setTitle({title: "PopupFilter ("+actionbtn[this.mode].title+")"});
		if(!android){
			browser.browserAction.setIcon({path: "/images/"+actionbtn[this.mode].icon});
			browser.browserAction.setBadgeBackgroundColor({color: actionbtn[this.mode].color});}
	};
	
	//Updates browserAction badge
	//Note: No Firefox Android support
	this.updatebadge = function(){
		if(!android){
			var badge = this.options.showbadge && tabhistory.getAll({mode: this.mode}).length || "";
			browser.browserAction.setBadgeText({text: badge.toString()});}
	}
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

//Tab open
//Note: Firefox not firing on previous session restore
browser.tabs.onCreated.addListener(function(tab){
	var info = syncpopup.remove(function(val){
		return (val.tabId==tab.id);
	});
	if(info) preventpopup(tab,info);
	else tabhistory.set(tab);
	settings.updatebadge();
	settings.send();
});

//Popup open
//Note: Firefox Android not firing with links
//Note: Chrome doesn't support info.windowId
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
		return {cancel: (tab && tab.mode==3)};
	},
	{urls: ["<all_urls>"], types: ["main_frame"]},
	["blocking"]
);

//Tab update
browser.tabs.onUpdated.addListener(function(tabid,info,tab){
	var val = tabhistory.get(tab.id);
	if(!val || val.mode==1){
		tabhistory.set(tab);
		settings.updatebadge();
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
		settings.updatebadge();
		settings.send();}
});

//Script communication with content scripts
//Note: Port.onDisconnect not triggered on window close on Firefox
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
		focustab(tabhistory.get(info.sourceTabId));
	break;
	case 3 : //Foreground focus
		if(!android) browser.windows.update(info.windowId,{focused: true});
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
	case 1 : //Normal Mode
	break;
	case 2 : //Confirm Mode
		redirectconfirm(info);
	break;
	case 3 : //Blocking Mode
		closetab(tab);
	break;}
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
			case "mode" : settings.setmode(msg.mode);
			break;
			case "options" : settings.setoptions(msg.options);
			break;
			case "open" :
				tabhistory.set({id: msg.tab.id, mode: 1});
				browser.tabs.update(msg.tab.id,{url: msg.tab.url});
			break;
			case "close" : closetab(msg.tab);
			break;
			case "restore" :
				tabhistory.remove(msg.tab.id);
				browser.tabs.create({url: msg.tab.url, active: false});
			break;
			case "clear" :
				tabhistory.clear();
				settings.updatebadge();
			break;}
			portcon.send(["popup","settings"]);
		}
	});
	portcon.send(["popup","settings"]);
}
