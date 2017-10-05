/* -------------------- Main Process -------------------- */

//Browser compatibility
var browser = browser || chrome;
var android = !browser.windows;

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "popup"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbclose").textContent = msg.closetabs.length;
		document.getElementById("mode"+msg.mode).checked = true;
		seticon(msg.mode);
	});
	
	//Radio boxes
	var radiobox = document.getElementsByName("mode");
	for(var i=0; i<radiobox.length; i++){
		radiobox[i].onchange = function(){
			port.postMessage({status: "mode", mode: parseInt(this.value)});
		};
	}
	
	//Shows settings page
	document.getElementById("settings").onclick = function(){
		port.postMessage({status: "settings"});
	};
};

//Disconnects port
window.onbeforeunload = function(){
	port.disconnect();
};

/* -------------------- Functions -------------------- */

//Changes icon according to mode
function seticon(mode){
	var icons = {
		1: "/images/icon-normal.png",
		2: "/images/icon-confirm.png",
		3: "/images/icon-blocking.png"
	};
	document.getElementById("icon").src = icons[mode];
}
