DGE.Object=function(conf){this.init(conf);};DGE.Object.prototype.init=function(conf){this._events=(this._events||{});this._values=(this._values||{});this.set(conf);};DGE.Object.prototype.fire=function(key,value){if(key in this._events)this._events[key].apply(this,[value]);return this;};DGE.Object.prototype.get=function(key){return this._values[key];};DGE.Object.prototype.set=function(key,value){if(key===undefined)return;if(typeof(key)=='object'){for(var i in key){arguments.callee.apply(this,[i,key[i]]);}}else{if(key=='id')this._id=value;this._values[key]=value;this.fire(key,value);}
return this;};DGE.Object.prototype.on=function(key,e){this._events[key]=e;return this;};DGE.Object.prototype._id=null;DGE.Object.prototype._events=null;DGE.Object.prototype._values=null;