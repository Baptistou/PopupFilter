/* -------------------- Prototypes -------------------- */

//Returns true if string contains str
String.prototype.contains = function(str){
	return (this.indexOf(str)>=0);
};

//Returns number of occurrences of str
String.prototype.occurrence = function(str){
	var count=0, index=0;
	while(index = this.indexOf(str,index)+1) count++;
	return count;
};

//Replaces all occurrences of str1 by str2
String.prototype.replaceAll = function(str1,str2){
	return this.replace(new RegExp(str1,"g"),str2);
};

//Removes the first occurence of str
String.prototype.remove = function(str){
	return this.replace(str,"");
};

//Removes all occurences of str
String.prototype.removeAll = function(str){
	return this.replaceAll(str,"");
};

//Returns number of occurrences of val
Array.prototype.occurrence = function(val){
	var count=0, index=0;
	while(index = this.indexOf(val,index)+1) count++;
	return count;
};

//Returns true if array contains val
Array.prototype.contains = function(val){
	return (this.indexOf(val)>=0);
};

//Returns element list contained into array
Array.prototype.findAll = function(callback){
	var list = [];
	for(var i=0; i<this.length; i++){
		if(callback(this[i])) list.push(this[i]);}
	return list;
};

//Removes the first occurence of val
Array.prototype.remove = function(val){
	var index = this.indexOf(val);
	return (index>=0)?this.splice(index,1)[0]:null;
};

//Removes all occurences of val
Array.prototype.removeAll = function(val){
	var list = [];
	for(var i=0; i<this.length; i++){
		if(this[i]==val) list.push(this.splice(i--,1)[0]);}
	return list;
};

//Removes element if condition is true
Array.prototype.removeIf = function(callback){
	var list = [];
	for(var i=0; i<this.length; i++){
		if(callback(this[i])) list.push(this.splice(i--,1)[0]);}
	return list;
};

/* -------------------- Functions -------------------- */

//Returns true if string contains only whitespaces
function isempty(str){
	return (!str || !(/\S/.test(str)));
}

//Adds class name
function addClass(target,str){
	if(!target.className.contains(str)) target.className = (target.className+" "+str).trim();
}

//Removes class name
function removeClass(target,str){
	if(target.className.contains(str)) target.className = target.className.replace(str,"").trim();
}

//Toggles class name
function toggleClass(target,str){
	if(!target.className.contains(str)) addClass(target,str);
	else removeClass(target,str);
}

//Returns true if element is hidden
function isHiddenElement(target){
	return target.className.contains("hidden");
}

//Shows element
function showElement(target){
	removeClass(target,"hidden");
}

//Shows element list
function showElements(list){
	for(var i=0; i<list.length; i++) removeClass(list[i],"hidden");
}

//Hides element
function hideElement(target){
	addClass(target,"hidden");
}

//Hides element list
function hideElements(list){
	for(var i=0; i<list.length; i++) addClass(list[i],"hidden");
}

//Toggles element
function toggleElement(target){
	toggleClass(target,"hidden");
}

//Toggles element list
function toggleElements(list){
	for(var i=0; i<list.length; i++) toggleClass(list[i],"hidden");
}

//Removes element
function removeElement(target){
	if(target) target.parentNode.removeChild(target);
}

//Removes element list
function removeElements(list){
	for(var i=0; i<list.length; i++) list[i].parentNode.removeChild(list[i]);
}
