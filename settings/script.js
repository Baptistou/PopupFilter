/* -------------------- PreProcess -------------------- */

//Global constants
const PORT_SETTINGS = "settings";
const BROWSERACTION_ICON = {
	1: "/images/icon-normal.png",
	2: "/images/icon-confirm.png",
	3: "/images/icon-blocking.png"
};

/* -------------------- Functions -------------------- */

//Action buttons
var displaytab = (tab) => port.postMessage({status: "display", tab: tab});
var blocktab = (tab) => port.postMessage({status: "block", tab: tab});
var restoretab = (tab) => port.postMessage({status: "restore", tab: tab});

//Shows sections
function showsection(target){
	hideElementAll(document.querySelectorAll("section"));
	showElement(document.getElementById(target));
	removeClass(document.querySelector("nav a.link.active"),"active");
	addClass(document.querySelector("nav a.link[href='#"+target+"']"),"active");
	window.scrollTo(0,0);
}

//Counts and removes duplicate tabs
function countduplicates(group){
	var tab = group.value.first();
	tab.count = group.value.length;
	return tab;
}

//Sets tab favicon
//Note: No Firefox Android support for Tab.favIconUrl
function setfavicon(col,tab){
	var image = col.querySelector(".image");
	if(tab.favIconUrl) image.src = tab.favIconUrl;
	else removeElement(image);
	var span = col.querySelector(".tabcount");
	if(tab.count>1) span.textContent = tab.count;
	else hideElement(span);
}

//Converts tab to html from template
function tabtohtml(target,tab,actionbtns){
	var template = getTemplateById("tpl-"+target);
	var cols = template.querySelectorAll("td");
	template.querySelector("tr").className = (tab.incognito)? "incognito" : "";
	if(!ANDROID) setfavicon(cols[0],tab);
	else hideElement(cols[0]);
	cols[1].title = tab.url;
	cols[1].textContent = ((ANDROID && tab.count>1)? "("+tab.count+") " : "")+tab.url;
	cols[0].ondblclick =
	cols[1].ondblclick = function(){ focustab(tab) };
	cols[2].children.forEach(function(button,index){
		button.onclick = function(){ actionbtns[index](tab) };
	});
	return template;
}

//Converts tab list to html into table
function tablisttohtml(target,tablist,actionbtns){
	var table = document.getElementById(target);
	table.textContent = "";
	tablist
		.groupBy(val => val.url)
		.map(countduplicates)
		.forEach(function(tab){
			table.appendChild(tabtohtml(target,tab,actionbtns));
		});
}

/* -------------------- Main Process -------------------- */

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: PORT_SETTINGS});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("icon").src = BROWSERACTION_ICON[msg.mode];
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbblocked").textContent = msg.blockedtabs.length;
		tablisttohtml("opentabs",msg.opentabs,[closetab]);
		tablisttohtml("confirmtabs",msg.confirmtabs,[displaytab,blocktab]);
		tablisttohtml("blockedtabs",msg.blockedtabs,[restoretab]);
		document.getElementById("mode"+msg.mode).checked = true;
		document.getElementById("popupfocus"+msg.options.popupfocus).checked = true;
		document.getElementById("applycsp"+(!msg.options.applycsp+1)).checked = true;
		document.getElementById("showbadge"+(!msg.options.showbadge+1)).checked = true;
	});
	
	//Links
	document.querySelectorAll("a.link[href]").forEach(function(link){
		link.onclick = function(event){
			event.preventDefault();
			opentab({url: this.href, index: "next", active: true});
		};
	});
	document.querySelectorAll("nav a.link[href], a.navlink[href]").forEach(function(link){
		link.onclick = function(event){
			event.preventDefault();
			showsection(this.href.substring(this.href.indexOf("#")+1));
		};
	});
	
	//Accordion menu
	document.querySelectorAll("dl.accordion>dt").forEach(function(item){
		item.onclick = function(){ toggleClass(this,"active") };
	});
	
	//About
	var manifest = browser.runtime.getManifest();
	document.getElementById("version").textContent = manifest.version;
	document.getElementById("author").textContent = manifest.author;
	document.getElementById("description").textContent = manifest.description;
	
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
		browser.tabs.getCurrent(function(tab){ closetab(tab) });
	};
	
	//Internationalization
	document.querySelectorAll("i18n, [data-i18n]").forEach(seti18ndata);
	document.querySelectorAll("template").forEach(function(template){
		template.content.querySelectorAll("i18n, [data-i18n]").forEach(seti18ndata);
	});
};

/* -------------------- PostProcess -------------------- */

window.onunload = function(){
	//Disconnects port
	port.disconnect();
};
