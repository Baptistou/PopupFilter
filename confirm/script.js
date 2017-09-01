/* -------------------- Main Process -------------------- */

//Chrome compatibility
var browser = browser || chrome;

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "confirm"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("url").value = msg.tab.url;
		//Redirects to url
		document.getElementById("display").onclick = function(){
			window.location = msg.tab.url;
			port.postMessage({status: 1});
		};
	});
	
	//Closes tab
	document.getElementById("close").onclick = function(){
		browser.tabs.getCurrent(function(tab){
			browser.tabs.remove(tab.id);
			port.postMessage({status: 3});
		});
	};
};

//Disconnects port
window.onunload = function(){
	port.disconnect();
};
