DGE.Sprite.prototype.animate=function(ops,ms,callbacks){callbacks=callbacks||{};ms=(ms||1000);if(ms<DGE.conf.interval)ms=1000;var frames=Math.ceil(ms/DGE.conf.interval);var that=this;for(var i in ops){ops[i].inc=((ops[i].to-ops[i].from)/frames);}
this.tween=function(){for(var i in ops){ops[i].from+=ops[i].inc;this[i](ops[i].from);if(callbacks.tween)callbacks.tween.apply(this,[i,ops[i].from,frames]);}
if(--frames==0){for(var i in ops){this[i](ops[i].to);}
this.tween=function(){};if(callbacks.complete)callbacks.complete.apply(this);return;}};return this;};DGE.Sprite.prototype.exec=function(){return this.move().ping().tween();};DGE.Sprite.prototype.tween=function(){};