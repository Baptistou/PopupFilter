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

function Settings(){
	//Variables
	this.tab = null;
	this.mode = 1;
	var self = this;
	
	//Retrieves data from local storage
	browser.storage.local.get(function(storage){
		self.mode = storage.mode || 1;
		seticon(self.mode);
	});
	
	//Public methods
	this.setmode = function(val){
		this.mode = parseInt(val);
		browser.storage.local.set({mode: this.mode});
		seticon(this.mode);
	};
	
	this.showtab = function(){
		if(this.tab){
			if(browser.windows) browser.windows.update(this.tab.windowId,{focused: true});
			browser.tabs.update(this.tab.id,{active: true});}
		else browser.tabs.create({url: "/settings/index.html"},function(tab){self.tab = tab;});
	};
	
	this.update = function(tabs){
		if(this.tab) settings.tab = tabs.find(function(val){
			return (val.id==self.tab.id);
		});
	};
	
	//Private methods
	//Icon dynamic change (No Firefox Android support)
	var seticon = function(mode){
		if(browser.windows){
			var icons = {
				1: "/images/icon-normal.png",
				2: "/images/icon-confirm.png",
				3: "/images/icon-blocking.png"
			};
			var colors = {1: "", 2: "#EADA09", 3: "red"};
			browser.browserAction.setIcon({path: icons[mode]});
			browser.browserAction.setBadgeBackgroundColor({color: colors[mode]});}
	};
}

function TabHistory(){
	//Variables
	this.data = [{id: -1, status: -1}]; //Chrome compatibility
	var self = this;
	
	//Retrieves tab list
	browser.tabs.query({},function(tabs){
		self.update(tabs);
	});
	
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
	
	//Private methods
	var equals = function(val,obj){
		for(var prop in obj){
			if(val[prop]!=obj[prop]) return false;}
		return true;
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

/* -------------------- Main Process -------------------- */

//Chrome compatibility
var browser = browser || chrome;

//Global variables
var tabhistory = new TabHistory();
var portcon = new PortConnect();
var settings = new Settings();
var timeout = null;

//Tab creation
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
		browser.tabs.update(info.tabId,{url: "/confirm/index.html#"+info.tabId});
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

//Window focus change
if(browser.windows) browser.windows.onFocusChanged.addListener(function(winid){
	if(settings.tab && settings.tab.active && settings.tab.windowId==winid) updatehistory();
});

//Tab focus change
browser.tabs.onActivated.addListener(function(info){
	if(settings.tab && settings.tab.id==info.tabId) updatehistory();
});

//Tab move
browser.tabs.onMoved.addListener(function(tabid){
	if(settings.tab && settings.tab.id==tabid) updatehistory();
});

//Tab deletion
browser.tabs.onRemoved.addListener(function(tabid,info){
	if(tabhistory.contains({id: tabid, status: 1})) tabhistory.remove(tabid);
	if(tabhistory.contains({id: tabid, status: 2})) tabhistory.set({id: tabid, status: 3});
	if(settings.tab && settings.tab.id==tabid) settings.tab = null;
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

//Closes specified tab and its window
//about:config --> browser.tabs.closeWindowWithLastTab
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

//Updates tab history and send info to ports
function updatehistory(){
	if(timeout) clearTimeout(timeout);
	timeout = setTimeout(function(){
		browser.tabs.query({},function(tabs){
			tabhistory.update(tabs);
			settings.update(tabs);
			portcon.send(["popup","settings"]);
		});
		timeout = null;
	},500);
}

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
			mode: settings.mode
		}},
		msgget: function(msg){
			switch(msg.status){
			case "settings" : settings.showtab();
			break;
			case "mode" :
				settings.setmode(msg.mode);
				updatebadge();
			break;
			case "open" :
				tabhistory.set({id: msg.tab.id, status: 1});
				browser.tabs.update(msg.tab.id,{url: msg.tab.url});
				updatebadge();
			break;
			case "close" :
				tabhistory.set({id: msg.tab.id, status: 3});
				closetab(msg.tab.id);
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
