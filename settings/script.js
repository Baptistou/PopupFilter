/* -------------------- Main Process -------------------- */

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "settings"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("icon").src = geticon(msg.mode);
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbclose").textContent = msg.closetabs.length;
		tabstohtml("opentabs",msg.opentabs,[closebtn]);
		tabstohtml("confirmtabs",msg.confirmtabs,[openbtn,closebtn]);
		tabstohtml("closetabs",msg.closetabs,[restorebtn]);
		document.getElementById("mode"+msg.mode).checked = true;
		document.getElementById("popupfocus"+msg.options.popupfocus).checked = true;
		document.getElementById("applycsp"+(!msg.options.applycsp+1)).checked = true;
		document.getElementById("showbadge"+(!msg.options.showbadge+1)).checked = true;
	});
	
	//Sections
	document.getElementById("nav-overview").onclick = function(){showsection("overview")};
	document.getElementById("nav-settings").onclick = function(){showsection("settings")};
	
	//Accordion menu
	document.querySelectorAll("dl.accordion>dt").forEach(function(item){
		item.onclick = function(){this.className = (this.className)?"":"active";};
	});
	
	//About
	var manifest = browser.runtime.getManifest();
	document.getElementById("version").textContent = manifest.version;
	document.getElementById("author").textContent = manifest.author;
	document.getElementById("description").textContent = manifest.description;
	document.querySelectorAll("a.link[href]").forEach(function(link){
		link.onclick = function(event){
			event.preventDefault();
			opentab({url: this.href, index: "next", active: true});
		};
	});
	
	//Modes
	document.getElementsByName("mode").forEach(function(radiobox){
		radiobox.onchange = function(){
			port.postMessage({status: "mode", mode: parseInt(this.value)});
		};
	});
	
	//Options
	//Note: No Firefox Android support for setBadgeText()
	document.getElementsByName("popupfocus").forEach(function(radiobox){
		radiobox.onchange = function(){
			port.postMessage({status: "options", options: {popupfocus: parseInt(this.value)}});
		};
	});
	document.getElementsByName("applycsp").forEach(function(radiobox){
		radiobox.onchange = function(){
			port.postMessage({status: "options", options: {applycsp: (this.value=="true")}});
		};
	});
	document.getElementsByName("showbadge").forEach(function(radiobox){
		if(!ANDROID)
			radiobox.onchange = function(){
				port.postMessage({status: "options", options: {showbadge: (this.value=="true")}});
			};
		else radiobox.disabled = true;
	});
	
	//Footer
	document.getElementById("clear").onclick = function(){
		port.postMessage({status: "clear"});
	};
	document.getElementById("close").onclick = function(){
		browser.tabs.getCurrent(function(tab){closetab(tab)});
	};
	
	//Internationalization
	document.querySelectorAll("i18n, [data-i18n]").forEach(seti18ndata);
};

//Disconnects port
window.onunload = function(){
	port.disconnect();
};

/* -------------------- Functions -------------------- */

//Returns icon according to mode
function geticon(mode){
	switch(mode){
	case 1 : return "/images/icon-normal.png";
	case 2 : return "/images/icon-confirm.png";
	case 3 : return "/images/icon-blocking.png";}
}

//Shows sections
function showsection(target){
	hideElements(document.querySelectorAll("section"));
	showElement(document.getElementById(target));
	removeClass(document.querySelector("nav a.active"),"active");
	addClass(document.getElementById("nav-"+target),"active");
	window.scrollTo(0,0);
};

//Action buttons
var openbtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-true";
	button.title = geti18ndata("Display");
	button.onclick = function(){
		port.postMessage({status: "open", tab: tab});
	};
	return button;
};
var closebtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-false";
	button.title = geti18ndata("Close");
	button.onclick = function(){
		port.postMessage({status: "close", tab: tab});
	};
	return button;
};
var restorebtn = function(tab){
	var button = document.createElement("span");
	button.className = "icon-reset";
	button.title = geti18ndata("Restore");
	button.onclick = function(){
		port.postMessage({status: "restore", tab: tab});
	};
	return button;
};

//Counts and removes duplicate tabs
function countduplicates(tab,i,list){
	tab.count = 1;
	var j = list.findIndex(val => (val.url==tab.url));
	return (i==j || !list[j].count++);
};

//Gets tab favicon
//Note: No Firefox Android support for Tab.favIconUrl
function getfavicon(tab){
	var col = document.createElement("td");
	col.ondblclick = function(){focustab(tab)};
	if(ANDROID) hideElement(col);
	if(tab.favIconUrl){
		var img = document.createElement("img");
		img.className = "image top";
		img.src = tab.favIconUrl;
		col.appendChild(img);}
	if(tab.count>1){
		var span = document.createElement("span");
		span.className = "tabcount";
		span.textContent = tab.count;
		col.appendChild(span);}
	return col;
}

//Converts tab list to html into table
function tabstohtml(target,tablist,actionbtns){
	var table = document.getElementById(target);
	table.innerHTML = "";
	tablist.filter(countduplicates).forEach(function(tab){
		var row = document.createElement("tr");
		row.className = (tab.incognito)?"incognito":"";
		row.appendChild(getfavicon(tab));
		var col = document.createElement("td");
		col.title = tab.url;
		col.textContent = ((ANDROID && tab.count>1)?"("+tab.count+") ":"")+tab.url;
		col.ondblclick = function(){focustab(tab)};
		row.appendChild(col);
		col = document.createElement("td");
		actionbtns.forEach(function(button){col.appendChild(button(tab))});
		row.appendChild(col);
		table.appendChild(row);
	});
}
