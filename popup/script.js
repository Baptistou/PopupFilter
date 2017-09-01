/* -------------------- Main Process -------------------- */

//Chrome compatibility
var browser = browser || chrome;

//Global variables
var port = browser.runtime.Port;

window.onload = function(){
	//Connects port with background script
	port = browser.runtime.connect({name: "popup"});
	
	//Retrieves data from port
	port.onMessage.addListener(function(msg){
		document.getElementById("opt"+msg.option).checked = true;
		document.getElementById("nbopen").textContent = msg.opentabs.length;
		document.getElementById("nbconfirm").textContent = msg.confirmtabs.length;
		document.getElementById("nbclose").textContent = msg.closetabs.length;
	});
	
	//Radio boxes
	var radiobox = document.getElementsByName("option");
	for(var i=0; i<radiobox.length; i++){
		radiobox[i].onchange = function(){
			port.postMessage({status: "option", option: this.value});
		};
	}
	
	//Shows settings page
	document.getElementById("settings").onclick = function(){
		port.postMessage({status: "settings"});
	};
};

//Disconnects port
window.onunload = function(){
	port.disconnect();
};
