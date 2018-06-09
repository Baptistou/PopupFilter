/* -------------------- PreProcess -------------------- */

//Global constants
const PORT_SETTINGS = "settings";
const URL_THEME = {1: "/themes/light.css", 2: "/themes/dark.css"};
const BROWSERACTION_ICON = {
	1: "/images/icon-normal.png",
	2: "/images/icon-confirm.png",
	3: "/images/icon-blocking.png"
};

/* -------------------- Functions -------------------- */

//Action buttons
var displaytab = (tab) => port.postMessage({status: "display_tab", tab: tab});
var blocktab = (tab) => port.postMessage({status: "block_tab", tab: tab});
var restoretab = (tab) => port.postMessage({status: "restore_tab", tab: tab});

//Shows sections
function showsection(target){
	hideElementAll(document.querySelectorAll("section"));
	showElement(document.getElementById(target));
	removeClass(document.querySelector("nav a.link.active"),"active");
	addClass(document.querySelector("nav a.link[href='#"+target+"']"),"active");
	window.scrollTo(0,0);
	port.postMessage({status: "ui", uistate: {section: target}});
}

//Sets navbar and external links
function setlinks(){
	document.querySelectorAll("a.link.ext[href]").forEach(function(link){
		link.onclick = function(event){
			event.preventDefault();
			opentab({url: this.href, index: "next", active: true});
		};
	});
	document.querySelectorAll("nav a.link[href], a.link.nav[href]").forEach(function(link){
		link.onclick = function(event){
			event.preventDefault();
			showsection(this.href.substring(this.href.indexOf("#")+1));
		};
	});
}

//Sets navbar action menu
function setactionmenu(){
	document.getElementById("toggle_action").onclick = function(){
		toggleElement(document.getElementById("action_menu"));
	};
	document.getElementById("toggle_action").onblur = function(){
		setTimeout(function(){ hideElement(document.getElementById("action_menu")) },200);
	};
	if(!ANDROID){
		document.getElementById("merge_windows").onclick = function(){ mergewindows() };
		document.getElementById("close_windows").onclick = function(){ closewindows() };}
	else{
		removeElement(document.getElementById("merge_windows").parentElement);
		removeElement(document.getElementById("close_windows").parentElement);}
	document.getElementById("remove_duplicates").onclick = function(){ port.postMessage({status: "remove_duplicates"}) };
	document.getElementById("display_all").onclick = function(){ port.postMessage({status: "display_all"}) };
	document.getElementById("block_all").onclick = function(){ port.postMessage({status: "block_all"}) };
	document.getElementById("restore_all").onclick = function(){ port.postMessage({status: "restore_all"}) };
	document.getElementById("clear").onclick = function(){ port.postMessage({status: "clear"}) };
	document.getElementById("close").onclick = function(){ browser.tabs.getCurrent(closetab) };
}

//Plays slideshow animation
function playslideshow(){
	document.querySelectorAll("ul.slideshow").forEach(function(slideshow){
		var shownextslide = function(){
			var item = slideshow.querySelector("li.active");
			var next = item.nextElementSibling || slideshow.querySelector("li");
			toggleClassAll([item,next],"active");
		};
		var timer = new Timer({
			func: shownextslide,
			delay: 10000,
			repeat: true,
			autostart: true
		});
		slideshow.onmouseover = function(){ timer.pause() };
		slideshow.onmouseout = function(){ timer.resume() };
		slideshow.querySelector(".arrow-next").onclick = function(){
			timer.restart();
			shownextslide();
		};
	});
}

//Sets Mode & Options radio boxes
//Note: No Firefox Android support for browserAction.setBadgeText()
function setradioboxes(){
	document.getElementsByName("mode").forEach(function(radiobox){
		radiobox.onchange = function(){ port.postMessage({status: "mode", mode: parseInt(this.value)}) };
	});
	document.getElementsByName("popupfocus").forEach(function(radiobox){
		radiobox.onchange = function(){ port.postMessage({status: "options", options: {popupfocus: parseInt(this.value)}}) };
	});
	document.getElementsByName("applycsp").forEach(function(radiobox){
		radiobox.onchange = function(){ port.postMessage({status: "options", options: {applycsp: (this.value=="true")}}) };
	});
	document.getElementsByName("showbadge").forEach(function(radiobox){
		if(!ANDROID) radiobox.onchange = function(){ port.postMessage({status: "options", options: {showbadge: (this.value=="true")}}) };
		else radiobox.disabled = true;
	});
	document.getElementsByName("uitheme").forEach(function(radiobox){
		radiobox.onchange = function(){
			document.getElementById("include_theme").href = URL_THEME[this.value];
			port.postMessage({status: "ui", uitheme: parseInt(this.value)});
		};
	});
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
	var template = getTemplateById("tpl_"+target);
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
	tablist.groupBy(val => val.url)
		.map(countduplicates)
		.forEach(tab => table.appendChild(tabtohtml(target,tab,actionbtns)));
}

//Sets settings data received from port message
function setsettingsdata(msg){
	switch(msg.status){
	case "ui" :
		document.getElementById("include_theme").href = URL_THEME[msg.uitheme];
		document.getElementById("uitheme"+msg.uitheme).checked = true;
		if(msg.uistate.section) showsection(msg.uistate.section);
		if(msg.uistate.accordion)
			document.querySelectorAll("dl.accordion>dt").forEach(function(item,index){
				if(msg.uistate.accordion[index]) addClass(item,"active");
				else removeClass(item,"active");
			});
	break;
	case "settings" :
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
		document.getElementById("display_all").disabled =
		document.getElementById("block_all").disabled = !msg.confirmtabs.length;
		document.getElementById("restore_last").disabled =
		document.getElementById("restore_all").disabled = !msg.blockedtabs.length;
		document.getElementById("restore_last").onclick = function(){
			if(msg.blockedtabs.length) port.postMessage({status: "restore_tab", tab: msg.blockedtabs.first()});
		};
	break;}
}

/* -------------------- Main Process -------------------- */

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: PORT_SETTINGS});
	
	//Retrieves data from port
	port.onMessage.addListener(setsettingsdata);
	
	//Links
	setlinks();
	
	//Accordion menu
	document.querySelectorAll("dl.accordion>dt").forEach(function(item,index,self){
		item.onclick = function(){
			toggleClass(this,"active");
			port.postMessage({status: "ui", uistate: {accordion: Array.from(self).map(val => hasClass(val,"active"))}});
		};
	});
	
	//Action menu
	setactionmenu();
	
	//About
	var manifest = browser.runtime.getManifest();
	document.getElementById("version").textContent = manifest.version;
	document.getElementById("author").textContent = manifest.author;
	document.getElementById("description").textContent = manifest.description;
	playslideshow();
	
	//Mode & Options
	setradioboxes();
	
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
