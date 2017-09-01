/* -------------------- Main Process -------------------- */

//Chrome compatibility
var browser = browser || chrome;

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "settings"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("opt"+msg.option).checked = true;
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbclose").textContent = msg.closetabs.length;
		tabstohtml(document.getElementById("opentabs"),msg.opentabs,[closebtn]);
		tabstohtml(document.getElementById("confirmtabs"),msg.confirmtabs,[openbtn,closebtn]);
		tabstohtml(document.getElementById("closetabs"),msg.closetabs,[restorebtn]);
	});
	
	//Radio boxes
	var radiobox = document.getElementsByName("option");
	for(var i=0; i<radiobox.length; i++){
		radiobox[i].onchange = function(){
			port.postMessage({status: "option", option: this.value});
		};
	}
	
	//Accordion menu
	var menu = document.querySelectorAll("dl.accordion>dt");
	for(var i=0; i<menu.length; i++){
		menu[i].onclick = function(){
			if(this.className=="active") this.className = "";
			else this.className = "active";
		};
	}
	
	//Clears history
	document.getElementById("clear").onclick = function(){
		browser.tabs.getCurrent(function(tab){
			port.postMessage({status: "clear"});
		});
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
		port.postMessage({status: "open", tabid: tab.id});
		browser.tabs.update(tab.id,{url: tab.url});
	};
	return button;
};
var closebtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-false";
	button.title = "Close";
	button.onclick = function(){
		browser.tabs.remove(tab.id);
	};
	return button;
};
var restorebtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-reset";
	button.title = "Restore";
	button.onclick = function(){
		port.postMessage({status: "restore", tabid: tab.id});
		browser.tabs.create({url: tab.url, active: false});
	};
	return button;
};

//Converts tab list to html into table
function tabstohtml(table,tablist,actionbtn){
	table.innerHTML = "";
	for(var i=0; i<tablist.length; i++){
		let tab = tablist[i];
		var row = document.createElement("tr");
		var col = document.createElement("td");
		col.title = tab.url;
		col.textContent = tab.url;
		col.ondblclick = function(){
			browser.windows.update(tab.win,{focused: true});
			browser.tabs.update(tab.id,{active: true});
		};
		row.appendChild(col);
		col = document.createElement("td");
		for(var j=0; j<actionbtn.length; j++) col.appendChild(actionbtn[j](tablist[i]));
		row.appendChild(col);
		table.appendChild(row);}
}