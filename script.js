/* -------------------- Prototypes -------------------- */

//Returns true if string contains str
String.prototype.contains = function(str){
	return (this.indexOf(str)>=0);
};

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
Array.prototype.removeif = function(callback){
	var list = [], index;
	do{
		index = this.findIndex(callback);
		if(index>=0) list.push(this.splice(index,1)[0]);
	}while(index>=0);
	return list;
};

/* -------------------- Classes -------------------- */

function TabHistory(){
	this.data = [];
	var equals = function(val,obj){
		return ((obj.id?obj.id==val.id:true)
				&& (obj.url?obj.url==val.url:true)
				&& (obj.status?obj.status==val.status:true));
	};
	
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
		if(!val)
			this.data.push({
				id: obj.id,
				url: obj.url,
				status: obj.status
			});
		else if(obj.url) val.url = obj.url;
		else if(obj.status) val.status = obj.status;
	};
	
	this.update = function(list){
		for(var i=0; i<list.length; i++){
			var val = this.data.find(function(val){
				return (val.id==list[i].id);
			});
			if(!val){
				this.data.push({
					id: list[i].id,
					url: list[i].url,
					win: list[i].windowId,
					pos: list[i].index,
					status: 1
				});}
			else{
				if(val.status==1) val.url = list[i].url;
				val.win = list[i].windowId;
				val.pos = list[i].index;}}
		this.data = this.data.sort(function(val1,val2){
			if(!val1.win || !val2.win) return val1.id-val2.id;
			else if(val1.win!=val2.win) return val1.win-val2.win;
			else return val1.pos-val2.pos;
		});
	};
	
	this.remove = function(tabid){
		return this.data.removeif(function(val){
			return (val.id==tabid);
		});
	};
	
	this.clear = function(tabid){
		this.data.removeif(function(val){
			if(val.status==2) browser.tabs.remove(val.id);
			return (val.status==2 || val.status==3);
		});
	};
}

function PortConnect(){
	this.data = [];
	var self = this;
	
	this.connect = function(obj){
		this.data.push({
			port: obj.port,
			msgpost: obj.msgpost
		});
		obj.port.onMessage.addListener(obj.msgget);
		obj.port.onDisconnect.addListener(function(){
			self.data.removeif(function(val){
				return (val.port.name==obj.port.name);
			});
		});
	};
	
	this.send = function(namelist){
		var list = this.data.findAll(function(val){
			return namelist.contains(val.port.name);
		});
		for(var i=0; i<list.length; i++){
			list[i].port.postMessage(list[i].msgpost());}
	};
}

/* -------------------- Main Process -------------------- */

//Chrome compatibility
var browser = browser || chrome;

//Global variables
var tabhistory = new TabHistory();
var portcon = new PortConnect();
var settings = browser.tabs.Tab;
var option=1;

//Chrome compatibility
if(chrome) tabhistory.set({id: -1, status: -1});

//Retrieves data from local storage
browser.storage.local.get(function(storage){
	if(storage.option) option = storage.option;
});

//Tab creation
browser.webNavigation.onCreatedNavigationTarget.addListener(function(info){
	tabhistory.set({
		id: info.tabId,
		url: info.url,
		status: option
	});
	switch(option){
	case 1 : 
	break;
	case 2 : browser.tabs.update(info.tabId,{url: "/confirm/index.html#"+info.tabId});
	break;
	case 3 : browser.tabs.remove(info.tabId);
	break;}
});

//HTTP request
browser.webRequest.onBeforeRequest.addListener(
	function(info){
		if(!tabhistory.contains({id: info.tabId}) || tabhistory.contains({id: info.tabId, status: 1}))
			tabhistory.set({
				id: info.tabId,
				url: info.url,
				status: 1
			});
		portcon.send(["popup","settings"]);
	},
	{urls: ["<all_urls>"], types: ["main_frame"]}
);

//Window focus change
browser.windows.onFocusChanged.addListener(function(winid){
	if(settings) updatehistory();
});

//Tab focus change
browser.tabs.onActivated.addListener(function(info){
	if(settings && settings.id==info.tabId) updatehistory();
});

//Tab move
browser.tabs.onMoved.addListener(function(tabid){
	if(settings && settings.id==tabid) updatehistory();
});

//Tab deletion
browser.tabs.onRemoved.addListener(function(tabid,info){
	if(tabhistory.contains({id: tabid, status: 1})) tabhistory.remove(tabid);
	if(tabhistory.contains({id: tabid, status: 2})) tabhistory.set({id: tabid, status: 3});
	if(settings && settings.id==tabid) settings = null;
	portcon.send(["popup","settings"]);
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

//Updates tab history and send info to ports
function updatehistory(){
	browser.tabs.query({},function(tabs){
		tabhistory.update(tabs);
		portcon.send(["popup","settings"]);
	});
}

//Connects to confirm script
function confirmcon(port){
	portcon.connect({
		port: port,
		msgpost: function(){
			return {tab: tabhistory.get({id: port.sender.tab.id})[0]};
		},
		msgget: function(msg){
			tabhistory.set({id: port.sender.tab.id, status: msg.status});
		}
	});
	portcon.send(["confirm"]);
}

//Connects to popup and settings scripts
function settingscon(port){
	portcon.connect({
		port: port,
		msgpost: function(){return {
			option: option,
			opentabs: tabhistory.get({status: 1}),
			confirmtabs: tabhistory.get({status: 2}),
			closetabs: tabhistory.get({status: 3})
		}},
		msgget: function(msg){
			switch(msg.status){
			case "option" :
				option = parseInt(msg.option);
				browser.storage.local.set({option: option});
			break;
			case "settings" :
				if(settings){
					browser.windows.update(settings.windowId,{focused: true});
					browser.tabs.update(settings.id,{active: true});}
				else browser.tabs.create({url: "/settings/index.html"},function(tab){settings = tab;});
			break;
			case "open" : tabhistory.set({id: msg.tabid, status: 1});
			break;
			case "restore" : tabhistory.remove(msg.tabid);
			break;
			case "clear" : tabhistory.clear();
			break;}
			portcon.send(["popup","settings"]);
		}
	});
	portcon.send(["popup","settings"]);
}
