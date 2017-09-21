/* -------------------- Prototypes -------------------- */

//Returns true if array contains val
Array.prototype.contains = function(val){
	return (this.indexOf(val)>=0);
};

//Returns element list contained into array
Array.prototype.findAll = function(callback){
	var list = [];
	for(var i=0; i<this.length; i++){
		if(callback(this[i])) list.push(this[i]);}
	return list;
};

//Removes element if condition is true
Array.prototype.removeIf = function(callback){
	var list = [];
	for(var i=0; i<this.length; i++){
		if(callback(this[i])) list.push(this.splice(i--,1)[0]);}
	return list;
};

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
	var equals = function(val,obj){
		for(var prop in obj){
			if(val[prop]!=obj[prop]) return false;}
		return true;
	};
	
	var sortbyindex = function(val1,val2){
		if(val1.windowId==val2.windowId) return val1.index-val2.index;
		else return val1.windowId-val2.windowId;
	};
	
	//Public methods
	this.contains = function(obj){
		return !!this.data.find(function(val){
			return equals(val,obj);
		});
	};
	
	this.get = function(tabid){
		return this.data.find(function(val){
			return (val.id==tabid);
		});
	};
	
	this.getAll = function(obj){
		return this.data.findAll(function(val){
			return equals(val,obj);
		});
	};
	
	this.set = function(obj){
		var val = this.get(obj.id);
		if(!val){
			obj.mode = obj.mode || 1;
			this.data.push(obj);}
		else for(var prop in obj) val[prop] = obj[prop];
		this.data.sort(sortbyindex);
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
		this.data.sort(sortbyindex);
	};
	
	this.remove = function(tabid){
		this.data.removeIf(function(val){
			return (val.id==tabid);
		});
	};
	
	this.clear = function(tabid){
		this.data.removeIf(function(val){
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
			self.data.removeIf(function(val){
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
		if(!android) browser.windows.onFocusChanged.addListener(focuswin);
		browser.tabs.onActivated.addListener(focustab);
		browser.tabs.onMoved.addListener(movetab);
		browser.tabs.onAttached.addListener(movetab);
		browser.tabs.onRemoved.addListener(removetab);
	};
	
	var focuswin = function(winid){
		self.focus = (self.tab.active && self.tab.windowId==winid);
		if(self.sync) self.send();
	};
	
	var focustab = function(info){
		self.focus = self.tab.active = (self.tab.id==info.tabId);
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
		setTimeout(function(){browser.tabs.update(self.tab.id,{active: true})},500);
	};
	
	this.close = function(){
		if(this.tab) browser.tabs.remove(this.tab.id);
	};
	
	this.send = function(){
		if(this.focus){
			if(timeout) clearTimeout(timeout);
			timeout = setTimeout(function(){
				portcon.send(["popup","settings"]);
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

//Popup open
//Note: Firefox Android not firing with links
//Note: Chrome doesn't support info.windowId
browser.webNavigation.onCreatedNavigationTarget.addListener(function(info){
	browser.tabs.get(info.tabId,function(tab){
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
		settings.send();
	});
});

//Tab open
browser.tabs.onCreated.addListener(function(tab){
	if(!tabhistory.get(tab.id)){
		tabhistory.set(tab);
		settings.send();}
});

//Tab update
browser.tabs.onUpdated.addListener(function(tabid,info,tab){
	if(tabhistory.contains({id: tabid, mode: 1})){
		tabhistory.set(tab);
		settings.send();}
});

//Tab move within a window
browser.tabs.onMoved.addListener(function(tabid,info){
	browser.tabs.query({},function(tabs){
		tabhistory.update(tabs);
		settings.send();
	});
	
});

//Tab move between windows
browser.tabs.onAttached.addListener(function(tabid,info){
	browser.tabs.query({},function(tabs){
		tabhistory.update(tabs);
		settings.send();
	});
});

//Tab close
browser.tabs.onRemoved.addListener(function(tabid,info){
	if(tabhistory.contains({id: tabid, mode: 1})) tabhistory.remove(tabid);
	if(tabhistory.contains({id: tabid, mode: 2})) tabhistory.set({id: tabid, mode: 3});
	settings.send();
	updatebadge();
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
		if(settings.mode!=1){
			var badge = (tabhistory.getAll({mode: settings.mode}).length || "").toString();
			browser.browserAction.setBadgeText({text: badge});}
		else browser.browserAction.setBadgeText({text: ""});}
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

//Connects to popup and settings scripts
function settingscon(port){
	portcon.connect({
		port: port,
		msgpost: function(){return {
			opentabs: tabhistory.getAll({mode: 1}),
			confirmtabs: tabhistory.getAll({mode: 2}),
			closetabs: tabhistory.getAll({mode: 3}),
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
