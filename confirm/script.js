/* -------------------- Main Process -------------------- */

//Global variables
const PORT_CONFIRM = "confirm";
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: PORT_CONFIRM});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("url").value = msg.tab.url;
	});
	
	//Displays tab
	document.getElementById("display").onclick = function(){
		port.postMessage({status: "display"});
	};
	
	//Blocks tab
	document.getElementById("block").onclick = function(){
		port.postMessage({status: "block"});
	};
	
	//Internationalization
	document.querySelectorAll("i18n, [data-i18n]").forEach(seti18ndata);
};

/* -------------------- PostProcess -------------------- */

window.onunload = function(){
	//Disconnects port
	port.disconnect();
};
