DGE.layers=(function(){var objs={};var set=function(layers){for(var k in layers){var conf=(layers[k].conf||{});conf.id=k;conf.onShow=(conf.onShow||layers[k].show);conf.onHide=(conf.onHide||layers[k].hide);conf.width=DGE.STAGE_WIDTH;conf.height=DGE.STAGE_HEIGHT;objs[k]=new DGE.Sprite(conf);objs[k].hide();objs[k].showOnly=(function(k){return function(){show(k);};})(k);if(layers[k].init!==undefined){layers[k].init.apply(objs[k]);}}
return objs;};var show=function(key){for(var i in objs){if(i==key){objs[i].show();}else{objs[i].hide();}}};return{set:set,show:show};})();