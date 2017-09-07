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
	var list = [], index;
	do{
		index = this.findIndex(callback);
		if(index>=0) list.push(this.splice(index,1)[0]);
	}while(index>=0);
	return list;
};

/* -------------------- Classes -------------------- */

function TabHistory(){
	//Variables
	this.data = [{id: -1, status: -1}]; //Chrome compatibility
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
	
	//Public methods
	this.contains = function(obj){
		return !!this.data.find(function(val){
			return equals(val,obj);
		});
	};
	
	this.get = function(obj){
		return this.data.findAll(function(val){
			return equals(val,obj);
		});
	};
	
	this.set = function(obj){
		var val = this.data.find(function(val){
			return (val.id==obj.id);
		});
		if(val){
			for(var prop in obj) val[prop] = obj[prop];}
		else this.data.push(obj);
	};
	
	this.update = function(list){
		for(var i=0; i<list.length; i++){
			var val = this.data.find(function(val){
				return (val.id==list[i].id);
			});
			if(val){
				if(val.status==1) val.url = list[i].url;
				val.win = list[i].windowId;
				val.pos = list[i].index;}
			else this.data.push({
					id: list[i].id,
					url: list[i].url,
					win: list[i].windowId,
					pos: list[i].index,
					status: 1
				});}
		this.data = this.data.sort(function(val1,val2){
			if(!val1.win || !val2.win) return val1.id-val2.id;
			else if(val1.win!=val2.win) return val1.win-val2.win;
			else return val1.pos-val2.pos;
		});
	};
	
	this.remove = function(tabid){
		return this.data.removeIf(function(val){
			return (val.id==tabid);
		});
	};
	
	this.clear = function(tabid){
		this.data.removeIf(function(val){
			if(val.status==2) browser.tabs.remove(val.id);
			return (val.status==2 || val.status==3);
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
		var list = this.data.findAll(function(val){
			return namelist.contains(val.port.name);
		});
		for(var i=0; i<list.length; i++) list[i].port.postMessage(list[i].msgpost());
	};
}

function Settings(){
	//Variables
	this.mode = 1;
	this.options = {};
	this.tab = null;
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
		if(browser.windows) browser.windows.onFocusChanged.addListener(focuswin);
		browser.tabs.onActivated.addListener(focustab);
		browser.tabs.onMoved.addListener(movetab);
		browser.tabs.onRemoved.addListener(removetab);
	};
	
	var focuswin = function(winid){
		if(self.tab && self.tab.active && self.tab.windowId==winid) self.update();
	};
	
	var focustab = function(info){
		if(self.tab && self.tab.id==info.tabId) self.update();
	};
	
	var movetab = function(tabid){
		if(self.tab && self.tab.id==tabid) self.update();
	};
	
	var removetab = function(tabid){
		if(self.tab && self.tab.id==tabid){
			self.tab = null;
			if(browser.windows) browser.windows.onFocusChanged.removeListener(focuswin);
			browser.tabs.onActivated.removeListener(focustab);
			browser.tabs.onMoved.removeListener(movetab);
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
			if(browser.windows) browser.windows.update(this.tab.windowId,{focused: true});
			browser.tabs.update(this.tab.id,{active: true});}
		else browser.tabs.create({url: "/settings/index.html", active: true},createtab);
	};
	
	this.close = function(){
		if(this.tab) browser.tabs.remove(this.tab.id);
	};
	
	this.update = function(){
		if(timeout) clearTimeout(timeout);
		timeout = setTimeout(function(){
			browser.tabs.query({},function(tabs){
				tabhistory.update(tabs);
				if(self.tab) settings.tab = tabs.find(function(val){
					return (val.id==self.tab.id);
				});
				portcon.send(["popup","settings"]);
			});
			timeout = null;
		},500);
	};
}

/* -------------------- Main Process -------------------- */

//Chrome compatibility
var browser = browser || chrome;

//Global variables
var tabhistory = new TabHistory();
var portcon = new PortConnect();
var settings = new Settings();

//Tab creation
//Note: Firefox Android not firing with links
browser.webNavigation.onCreatedNavigationTarget.addListener(function(info){
	tabhistory.set({
		id: info.tabId,
		url: info.url,
		status: settings.mode
	});
	switch(settings.mode){
	case 1 : //Do nothing
	break;
	case 2 :
		redirectconfirm(info);
		updatebadge();
	break;
	case 3 :
		closetab(info.tabId);
		updatebadge();
	break;}
});

//HTTP request
browser.webRequest.onBeforeRequest.addListener(
	function(info){
		if(settings.tab && (!tabhistory.contains({id: info.tabId}) || tabhistory.contains({id: info.tabId, status: 1}))){
			tabhistory.set({
				id: info.tabId,
				url: info.url,
				status: 1
			});
			portcon.send(["popup","settings"]);}
	},
	{urls: ["<all_urls>"], types: ["main_frame"]}
);

//Tab close
browser.tabs.onRemoved.addListener(function(tabid){
	if(tabhistory.contains({id: tabid, status: 1})) tabhistory.remove(tabid);
	if(tabhistory.contains({id: tabid, status: 2})) tabhistory.set({id: tabid, status: 3});
	portcon.send(["popup","settings"]);
	updatebadge();
});

//Script communication with content scripts
browser.runtime.onConnect.addListener(function(port){
	switch(port.name){
	case "confirm" : confirmcon(port);
	break;
	case "popup" :
	case "settings" :
		browser.tabs.query({},function(tabs){
			tabhistory.update(tabs);
			settingscon(port);
		});
	break;}
});

/* -------------------- Functions -------------------- */

//Redirects to confirm page
function redirectconfirm(info){
	var url = "/confirm/index.html#"+info.tabId;
	switch(settings.options.popupfocus){
	case 1 : browser.tabs.update(info.tabId,{url: url});
	break;
	case 2 :
		browser.tabs.update(info.tabId,{url: url, active: false});
		if(browser.windows)
			browser.tabs.get(info.sourceTabId,function(tab){
				browser.windows.update(tab.windowId,{focused: true});
			});
		browser.tabs.update(info.sourceTabId,{active: true});
	break;
	case 3 :
		if(browser.windows) browser.windows.update(info.windowId,{focused: true});
		browser.tabs.update(info.tabId,{url: url, active: true});
	break;}
}

//Closes specified tab and its window
//Note: about:config --> browser.tabs.closeWindowWithLastTab
function closetab(tabid){
	browser.tabs.get(tabid,function(tab){
		if(browser.windows)
			browser.windows.get(tab.windowId,{populate: true},function(window){
				if(window.tabs.length<=1) browser.windows.remove(window.id);
				else browser.tabs.remove(tab.id);
			});
		else browser.tabs.remove(tab.id);
	});
}

//Updates browserAction icon (No Firefox Android support)
function updateicon(mode){
	if(browser.windows){
		var icons = {
			1: "/images/icon-normal.png",
			2: "/images/icon-confirm.png",
			3: "/images/icon-blocking.png"
		};
		var colors = {1: "", 2: "orange", 3: "red"};
		browser.browserAction.setIcon({path: icons[mode]});
		browser.browserAction.setBadgeBackgroundColor({color: colors[mode]});}
};

//Updates browserAction badge (No Firefox Android support)
function updatebadge(){
	if(browser.windows){
		if(settings.mode!=1){
			var badge = (tabhistory.get({status: settings.mode}).length || "").toString();
			browser.browserAction.setBadgeText({text: badge});}
		else browser.browserAction.setBadgeText({text: ""});}
}

//Connects to confirm script
function confirmcon(port){
	var tab = tabhistory.get({id: port.sender.tab.id})[0];
	portcon.connect({
		port: port,
		msgpost: function(){
			return {tab: tab};
		},
		msgget: function(msg){
			switch(msg.status){
			case "open" :
				tabhistory.set({id: tab.id, status: 1});
				browser.tabs.update(tab.id,{url: tab.url});
				updatebadge();
			break;
			case "close" :
				tabhistory.set({id: tab.id, status: 3});
				closetab(tab.id);
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
			opentabs: tabhistory.get({status: 1}),
			confirmtabs: tabhistory.get({status: 2}),
			closetabs: tabhistory.get({status: 3}),
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
				tabhistory.set({id: msg.tab.id, status: 1});
				browser.tabs.update(msg.tab.id,{url: msg.tab.url});
				updatebadge();
			break;
			case "close" : closetab(msg.tab.id);
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
