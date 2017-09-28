/* -------------------- Main Process -------------------- */

//Browser compatibility
var browser = browser || chrome;
var android = !browser.windows;

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "settings"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbclose").textContent = msg.closetabs.length;
		tabstohtml("opentabs",msg.opentabs,[closebtn]);
		tabstohtml("confirmtabs",msg.confirmtabs,[openbtn,closebtn]);
		tabstohtml("closetabs",msg.closetabs,[restorebtn]);
		document.getElementById("mode"+msg.mode).checked = true;
		document.getElementById("popupfocus"+msg.options.popupfocus).checked = true;
		seticon(msg.mode);
	});
	
	//Shows sections
	var showsection = function(){
		var section = document.getElementById(this.id.replace("nav-",""));
		hideElements(document.querySelectorAll("section"));
		showElement(section);
		removeClass(document.querySelector("nav a.active"),"active");
		addClass(this,"active");
	};
	document.getElementById("nav-overview").onclick = showsection;
	document.getElementById("nav-settings").onclick = showsection;
	
	//Accordion menu
	var menu = document.querySelectorAll("dl.accordion>dt");
	for(var i=0; i<menu.length; i++)
		menu[i].onclick = function(){
			this.className = (this.className=="")?"active":"";
		};
	
	//About
	document.getElementById("version").textContent = browser.runtime.getManifest().version;
	
	//Modes
	var radiobox = document.getElementsByName("mode");
	for(var i=0; i<radiobox.length; i++)
		radiobox[i].onchange = function(){
			port.postMessage({status: "mode", mode: parseInt(this.value)});
		};
	
	//Options
	radiobox = document.getElementsByName("popupfocus");
	for(var i=0; i<radiobox.length; i++)
		radiobox[i].onchange = function(){
			port.postMessage({status: "options", options: {popupfocus: parseInt(this.value)}});
		};
	
	//Clears history
	document.getElementById("clear").onclick = function(){
		port.postMessage({status: "clear"});
	};
	
	//Closes settings page
	document.getElementById("close").onclick = function(){
		browser.tabs.getCurrent(function(tab){
			browser.tabs.remove(tab.id);
		});
	};
};

//Disconnects port
window.onunload = function(){
	port.disconnect();
};

/* -------------------- Functions -------------------- */

//Action buttons
var openbtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-true";
	button.title = "Display";
	button.onclick = function(){
		port.postMessage({status: "open", tab: tab});
	};
	return button;
};
var closebtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-false";
	button.title = "Close";
	button.onclick = function(){
		port.postMessage({status: "close", tab: tab});
	};
	return button;
};
var restorebtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-reset";
	button.title = "Restore";
	button.onclick = function(){
		port.postMessage({status: "restore", tab: tab});
	};
	return button;
};

//Converts tab list to html into table
function tabstohtml(target,tablist,actionbtns = []){
	var table = document.getElementById(target);
	table.innerHTML = "";
	for(var i=0; i<tablist.length; i++){
		let tab = tablist[i];
		var row = document.createElement("tr");
		var col = document.createElement("td");
		col.title = tab.url;
		col.textContent = tab.url;
		col.ondblclick = function(){
			if(!android) browser.windows.update(tab.windowId,{focused: true});
			browser.tabs.update(tab.id,{active: true});
		};
		row.appendChild(col);
		col = document.createElement("td");
		actionbtns.forEach(function(button){col.appendChild(button(tab))});
		row.appendChild(col);
		table.appendChild(row);}
}

//Changes icon according to mode
function seticon(mode){
	var icons = {
		1: "/images/icon-normal.png",
		2: "/images/icon-confirm.png",
		3: "/images/icon-blocking.png"
	};
	document.getElementById("icon").src = icons[mode];
}
