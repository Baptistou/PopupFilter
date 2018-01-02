/* -------------------- Main Process -------------------- */

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "popup"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("icon").src = geticon(msg.mode);
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbclose").textContent = msg.closetabs.length;
		document.getElementById("mode"+msg.mode).checked = true;
		setrestorelastbtn(msg.closetabs.first());
	});
	
	//Modes
	document.getElementsByName("mode").forEach(function(radiobox){
		radiobox.onchange = function(){
			port.postMessage({status: "mode", mode: parseInt(this.value)});
		};
	});
	
	//Shows settings page
	document.getElementById("settings").onclick = function(){
		port.postMessage({status: "settings"});
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

//Sets Restore Last button
function setrestorelastbtn(lasttab){
	var button = document.getElementById("restorelast");
	if(lasttab){
		button.title = lasttab.url;
		button.onclick = function(){
			port.postMessage({status: "restore", tab: lasttab});
		};
		button.disabled = false;}
	else{
		button.title = "";
		button.onclick = function(){};
		button.disabled = true;}
}
