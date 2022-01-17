const utils={

	dmx_to_percent : function(val){
		return Math.round((val / 255) * 100);
	},

	percent_to_dmx : function(val){
		return Math.round((val / 100) * 255);
	},

	componentToHex : function(c) {
		var hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	},

	rgbToHex : function(r, g, b) {
		return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
	},

	colorLevelsToHex : function(r,g,b){
		r = percent_to_dmx(r);
		g = percent_to_dmx(g);
		b = percent_to_dmx(b);
		return rgbToHex(r, g, b);
	},

	getUUID : function(){
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
		console.log("generated uuid: " + uuid);
		return uuid;
	},

	containsAll : function(needles, haystack){
		var success = needles.every(function(val) {
			return haystack.indexOf(val) !== -1;
		});
		return success;
	}
}
module.exports = utils;