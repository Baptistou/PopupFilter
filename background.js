/* -------------------- Classes -------------------- */

function PortConnect(){
	//Variables
	this.data = [];
	var self = this;
	var count = 1;
	
	//Public methods
	this.connect = function(obj){
		var id = count++;
		this.data.push({
			id: id,
			port: obj.port,
			msgpost: obj.msgpost,
			disconnect: obj.disconnect
		});
		if(obj.msgget) obj.port.onMessage.addListener(obj.msgget);
		obj.port.onDisconnect.addListener(function(){
			if(obj.disconnect) obj.disconnect();
			self.data.remove(val => (val.id==id));
		});
	};
	
	this.send = function(list,message = null){
		this.data.removeAll(function(val){
			try{
				if(list.contains(val.port.name)){
					if(message) val.port.postMessage(message);
					else if(val.msgpost) val.port.postMessage(val.msgpost());
					else val.port.postMessage();}
				return false;}
			catch(error){
				if(val.disconnect) val.disconnect();
				return true;}
		});
	};
}

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
		return this.data.find(val => (val.id==tabid));
	};
	
	this.getAll = function(obj){
		return this.data.filter(val => objcontains(val,obj));
	};
	
	this.set = function(obj){
		if(obj.id!=browser.tabs.TAB_ID_NONE){
			var val = this.get(obj.id);
			if(!val){
				obj.mode = obj.mode || 1;
				this.data.push(obj);}
			else for(var prop in obj) val[prop] = obj[prop];}
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
		self.data.removeAll(val1 => (val1.mode==1 && !list.find(val2 => (val1.id==val2.id))));
	};
	
	this.remove = function(tabid){
		return this.data.remove(val => (val.id==tabid));
	};
	
	this.clear = function(tabid){
		this.data.removeAll(function(val){
			if(val.mode==2) closetab(val);
			return (val.mode==2 || val.mode==3);
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
			applycsp: (self.options.applycsp!=false),
			showbadge: (!ANDROID && self.options.showbadge!=false)
		};
		self.updatebutton();
		self.updatebadge();
	});
	
	//Private methods
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
			if(!ANDROID) browser.windows.onFocusChanged.removeListener(onwinfocus);
			browser.tabs.onActivated.removeListener(ontabfocus);
			browser.tabs.onMoved.removeListener(ontabmove);
			browser.tabs.onAttached.removeListener(ontabmove);
			browser.tabs.onRemoved.removeListener(ontabremove);
			self.tab = null;
			self.focus = false;}
	};
	
	//Public methods
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
	
	this.settab = function(tab){
		if(!self.tab){
			if(!ANDROID) browser.windows.onFocusChanged.addListener(onwinfocus);
			browser.tabs.onActivated.addListener(ontabfocus);
			browser.tabs.onMoved.addListener(ontabmove);
			browser.tabs.onAttached.addListener(ontabmove);
			browser.tabs.onRemoved.addListener(ontabremove);}
		else if(self.tab.id!=tab.id) closetab(self.tab);
		self.tab = tab;
		self.focus = true;
	};
	
	//Opens Settings page
	//Note: openOptionsPage() issue on Firefox and Opera + no Firefox Android support.
	//Note: Firefox Android 58- issue with browserAction popup focus
	this.open = function(){
		//browser.runtime.openOptionsPage();
		if(this.tab) focustab(this.tab);
		else opentab({url: "/settings/index.html", active: true},this.settab);
		if(ANDROID) setTimeout(function(){focustab(self.tab)},500);
	};
	
	//Closes Settings page
	this.close = function(){
		if(this.tab) ontabremove(this.tab.id);
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
	
	//Updates browserAction button
	//Note: No Firefox Android support for setIcon()
	this.updatebutton = function(){
		var actionbtn = {
			1: {title: "Normal", icon: "icon-normal.png", color: "#32BC10"},
			2: {title: "Confirm", icon: "icon-confirm.png", color: "orange"},
			3: {title: "Blocking", icon: "icon-blocking.png", color: "red"}
		};
		browser.browserAction.setTitle({title: "PopupFilter ("+actionbtn[this.mode].title+")"});
		if(!ANDROID){
			browser.browserAction.setIcon({path: "/images/"+actionbtn[this.mode].icon});
			browser.browserAction.setBadgeBackgroundColor({color: actionbtn[this.mode].color});}
	};
	
	//Updates browserAction badge
	//Note: No Firefox Android support for setBadgeText()
	this.updatebadge = function(){
		if(!ANDROID){
			var badge = this.options.showbadge && tabhistory.getAll({mode: this.mode}).length || "";
			browser.browserAction.setBadgeText({text: badge.toString()});}
	}
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
	settings.updatebadge();
	settings.send();
});

//Popup open
//Note: Firefox Android not firing with links
//Note: No Chrome support for info.windowId
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

//Prevents popups with Content Security Policy
//Note: Chromium PDF Viewer Plugin not working with CSP sandbox
var CSP_SANDBOX_NOPOPUPS = "sandbox allow-forms allow-orientation-lock allow-pointer-lock"
	+ "allow-presentation allow-same-origin allow-scripts allow-top-navigation;";
browser.webRequest.onHeadersReceived.addListener(
	function(info){
		if(settings.mode==3 && settings.options.applycsp &&
			!(CHROMIUM && info.responseHeaders.find(
				val => (val.name=="Content-Type" && val.value=="application/pdf")
			)))
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
//Note: Firefox Quantum not firing in some case
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
	case "settings" : settings.settab(port.sender.tab);
	case "popup" : settingscon(port);
	break;}
});

/* -------------------- Functions -------------------- */

//Redirects to confirm page
//Note: Chrome and Opera don't redirect in private mode
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
				opentab({url: msg.tab.url, index: "next", active: false});
			break;
			case "clear" :
				tabhistory.clear();
				settings.updatebadge();
			break;}
			portcon.send(["popup","settings"]);
		},
		disconnect: function(){
			if(port.name=="settings") settings.close();
		}
	});
	portcon.send(["popup","settings"]);
}
