/* -------------------- Main Process -------------------- */

//Browser compatibility
var browser = browser || chrome;
var android = !browser.windows;

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "confirm"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("url").value = msg.tab.url;
		//Redirects to url
		document.getElementById("open").onclick = function(){
			port.postMessage({status: "open"});
		};
	});
	
	//Closes tab
	document.getElementById("close").onclick = function(){
		browser.tabs.getCurrent(function(tab){
			port.postMessage({status: "close"});
		});
	};
};

//Disconnects port
window.onbeforeunload = function(){
	port.disconnect();
};
