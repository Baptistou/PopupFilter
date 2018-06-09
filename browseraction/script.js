/* -------------------- PreProcess -------------------- */

//Global constants
const PORT_BROWSERACTION = "browseraction";
const URL_THEME = {1: "/themes/light.css", 2: "/themes/dark.css"};
const BROWSERACTION_ICON = {
	1: "/images/icon-normal.png",
	2: "/images/icon-confirm.png",
	3: "/images/icon-blocking.png"
};

/* -------------------- Functions -------------------- */

//Sets action menu
function setactionmenu(){
	if(!ANDROID){
		document.getElementById("toggle_action").onclick = function(){
			toggleElement(document.getElementById("overview"));
			toggleElement(document.getElementById("action_menu"));
			port.postMessage({status: "ui", uistate: {actionmenu: ishidden(document.getElementById("overview"))}});
		};
		document.getElementById("merge_windows").onclick = function(){ mergewindows() };
		document.getElementById("close_windows").onclick = function(){ closewindows() };}
	else{
		hideElementAll(document.querySelectorAll("header .icon-hamburger, #overview>.list-actions"));
		showElementAll(document.querySelectorAll("header .icon-close, #action_menu"));
		removeElement(document.getElementById("merge_windows").parentElement);
		removeElement(document.getElementById("close_windows").parentElement);
		document.getElementById("toggle_action").onclick = function(){ browser.tabs.getCurrent(closetab) };}
	document.getElementById("remove_duplicates").onclick = function(){ port.postMessage({status: "remove_duplicates"}) };
	document.getElementById("open_settings1").onclick = 
	document.getElementById("open_settings2").onclick = function(){ port.postMessage({status: "open_settings"}) };
}

//Sets Restore Last button
function setrestorelastbtn(lasttab){
	var button = document.getElementById("restore_last");
	if(lasttab){
		button.title = lasttab.url;
		button.disabled = false;
		button.onclick = function(){ port.postMessage({status: "restore_tab", tab: lasttab}) };}
	else{
		button.title = "";
		button.disabled = true;
		button.onclick = function(){};}
}

//Sets settings data received from port message
function setsettingsdata(msg){
	switch(msg.status){
	case "ui" :
		document.getElementById("include_theme").href = URL_THEME[msg.uitheme];
		if(!ANDROID && msg.uistate.actionmenu){
			hideElement(document.getElementById("overview"));
			showElement(document.getElementById("action_menu"));}
	break;
	case "settings" :
		document.getElementById("icon").src = BROWSERACTION_ICON[msg.mode];
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbblocked").textContent = msg.blockedtabs.length;
		document.getElementById("mode"+msg.mode).checked = true;
		setrestorelastbtn(msg.blockedtabs.first());
	break;}
}

/* -------------------- Main Process -------------------- */

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: PORT_BROWSERACTION});
	
	//Retrieves data from port
	port.onMessage.addListener(setsettingsdata);
	
	//Modes
	document.getElementsByName("mode").forEach(function(radiobox){
		radiobox.onchange = function(){ port.postMessage({status: "mode", mode: parseInt(this.value)}) };
	});
	
	//Action menu
	setactionmenu();
	
	//Internationalization
	document.querySelectorAll("i18n, [data-i18n]").forEach(seti18ndata);
};

/* -------------------- PostProcess -------------------- */

window.onunload = function(){
	//Disconnects port
	port.disconnect();
};
