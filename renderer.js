// ******* RENDERER

// ******** GLOBAL VARIABLES
var settings = getSettingsFromMain().then(function(){
	startUp();
});
console.log("RENDERER SETTINGS", settings)

var live = false;	//start false until it is initialized properly


var show = {};	//global variable for storing active show data
var tempPatch = {};	//used to temporarily store the patch while working on it...

var copied_levels = {};	//used for temporarily copying one set of levels to another via the UI LX_Popup

var lxInterval = [];	//interval timer for slider GUI updates
var timers = [];	//for tracking setTimout (audio) timers

var lxActiveCue = 0;
var afTimer = null;

var sndActiveCue = 0;
var activeSounds = [];

//global UI
var previousStatus = "";	//for statusBar updates

//jquery READY function
$(function() {
	

	

// ******** GUI LISTENERS
	
	$( window ).resize(function() {
	  resizeScreen();
	});
	function resizeScreen(){
		var win_height = $(window).height();
		//subtract a bunch of other objects, then devide by 2...
		var container_height = (win_height - $(".chan_sliders").parent().height() - $(".navbar").height() - $(".footer").height() - 10) / 2;
		$(".lx_container, .snd_container").css("height", container_height);
	}
	resizeScreen();	//call it once to get started...

	$("#testbutton1").click(function(){
	  console.log("test button 1 clicked");
	  visitor.event("easycue", "testbutton_click").send();
	});

	$("#testbutton2").click(function(){
		console.log("test button 2 clicked");
	});

	$("#testbutton3").click(function(){
		console.log("test button 2 clicked");
	});

	$("#but1").click(function(){
	  readShowFile();
	});

	$("#but2").click(function(){
	  saveFile();
	});

	// $("#updatePatch").click(function(){
	//   updateTempPatch();
	// });

	$("#savePatch").click(function(){
	  savePatch();
	});

	$('#patchlist').on('change', '.patch_dimmer', function(e){
		console.log("patch changed");

		// error check the value
		var val = $(this).val();
		val = parseInt(val);
		if(isNaN(val)){
			$(this).val(1);
		}else if(val>512){
			$(this).val(512);
		}else if(val<0){
			$(this).val(1);
		}else{
			$(this).val(val);
		}

		var ch = parseInt($(this).closest(".patch_row").data("ch"));
		console.log("updating patch row", ch);
		updatePatchRowRange(ch);
		checkRangeConflicts();
	});

	$('#patchlist').on('change', '.ch_type', function(e){
		console.log("patch TYPE changed");
		var ch = parseInt($(this).closest(".patch_row").data("ch"));
		console.log("updating patch row", ch);
		updatePatchRowRange(ch);
		checkRangeConflicts();
	});

	$("#lx_add_cue").click(function(){
	  // console.log("lx_new_cue clicked");
	  addLxCue();
	});
	$("#lx_save_cue").click(function(){
	  // console.log("lx_save_cue clicked: ");
	  console.log(show.lx[$("#lx_save_cue_num").val()]);
	  if(typeof show.lx[$("#lx_save_cue_num").val()] !== "undefined"){	//if the cue exists in the first place...
		  bootbox.confirm("Are you sure you want to save the current lighting levels <br>over existing Cue# " + $("#lx_save_cue_num").val() + "?", function(result){ 
		  	console.log('confirmed?: ' + result); 
		  	if(result=== true) saveLxCue($("#lx_save_cue_num").val());
		  });
		}else{
			bootbox.alert("Sorry - No such Cue#");
		}
	});

	$("#lx_go_cue").click(function(){
	  // console.log("lx_GO_cue clicked");
	  lxCueGo();
	});

	$("#lx_move_down").click(function(){
	  // console.log("lx_move_down clicked");
	  lxMove(1);
	});
	$("#lx_move_up").click(function(){
	  // console.log("lx_move_up clicked");
	  lxMove(-1);
	});
	$("#lx_delete").click(function(){
	  // console.log("lx_delete clicked");
	  lxDelete();
	});

	$('.chan_level, #lx_next_cue, #lx_save_cue_num, #snd_next_cue').focus(function() {
	  this.select();
	});

	$('table.chan_sliders').on("change", ".chan_level", function() {
		// $(".chan_level[data-chan='"+chan+"']").val(newvalue);
		if($(this).val()==="")
			$(this).val(0);
		var chan = $(this).data("chan");
		var newvalue = $(this).val();
		var patchedChan = show.patch[chan].dim;
		console.log("chan_level CHANGE",chan, newvalue, patchedChan);

		api.send( 'updateUniverse', {patchedChan : patchedChan, newvalue : percent_to_dmx(newvalue)} );
		getLive();
	});


	$( "body" ).on("contextmenu", ".chan_slider" , function(event) {
		var chan = $(this).data("chan");
		showLxPopup(chan, false);
	});

	$( "#lx_datagrid" ).on("contextmenu", "input[data-part='chan']", function(event) {
		var chan = $(this).data("chan");
		var lxgrid_cue = $(this).closest("tr").data("lx");
		showLxPopup(chan, lxgrid_cue);
	});

	$("#lxPopup").mouseleave(function(event) {
		if($(this).data("lxgrid_cue")===false){
			$(this).hide();
		}else{
			//if it's a lx_grid popup, then also update the 'show' lx data as well to match the ui
			popup = $("#lxPopup");
			var cueNum = popup.data("lxgrid_cue");
			var chan = popup.data("chan");
			var level_data = $( "#lx_datagrid tr[data-lx='"+cueNum+"'] input[data-chan='"+chan+"']").data("levels");

			updateLxData(cueNum, "chan", level_data.Intensity, chan, level_data);
			$(this).hide();
		}
	});

	$("body").on({
		copy : function(){
			console.log("copy!!!");
		},
		paste : function(){
			console.log("paste!!!");
		},
		cut : function(){
			console.log("cut!!!");
		}
	});


	function showLxPopup(chan, lxgrid_cue){
		//show the popup
		var popup = $("#lxPopup");
		popup.empty();

		//store the referring info in the popup so it can update the appropriate objects when sliders move...
		popup.data("chan", chan);
		popup.data("lxgrid_cue", lxgrid_cue);

		if(lxgrid_cue === false){	//if it's a slider popup
		//get the stored data from the corresponding chan_level box
			var level_data = $(".chan_level[data-chan='"+chan+"']").data('levels');
			console.log("level_data");
			console.log(level_data);
		}else{
			var level_data = $( "#lx_datagrid tr[data-lx='"+lxgrid_cue+"'] input[data-chan='"+chan+"']").data("levels");
			console.log("level_data");
			console.log(level_data);
		}
		
		//reset some things:
		popup.css("border-color", "#ddd");

		//popuplate the popup
		var col = {};
		var custom_inputs = "";
		var dimmer_offset = 0;
		$.each(level_data, function(ch, level){

			custom_inputs += '<label for="'+ch+'">'+ch+'</label>';
			custom_inputs += '<input type="range" min="0" max="100" name="'+ch+'" data-dimmeroffset="'+dimmer_offset+'" value="'+level+'">';
			if(["Red", "Green", "Blue"].indexOf(ch) > -1){
				col[ch] = level;
			}
			dimmer_offset+=1;
		});
		// console.log(col);

		popup.html(custom_inputs);
		popup.css("left",event.pageX-10);
		popup.css("top",event.pageY-10);
		if(Object.keys(col).length === 3){
			popup.css("border-color", colorLevelsToHex(col.Red, col.Green, col.Blue));
		}
		popup.show();
		popup.find("input").first().focus();
	}

	//deal with the possible channel level sliders in the popup, and save their values to live channel data
	$("#lxPopup").on("input change", "input", function(){
		popup = $("#lxPopup");
		var chan = popup.data("chan");
		var level = parseInt($(this).val());
		var ch_type = $(this).prop('name');
		var dimmer_offset = $(this).data('dimmeroffset');
		var existing_levels = {};
		console.log(chan, level ,ch_type, dimmer_offset);


		var patchedChan = show.patch[chan].dim + dimmer_offset;
		console.log("patched chan: " + patchedChan);
		api.send( 'updateUniverse', {patchedChan : patchedChan, newvalue : percent_to_dmx(level)} );

		// depending on what type of popup it is, change different things...
		if(popup.data('lxgrid_cue') === false){	//if it's a slider popup

			//update the chan_level data param to match
			existing_levels = $(".chan_level[data-chan='"+chan+"']").data('levels');
			existing_levels[ch_type] = level;
			$(".chan_level[data-chan='"+chan+"']").data("levels", existing_levels);

			//update the UI based on slider changes
			if(ch_type === "Intensity"){
				$(".chan_slider[data-chan='"+chan+"']").slider( "value", level);
				$(".chan_level[data-chan='"+chan+"']").val(level);
			}
			else if(["Red", "Green", "Blue"].indexOf(ch_type) > -1){
				//update colour display
				var newCol = colorLevelsToHex(
					popup.find("input[name='Red']").val(), 
					popup.find("input[name='Green']").val(), 
					popup.find("input[name='Blue']").val()
					);
				popup.css("border-color", newCol);
				
				$(".chan_slider[data-chan='"+chan+"'] div.ui-slider-range").css("background-color", newCol);
			}
		}
		else{	//it's a lx_grid popup, so update different stuff...

			console.log("lxGrid popup slider event");
			var lxgrid_input = $( "#lx_datagrid tr[data-lx='"+popup.data('lxgrid_cue')+"'] input[data-chan='"+chan+"']");
			//update the chan_level data param to match
			existing_levels = lxgrid_input.data('levels');
			existing_levels[ch_type] = level;
			lxgrid_input.data("levels", existing_levels);	//write it back

			//update the UI based on slider changes
			if(ch_type === "Intensity"){
				lxgrid_input.val(level);
			}
			else if(["Red", "Green", "Blue"].indexOf(ch_type) > -1){
				//update colour display
				var newCol = colorLevelsToHex(
					popup.find("input[name='Red']").val(), 
					popup.find("input[name='Green']").val(), 
					popup.find("input[name='Blue']").val()
					);
				popup.css("border-color", newCol);
				
				lxgrid_input.css("border-bottom-color", newCol);
			}

		}

	});


	$('#lx_next_cue').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			$("#lx_go_cue").trigger("click");
		}
	});

	$('#snd_next_cue').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			$(this).trigger("blur");
			$("#snd_go_cue").trigger("click");
			// sndCueGo();
		}
	});
	
	// When you click on item, record into data("initialText") content of this item.
	$('#lx_datagrid').on('focus', 'input', function() {
	  $(this).data("initialText", $(this).val());
	  this.select();
	});
	// When you leave an item...
	$('#lx_datagrid').on('blur', 'input', function() {
	  if ($(this).data("initialText") !== $(this).val()) { // ...if content is different...
		console.log($(this).val());
		var cueNum = $(this).closest("tr").data("lx");
		var dataPart = $(this).data("part");
		var value =(dataPart=="name" || dataPart=="desc") ? $(this).val() : parseInt($(this).val());
		var chan = (dataPart=="chan") ? $(this).data("chan") : null;
		
		if(chan!== null){
			var existing_levels = $(this).data('levels'); //update the chan_level data param to match
			existing_levels.Intensity = value;
			$(this).data("levels", existing_levels);	//write it back
		}

	    updateLxData(cueNum, dataPart, value, chan, existing_levels);
	  }
	});
	
	$('#lx_datagrid').on('focus','tr', function() {
		// console.log("row got focus");
		$("#lx_datagrid tr").removeClass('selected');
		$(this).addClass("selected");
	});

	$('#lx_datagrid').on('dblclick','.lx_goto', function() {
		console.log("goto row clicked");
		$("#lx_next_cue").val($(this).closest("tr").data("lx"));
		$("#lx_go_cue").trigger("click");
	});


	//***** hotkey listeners
	$(window).keydown(function(e) {
		// console.log(e.keyCode);
		// LIGHTS
		if(e.ctrlKey && e.altKey){
			console.log("ctl&alt --> lights");
			if(e.keyCode == $.ui.keyCode.ENTER) {
				$("#lx_go_cue").trigger("click");
			}
			if(e.keyCode >= 48 && e.keyCode <= 57) {	//number keys
				hotkeyNum = String.fromCharCode(e.which);
				console.log("hotkeyNum: " + hotkeyNum);
				$("#lx_next_cue").val(hotkeyNum);
				$("#lx_go_cue").trigger("click");
			}


			if(e.keyCode == 67) {	//'c' key for COPY popup params
				console.log("copying: ");
				if($("#lxPopup").is(":visible")){
					$("#lxPopup input").each(function(){
						copied_levels[$(this).prop('name')] = parseInt($(this).val());
					});
					console.log(copied_levels);
					$("#lxPopup").hide();
				}
			}

			if(e.keyCode == 86) {	//'v' key for PASTE popup params
				console.log("PASTING: ");
				if($("#lxPopup").is(":visible")){
					console.log(copied_levels);
					$.each(copied_levels, function(ch, value){
						$("#lxPopup input[name='"+ch+"']").val(value).change();
					});
					$("#lxPopup").hide();
				}
			}

		}

		//SOUND
		if(e.ctrlKey && e.shiftKey){
			console.log("ctl&shift --> sound");
			if(e.keyCode == $.ui.keyCode.ENTER) {
				$("#snd_go_cue").trigger("click");
			}
			if(e.keyCode >= 48 && e.keyCode <= 57) {	//number keys
				hotkeyNum = String.fromCharCode(e.which);
				console.log("hotkeyNum: " + hotkeyNum);
				sndCueGo(hotkeyNum);
			}
		}

		//generic
        if (e.keyCode == $.ui.keyCode.ESCAPE) {
            sndStopAll();
        }

    });

//***** sound buttons
	$("#snd_add_cue").click(function(){
	  addSndCue();
	});
	$("#snd_move_down").click(function(){
	  sndMove(1);
	});
	$("#snd_move_up").click(function(){
	  sndMove(-1);
	});
	$("#snd_delete").click(function(){
	  sndDelete();
	});


	$("#snd_go_cue").click(function(){
		// sndActiveCue = $("#snd_next_cue").val();
	  	sndCueGo();
	});

	$("#snd_stop_all").click(function(){
		sndStopAll();
	});

	$("#snd_fade_all").click(function(){
		sndFadeAll();
	});

	$( "#snd_next_cue" ).on('blur', function() {
	  	sndActiveCue = $(this).val();
	  	setSndCueStatus($(this).val(), "active");
	});



	$('#snd_datagrid').on('focus','tr', function() {
		// console.log("row got focus");
		$("#snd_datagrid tr").removeClass('selected');
		$(this).addClass("selected");
	});


	// When you click on item, record into data("initialText") content of this item.
	$('#snd_datagrid').on('focus', 'input', function() {
	  $(this).data("initialText", $(this).val());
	  this.select();
	});
	// When you leave an item...
	$('#snd_datagrid').on('blur', 'input', function() {
	  if ($(this).data("initialText") !== $(this).val()) { // ...if content is different...
	      console.log($(this).val());
	      var cueNum = $(this).closest("tr").data("snd");
	      var dataPart = $(this).data("part");
	      var value = $(this).val();
	      updateSndData(cueNum, dataPart, value);
	  }
	});
	
	$("#snd_datagrid").on('click','.snd_file_btn', function(){
		console.log("open button clicked");
		// var file = readFile();
		// console.log(file);
		// if(file === false) return;
		var cueNum = $(this).data("snd");

		chooseSoundFile(cueNum);

	});

	$("#snd_datagrid").on('dblclick','.snd_file_play', function(){
		console.log("PLAY button clicked");
		var cueNum = $(this).closest("tr").data("snd");
		sndCueGo(cueNum);
	});

	//testing randomizing function - - changes the values randomly every 3 sec
	  // var randomInterval = setInterval(function(){
	  // 	console.log("randomInterval");
	  //     for (var ch = 0; ch <= show.channels-0; ch++) {
	  //     	var randomnumber = Math.floor(Math.random() * (100 - 1 + 1)) + 1;
	  //     	dmx.update("demo", {[ch]:randomnumber});
	  //     }
	  // }, 3000);


	//******* patch listeners
	$("#patch_reset").click(function(){ patchReset(); });
	$("#patch_clear").click(function(){ patchReset(true); });

	// $(".patch_slider").on("change", function(){
	// 	//validate max/min and numeric
	// 	var val = $(this).val();
	// 	val = parseInt(val);
	// 	if(isNaN(val)){
	// 		$(this).val("");
	// 	}else if(val>show.channels){
	// 		$(this).val(show.channels);
	// 	}else if(val<0){
	// 		$(this).val("");
	// 	}else{
	// 		$(this).val(val);
	// 	}
	// });


	// var prev_val;
	// $(".patch_row select").focus(function() {
	//     prev_val = $(this).val();
	// })
	// .change(function(){ 

	// 	var row = $(this).closest(".patch_row");
	// 	console.log(row);
		
	// 	var currentVal = row.find("input.patch_slider").val();
	// 	console.log("row value: " + currentVal);

	// 	if(typeof currentVal !== "undefined" && currentVal !== "" && currentVal!==0){

	// 		var dimmer = row.data('dim');
	// 		var type = $(this).val();
	// 		console.log("newtype = " + type);

	// 		var type_channels = show.types[type].channels;
	// 		// console.log(type_channels);

	// 		// //also change the next few rows if needed, and bump up the counter...
	// 		for (var i = 0; i < type_channels.length; i++) {
	// 			row = $(".patch_row[data-dim='"+parseInt(dimmer + i)+"']");
	// 		// 	// console.log(row);
	// 			// row.find("input.patch_slider").val(currentVal+1+i);
	// 			row.find("option[value='"+type+"']").prop("selected", true);
	// 			row.find(".ch_details").text(type_channels[i]);
				
	// 			if(i>0){	//for any channels above the first channel
	// 				// console.log("disabling ch: " + i);
	// 				row.find("input.patch_slider").val("");	//clear it out instead 
	// 				// row.find("input.patch_slider").attr('disabled', 'disabled');
	// 				// row.find("select").attr('disabled', 'disabled');
	// 			}
				
	// 		}
	// 	}else{
	// 		$(this).val(prev_val);
	// 		console.log("returning false");
	// 		bootbox.alert("Please select a channel number first, then choose a type.");
	// 		return false;
	// 	}


	// 	updateTempPatch();
	// });

});



//********* GUI UPDATING FUNCTIONS

function initializeShow(newShow){	
	console.log("INITIALIZING SHOW");
	show = newShow;	//update the RENDERER GLOBAL

	if(typeof show.lx !== "undefined"){
		setupGui();
		updateLxCuelist();
		// updateAllSliders();
		getLive();
		updateSndCuelist();
		updateStatusBar();

		// updatePatchList();

		lxActiveCue = 0;
		$("#lx_next_cue").val(lxActiveCue);
		lxCueGo(0);	//jump into the first cue
		$("#lx_save_cue_num").val(lxActiveCue);
	}
}

function setupGui(){
	$("#slider_row").empty();
	$("#input_row").empty();
	$(".lx_container .ch_head").remove();

 	for (var i = 0; i <= show.channels-1; i++) {
      var slider = $('<td>'+(i+1)+'<div data-chan='+(i)+' class="chan_slider"></div></td>');
        $("#slider_row").append(slider);
      var input = $('<td><input data-chan='+i+' class="chan_level" type="number" min="0" max="100"></td>');
        $("#input_row").append(input);
      var lxdata_heading = $('<th class="ch_head t_sm">' + (i+1) + '</th>');
        $(".lx_container tr").append(lxdata_heading);

    }

    //******* update UI to initial settings
	$('[data-toggle="tooltip"]').tooltip();

	$(".chan_slider").slider({
      orientation: "vertical",
      range: "min",
      min: 0,
      max: 100,
      value: 0,
      slide: function( event, ui ) {
		//   console.log("chan_slider SLIDE", ui.value);
        var newvalue = ui.value;
        var chan = parseInt($(this).data('chan'));
        var level_box = $(".chan_level[data-chan='"+chan+"']");
        level_box.val(newvalue);

        //update new levels-data array as well
        var levels = level_box.data("levels");
        levels.Intensity = newvalue;
        level_box.data("levels", levels);

        // for (var i = 0; i < show.patch[chan]['dims'].length; i++) {
	        var patchedChan = show.patch[chan].dim;
			// console.log("patched chan: " + patchedChan);
			// universe.update({[patchedChan]: percent_to_dmx(newvalue)});
			api.send( 'updateUniverse', {patchedChan : patchedChan, newvalue : percent_to_dmx(newvalue)} );
        // }
      }
    });


}

function updateStatusBar(){
	var def = "&nbsp;";
	var left = "LX Cue: " + lxActiveCue;
	// var mid = settings.activeFile;
	var right = "Sound Cue: " + sndActiveCue;
	$("#status-left").html(left);
	// $("#status-mid").html(mid);
	$("#status-right").html(right);
}

function startLxUpdate(){
	$(".chan_sliders input").prop( "disabled", true );
	var interval = setInterval(function(){
        // updateAllSliders();
		getLive();
    }, 100);
	lxInterval.push(interval);
}
function stopLxUpdate(){
	console.log("stopping the LXUpdate interval: " + lxInterval);
	$.each(lxInterval, function(i, interval){
		clearInterval(interval);
		var index = lxInterval.indexOf(interval);
		if (index !== -1) {
			lxInterval.splice(index, 1);
		}
	});
	// updateAllSliders();
	getLive();
	$(".chan_sliders input").prop( "disabled", false );
}


function updateAllSliders(){
	// console.log("updating all sliders");
	// for (var ch = 0; ch < show.channels; ch++) {
		// updateSlider(ch, dmx_to_percent(live[show.patch[ch].dim - 1]));
	$.each( show.patch, function( ch, instrument ){
		// console.log(show.patch[ch]);
		updateSlider(ch, instrument);
	});
}

function updateSlider(chan, instrument){
	// console.log("updating slider", chan, instrument);
	var level_data = {};
	var instrument_type = instrument.type;
	
	//for each possible channel in that type, get the corresponding live dimmer value
	$.each(show.types[instrument_type].channels, function(i, channel){
		level_data[channel] = dmx_to_percent(live[instrument.dim + i]);
	});

	// console.log("level_data: ");
	// console.log(level_data);
	
	$(".chan_slider[data-chan="+chan+"]").slider( "value", level_data.Intensity );
	$(".chan_level[data-chan="+chan+"]").val(level_data.Intensity);
	
	// // update the 'data' values of the chan_level, for popup and saving access...
	$(".chan_level[data-chan="+chan+"]").data('levels', level_data);

	//update the colour of the sliders if RGB exists in the levels
	if ("Red" in level_data && "Green" in level_data && "Blue" in level_data){
		var newCol = colorLevelsToHex(level_data.Red, level_data.Green, level_data.Blue);
		$(".chan_slider[data-chan='"+chan+"'] div.ui-slider-range").css("background-color", newCol);
	}
}



function addLxCueRow(num,data){
	console.log("adding row: " + data.levels);
	console.log(data);
	var row = '<tr data-lx='+num+'>';
	row += '<td class="t_sm lx_goto no_selection" title="Double-Click to go to this cue.">'+num+'</td>';
	row += '<td><input class="t_med" data-part="name" type="text" value="'+data.name+'"></td>';
	row += '<td><input class="t_lng" data-part="desc" type="text" value="'+data.desc+'"></td>';
	row += '<td><input class="t_sm" data-part="in" type="number" value="'+data.in+'" min="0"></td>';
	row += '<td><input class="t_sm" data-part="out" type="number" value="'+data.out+'" min="0"></td>';
	row += '<td><input class="t_sm" data-part="af" type="number" value="'+data.af+'" min="0"></td>';
	row += '<td><input class="t_sm" data-part="snd" type="number" value="'+data.snd+'" min="0"></td>';
	row += "</tr>";

	row = $(row);//make an object

	// for (var i = 0; i < Object.keys(data.levels).length; i++) {
	for (var i = 0; i < show.channels; i++) {
		// console.log("adding cue data");
		var levels = {"Intensity":0};
		var style_str = "";
		if(typeof data.levels[i] !== 'undefined'){

			levels = data.levels[i];

			if("Red" in levels && "Green" in levels && "Blue" in levels){
				//update colour display of box if colors are present in the levels data
				var newCol = colorLevelsToHex(levels.Red, levels.Green, levels.Blue);
				style_str = "style='border-bottom-color:" + newCol +"'";
			}

		}

		var cel = $('<td></td>');
		var input = $('<input class="t_sm" type="number" data-part="chan" data-chan="'+i+'" value="'+levels.Intensity+'" min="0" max="100" ' + style_str + '>');
		input.data("levels", levels);
		cel.append(input);
		row.append(cel);
	}
	$("#lx_datagrid tbody").append(row);
}

function updateLxCuelist(){
	// console.log("updating show:");
	// console.log(show);
	$("#lx_datagrid tbody").empty();
	for (var i = 0; i < show.lx.length; i++) {
		var cue = show.lx[i];
		addLxCueRow(i,cue);
	}
	// setLxCueStatus(lxActiveCue, "active");
	// $("#lx_next_cue").val(lxActiveCue+1);
}

function lxFinishedCue(){
	console.log("lxFinishedCue")
	stopLxUpdate();
	setLxCueStatus(lxActiveCue, "active");
	$("#lx_next_cue").val(lxActiveCue+1);
	$("#lx_save_cue_num").val(lxActiveCue);

	//if there's an AF (autofollow) value set, then start the background timer to trigger THAT cue x seconds AFTER THIS cue is finished...
		var afTime = parseInt(show.lx[lxActiveCue].af);
		console.log("afTime="+afTime);
		console.log("afCue: " + show.lx[lxActiveCue+1]);
		if(Number.isFinite(afTime) && show.lx[lxActiveCue+1]) {
			console.log("starting autofollow timer...");
			var waitTime = afTime*1000;
			statusNotice("Autofollow next LX cue in " + (waitTime/1000) + " seconds...", "good", false);
			setLxCueStatus(lxActiveCue+1, "af_waiting");

			afTimer = setTimeout(function(){ 
				lxCueGo(); 
			}, waitTime);
		}
}

function setLxCueStatus(cue, status){
	if(status!=="af_waiting"){
		$("#lx_datagrid tr").removeClass('lx_active');
		$("#lx_datagrid tr").removeClass('lx_fading');
	}
	
	if(afTimer === null){	//if there's no waiting af-timer, remove the class from all rows
		$("#lx_datagrid tr").removeClass('lx_af_waiting');
	}

	$("#lx_datagrid tr[data-lx='"+cue+"']").addClass('lx_'+status);

}

// **** sound

function addSndCueRow(num,data){
	// console.log("adding Snd row: ");
	// console.log(data);

	var row = '<tr data-snd='+num+'>';
	row += '<td class="t_sm">'+num+'</td>';
	row += '<td class="t_sm"><span data-snd='+num+' class="glyphicon glyphicon-volume-up snd_file_play" title="Double-Click to play this sound."></span></td>';
	row += '<td class="t_lng"><input class="t_lng" data-part="name" type="text" value="'+data.name+'"></td>';
	row += '<td class="t_lng2"><input class="t_lng2" data-part="desc" type="text" value="'+data.desc+'"></td>';
	row += '<td class="t_sm"><input class="t_sm" data-part="startvol" type="number" value="'+data.startvol+'" min="0" max="100"></td>';
	row += '<td class="t_sm"><input class="t_sm" data-part="in" type="number" value="'+data.in+'" min="0"></td>';
	row += '<td class="t_sm"><input class="t_sm" data-part="vol" type="number" value="'+data.vol+'" min="0" max="100"></td>';
	row += '<td class="t_sm"><input class="t_sm" data-part="hold" type="number" value="'+data.hold+'" min="0"></td>';
	row += '<td class="t_sm"><input class="t_sm" data-part="out" type="number" value="'+data.out+'" min="0"></td>';
	row += '<td class="t_sm"><input class="t_sm" data-part="endvol" type="number" value="'+data.endvol+'" min="0" max="100"></td>';
	row += '<td class="t_lng2"><span class="t_lng2 file_span" data-part="file">'+data.file+'</span></td>';
	row += '<td class="t_sm"><span data-snd='+num+' class="glyphicon glyphicon-folder-open snd_file_btn"></span></td>';

	$("#snd_datagrid tbody").append(row);
}

function updateSndCuelist(){
	// console.log("updating show:");
	// console.log(show);
	$("#snd_datagrid tbody").empty();
	for (var i = 0; i < show.snd.length; i++) {
		var cue = show.snd[i];
		addSndCueRow(i,cue);
	}
	setSndCueStatus(sndActiveCue, "active");
	$("#snd_next_cue").val(sndActiveCue);
}

// function sndFinishedCue(){
// 	setSndCueStatus(sndActiveCue, "active");
// 	$("#snd_next_cue").val(lxActiveCue+1);
// 	$("#snd_save_cue_num").val(lxActiveCue);
// }

function setSndCueStatus(cue, status){
	if(cue===null){	//clear it all
		$("#snd_datagrid tr").attr('class', function(i, c){
		  return c && c.replace(/(^|\s)snd_\S+/g, '');
		});
	}else{	//otherwise only the one we're addressing
		$("#snd_datagrid tr[data-snd='"+cue+"']").attr('class', function(i, c){
		  return c && c.replace(/(^|\s)snd_\S+/g, '');
		});
	}
	if(status !== "clear")
		$("#snd_datagrid tr[data-snd='"+cue+"']").addClass('snd_'+status); //add the new class

	//update the 'active' sound cue appearance
	$("#snd_datagrid tr").removeClass('snd_active');	
	$("#snd_datagrid tr[data-snd='"+sndActiveCue+"']").addClass('snd_active');	// and re-add the activeCue if needed
	$("#snd_next_cue").val(sndActiveCue);
	updateStatusBar();
}




//****** CUE PLAYBACK FUNCTIONS

function lxCueGo(time){
	if(typeof show.lx[$("#lx_next_cue").val()] === 'undefined'){
		console.log("NO CUE THERE... not proceeding");
	}else{
		clearTimeout(afTimer);//clear any previously waitin autofollows, ie.cancel them
		afTimer=null;

		lxActiveCue = parseInt($("#lx_next_cue").val());
		startLxUpdate();
		setLxCueStatus(lxActiveCue, "fading");
		
		//if a time is passed to the function, use it instead of the cue time
		time = (typeof time === "undefined") ? (show.lx[lxActiveCue].in * 1000) : time;


		
		//pad stored cues with 0s so that all channels fade, even if there is no stored level for it.
		var levels = show.lx[lxActiveCue].levels;
		var fullLevels = {};

		// for (var i = 0; i < show.channels; i++) {
		$.each( show.patch, function( i, instrument ){
			if(typeof levels[i] === 'undefined'){	//if there's no corresponding level data in the show file, set the basic value to 0
				fullLevels[instrument.dim] = 0;
			}
			else{//there IS level data for this channel in the patch, so update the fullLevels accordingly for each sub-dimmer-channel
				$.each(levels[i], function(ch, level){
					// var level = (typeof levels[i] === 'undefined') ? 0 : levels[i].Intensity;
					var dimmer_offset = show.types[instrument.type].channels.indexOf(ch);
					
					// console.log(" dimmer:" + instrument.dim + " dimmer_offset:" + dimmer_offset + " ch:" + ch + " level:" + level);
					
					fullLevels[instrument.dim + dimmer_offset] = percent_to_dmx(level);	//offset by one to account for patch dmx numbers (1-512) vs. actual output array (0-511)

				});
			}
		});


		//ACTUALLY RUN THE FADE
		console.log("attempting to start fade with this data:");
		console.log(fullLevels);
		
		// new A().add(fullLevels, time).run(universe, lxFinishedCue);	// NOTE --> NOW MOVED TO MAIN
		api.send( 'runDmxAnimation', {levels: fullLevels, time: time} );


		//also trigger a sound cue if there is one linked
		if(show.lx[lxActiveCue].snd !== undefined && show.lx[lxActiveCue].snd !== ""){
			var sqNum = show.lx[lxActiveCue].snd;
			if(show.snd[sqNum] !== undefined){
				sndCueGo(sqNum);
			}
		}
	}
	updateStatusBar();
}



function sndCueGo(sqNum){
	//use the given cue num, or the 'sndActiveCue'
	if(sqNum===undefined){
		sqNum = +sndActiveCue;
		var nextCue = +sqNum + 1;
		if(show.snd[nextCue] !== undefined)
			sndActiveCue = nextCue;	//bump up the active cue num
	}

	if(show.snd[sqNum] === undefined || show.snd[sqNum].file=="") return;

	console.log("starting to play: " + sqNum + " and setting sndActiveCue to: " + sndActiveCue);

	try {

		var rnd = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
		var soundPath = show.snd[sqNum].file
		//test if saved file starts with "/resources"
		console.log("examining soundpath: ", soundPath, soundPath.indexOf("resources/"));

		// if it's NOT in the development location (ie. installed somewhere) and it's got a resources path, adjust to be relative to install location
		if(globals.resourcesPath.indexOf('P_SYNC')==-1 && soundPath.indexOf("resources/") == 0){
			// soundPath.replace('resources', globals.resourcesPath);
			soundPath = soundPath.replace('resources/', '../');
		}
		console.log("trying to open sound file: ", soundPath);
		
		var sound = new Howl({
	    	src: soundPath,
	    	volume: (show.snd[sqNum].in > 0) ? show.snd[sqNum].startvol / 100	: show.snd[sqNum].vol / 100 //use the startvol if there's a fade-in time, or just the main VOL if there isn't.  convert percent vol to 0 - 1.0
	 	});
	 	sound.idNum = sqNum;
		sound.on('end', function(){
		  	console.log('sound ended');
		  	// if(activeSounds[0]===undefined) return;
		  	setSndCueStatus(sound.idNum, "clear");
		  	activeSounds.shift();	//remove it from the list of active sounds
		});
		sound.on('stop', function(){
		  	console.log('sound stopped');
		  	// if(activeSounds[0]===undefined) return;
		  	setSndCueStatus(sound.idNum, "clear");
		  	activeSounds.shift();	//remove it from the list of active sounds
		});
		sound.on('fade', function(){	//add the fade callback function (to stop playback)
		  	console.log('sound fade finished');
			if(sound.volume() == 0){
				sound.stop();
			}else{
		  		console.log('volume still above 0, so must be  playing...');
				setSndCueStatus(sound.idNum, "playing");
			}
		});
		
		sound.play();	//play and get the ID
		var currentSound = {"num": sqNum, "data": show.snd[sqNum],"sound":sound};
		activeSounds.push(currentSound);	//add the id to the list of active cues
		// console.log(activeSounds);
		setSndCueStatus(sqNum, "playing");

		if(currentSound.data.in > 0){
			console.log("fading in...");
			currentSound.sound.fade(currentSound.data.startvol/100, currentSound.data.vol/100, currentSound.data.in*1000);
			setSndCueStatus(sqNum, "fading");
			// currentSound.sound.fade(currentSound.data.startvol, currentSound.data.vol, currentSound.data.in*1000);
		}
		

		if(currentSound.data.hold !== ""){
			console.log("holding for ..." + currentSound.data.hold);
			clearSoundTimers();	//clear any existing fade timers... there can be only one holding...
			var t = setTimeout(function(){ 
				if(currentSound.sound.playing()){
					console.log("auto fading...");
					currentSound.sound.fade(currentSound.sound.volume(), currentSound.data.endvol/100, currentSound.data.out*1000);
					setSndCueStatus(currentSound.num, "fading");
				}else{
					console.log("already stopped, so not fading...");
				}
			}, currentSound.data.hold*1000);
			timers.push(t);
		}

		if(activeSounds.length > 1){
			var s1 = activeSounds[0];	//the first one in the list
			if(s1.data.out > 0){
				console.log("fading out the previous sound...");
				s1.sound.fade(s1.sound.volume(), 0, s1.data.out*1000);	//start the fade out according to the cue data
				setSndCueStatus(s1.num, "fading");
			}else{
				console.log("stopping the previous sound...");
				s1.sound.stop();
			}
			// console.log(activeSounds);
		}

	} catch(err) {
		console.log("error playing sound file:");
		console.log(err);
	}
}

function sndFadeAll(){
	console.log("fading out all sounds");
	for (var i = 0; i < activeSounds.length; i++) {
		var s = activeSounds[i];
		s.sound.fade(s.sound.volume(), 0, 3000);
		setSndCueStatus(s.num, "fading");
	}
	clearSoundTimers();
}

function sndStopAll(){
	setSndCueStatus(null, "clear");
	Howler.unload();
}

function clearSoundTimers(){
	for (var i = 0; i < timers.length; i++) {
		var t = timers[i];
		clearTimeout(t);
	}
}

//******* CUE MODIFICATION FUNCTIONS
function addLxCue(){
	var levels = {};
	$(".chan_level").each(function(){
		// var slider = $(this);
		// var val = $(this).val();
		// console.log(val);
		// console.log(slider);
		// if(val > 0){
		var chan_levels = $(this).data('levels');
		console.log(chan_levels);
		levels[$(this).data("chan")] = chan_levels;
		// }
	});
	// console.log("new levels to save");
	// console.log(levels);
	// return false;
	var newCueNum = show.lx.length;

	var newCue = {
    	"name": "LX " + (newCueNum),
    	"desc": "",
    	"in":3,
    	"out":3,
    	"af":"",
    	"snd":"",
		"levels": levels
    };

    show.lx.push(newCue);
    updateLxCuelist();
    $("#lx_next_cue").val(newCueNum);
    lxCueGo(0);
}


function saveLxCue(cueNum){
	console.log("saving cuenum: " + cueNum);
	if (cueNum===undefined) cueNum=lxActiveCue;
	var levels = {};
	$(".chan_level").each(function(){
		// var slider = $(this);
		var chan_levels = $(this).data('levels');
		console.log(chan_levels);
		levels[$(this).data("chan")] = chan_levels;
	});

    show.lx[cueNum].levels = levels;
    updateLxCuelist();
	$("#lx_next_cue").val(cueNum);
    lxCueGo(0);
}

function updateLxData(cueNum, dataPart, value, chan, levels){
	console.log(arguments);
	if(dataPart === "chan" && chan !== null){
		console.log(show.lx[cueNum]);
		if(typeof levels !== 'undefined'){
			console.log("saving these new levels:");
			console.log(levels);
			show.lx[cueNum].levels[chan] = levels;
		}else{
			show.lx[cueNum].levels[chan].Intensity = value;
		}
		console.log(show.lx[cueNum]);
	}else{
		show.lx[cueNum][dataPart] = value;
	}
}

function lxMove(dir){
	var selectedCueNum = $("#lx_datagrid tr.selected").first().data("lx");
	if((dir === -1 && selectedCueNum > 0) || (dir===1 && selectedCueNum < show.lx.length-1)){
		show.lx.move(selectedCueNum, selectedCueNum+dir);
		updateLxCuelist();
		$("#lx_datagrid tr").removeClass('selected');
		$("#lx_datagrid tr[data-lx='"+(selectedCueNum+dir)+"']").addClass("selected");
	}
}

function lxDelete(){
	var selectedCueNum = $("#lx_datagrid tr.selected").first().data("lx");
	if(typeof selectedCueNum !== "undefined" && selectedCueNum > 0 && show.lx.length > 1){
		bootbox.confirm("Are you sure you want to delete Cue# " + selectedCueNum + "?", function(result){
			if(result===true){
				show.lx.splice(selectedCueNum, 1);
				updateLxCuelist();
			}
		});
	}
}


function updateSndData(cueNum, dataPart, value){
	console.log(arguments);
	show.snd[cueNum][dataPart] = value;

}


function addSndCue(){
	var newCueNum = show.snd.length;

	var newCue = {
      "name": "Snd " + newCueNum,
      "desc": "",
      "file": "",
      "startvol": 0,
      "in": 0,
      "vol": 100,
      "hold": "",
      "out": 3,
      "endvol": 0
    };

    show.snd.push(newCue);
    sndActiveCue = newCueNum;
    updateSndCuelist();
    // $("#snd_next_cue").val(newCueNum);
}

function sndMove(dir){
	var selectedCueNum = $("#snd_datagrid tr.selected").first().data("snd");
	if((dir === -1 && selectedCueNum > 0) || (dir===1 && selectedCueNum < show.snd.length-1)){
		show.snd.move(selectedCueNum, selectedCueNum+dir);
		updateSndCuelist();
		$("#snd_datagrid tr").removeClass('selected');
		$("#snd_datagrid tr[data-snd='"+(selectedCueNum+dir)+"']").addClass("selected");
	}
}

function sndDelete(){
	var selectedCueNum = $("#snd_datagrid tr.selected").first().data("snd");
	if(typeof selectedCueNum !== "undefined" && selectedCueNum > 0 && show.snd.length > 1){
		bootbox.confirm("Are you sure you want to delete Cue# " + selectedCueNum + "?", function(result){
			if(result===true){
				show.snd.splice(selectedCueNum, 1);
				updateSndCuelist();
			}
		});
	}
}




//********* PATCH FUNCTIONS *********
function showPatchWindow(){
	console.log("showing patch window");
	console.log(show.patch);
	tempPatch = show.patch;	//assign the current patch to the tempPatch for working on...
	updatePatchList();
	$('#patchwindow').modal();
}

function patchReset(zero){
	console.log("getting channel number");
	bootbox.prompt({
		title: "How many LX Control Sliders? (1-96)",
		inputType: 'number',
		callback: function (result) {
			console.log(result);
			if(result>0 && result<= 96){
				show.channels = result;

				console.log("resetting patch for channels:", show.channels);
				tempPatch = {};
				for (let index = 0; index < result; index++) {
					tempPatch[index] = {
						"dim": (zero==true) ? 0 : (index+1),
						"type":"Standard"
					};
				}

				updatePatchList();
				// $(".patch_dimmer").attr("max", show.channels);
				// $(".patch_row").each(function(){
				// 	var i = $(this).data("dim");
				// 	console.log(i);
				// 	if(i<=show.channels){
				// 		$(this).find(".patch_dimmer").val(i);
				// 	}else{
				// 		$(this).find(".patch_dimmer").val("");
				// 	}
				// });
				// $(".patch_row select").val("Standard");

			}else{
				bootbox.alert("Please choose a valid number of channels: 1-96");
			}
		}
	});


}

function patchClear(){

	bootbox.prompt({
		title: "How many LX Control Sliders? (1-96)",
		inputType: 'number',
		callback: function (result) {
			console.log(result);
			if(result>0 && result<= 96){
				show.channels = result;
			
				console.log("clearing patch");
				$(".patch_dimmer").val("");
				$(".patch_dimmer").attr("max", show.channels);
				$(".patch_row select").val("Standard");
				// updateTempPatch();

			}else{
				bootbox.alert("Please choose a valid number of channels: 1-96");
			}
		}
	});

}


function updatePatchList(){

	// clear the list completely
	//setup the patch list popup
	console.log(tempPatch);
	
	$("#patchlist tbody").empty();

	$.each( tempPatch, function( c, patch_data ){
		c=parseInt(c);
		console.log("chan / dimmers:", c , patch_data.dim);
		var type = 	patch_data.type;
		var type_channels = show.types[type].channels;
		
    	var row = '<tr class="patch_row" data-ch="'+c+'">';
		row += '<td>'+(c+1)+'</td>';
		row += '<td><input type="number" min="1" max="512" class="patch_dimmer" value="'+patch_data.dim+'"/></td>';
		
		row += '<td><select class="ch_type">';
		$.each( show.types, function( rowtype, type_data ){
			var selected = type==rowtype ? "selected" : "";
			row += '<option class="form-control" value="'+rowtype+'" '+selected+'>'+rowtype+'</option>';
		});
		row += '</select></td>';
		
		row += '<td class="dim_range"></td>';
		
		row += '</tr>';
		$("#patchlist tbody").append(row);
    });
	

	// ALSO UPDATE THE RANGES ON EACH CHANNEL ROW
	updateAllPatchRanges();

}

function updateAllPatchRanges(){
	$.each( tempPatch, function( c, patch_data ){
		updatePatchRowRange(c);
	});
	checkRangeConflicts();
}

function updatePatchRowRange(rowID, checkConflicts){
	var row = $(".patch_row[data-ch='"+ rowID +"']");
	var start_dim = parseInt(row.find(".patch_dimmer").val());
	var type = row.find("select.ch_type").val();
	var type_channels = show.types[type].channels;

	var range = "";
	for(var i=0; i<type_channels.length; i++ ){
		if(type_channels[i]){
			range += "<span class='range_dim'  data-dim='"+(start_dim+i)+"' data-ch='"+rowID+"'>";
			range += (start_dim+i)
			range += "</span> "
		}
	}
	row.find(".dim_range").html(range);

	if(checkConflicts) checkRangeConflicts();
}

function checkRangeConflicts(){
	$("#patchlist .range_dim").removeClass("conflict");
	
	$("#patchlist .range_dim").each(function(){
		var $item = $(this);
		var dim = $item.data('dim');
		var ch = $item.data('ch');
		// console.log("checking conflicts for dimmer", dim);
		
		$("#patchlist .range_dim").each(function(){
			var $check_item = $(this);
			var check_dim = $check_item.data('dim');
			var check_ch = $check_item.data('ch');
			if(ch != check_ch && dim==check_dim){
				// console.log("conflict!")
				$item.addClass("conflict");
				$check_item.addClass("conflict");
			}
		});

	});
}

function updateTempPatch(){
	// console.log("updatting temp patch: ");
	// console.log(tempPatch);
	// var buildPatch = {};
	// // $(".patch_row").each(function(){
	// for (var c = 1; c <= 512; c++) {
	// 	// console.log("dimmer: " + c);
	// 	var row = $(".patch_row[data-dim='"+ c +"']");
		
	// 	var type = row.find("select").val();
	// 	var type_channels = show.types[type].channels;
	// 	// console.log("num channels: " + type_channels.length);

	// 	//also change the next few rows if needed, and bump up the counter...
	// 	for (var i = 0; i < type_channels.length; i++) {
	// 		row = $(".patch_row[data-dim='"+ (c+i) +"']");
	// 		// console.log(row);
			
	// 		var dimmer = row.data("dim");
	// 		var chan = parseInt(row.find(".patch_slider").val())-1;
			
	// 		// row.find("input.patch_slider").val(c+1+i);
	// 		// row.find("option[value='"+type+"']").prop("selected", true);
	// 		// row.find(".ch_details").text(type_channels[i]);
			
	// 		// if(i>0){	//for any channels above the first channel
	// 		// 	console.log("disabling ch: " + i);
	// 		// 	row.find("input.patch_slider").val("");	//clear it out instead 
	// 		// 	row.find("input.patch_slider").attr('disabled', 'disabled');
	// 		// 	row.find("select").attr('disabled', 'disabled');
	// 		// }
			

	// 		if(dimmer!==0 && !isNaN(dimmer) && !isNaN(chan)){
	// 			var instrument = {
	// 				"dim":dimmer,
	// 				"type":type
	// 			};
	// 			// console.log("Chan: "+chan);
	// 			// console.log(instrument);
	// 			buildPatch[chan] = instrument;	//assign it back to the tempPatch
	// 		}

	// 		if(i === (type_channels.length-1)){
	// 			// console.log("incrementing outer counter c to c+i: " + i);
	// 			c = (c+i);	//update the outer loop to the counter of the inner.
	// 		}
	// 	}

	// }
	// console.log(buildPatch);
	// tempPatch = buildPatch;	//assign it back to temp
	// updatePatchList();
}

function savePatch(){
	// updateTempPatch();
	tempPatch={};
	$("#patchlist .patch_row").each(function(){
		var row = $(this);
		var chan = row.data("ch");
		var dimmer = parseInt(row.find(".patch_dimmer").val());
		var type = row.find(".ch_type").val();
		var instrument = {
			"dim":dimmer,
			"type":type
		};
		console.log("Adding Patch: ", chan, instrument);
		tempPatch[chan] = instrument;	//assign it back to the tempPatch
	});

	show.patch = tempPatch;	//assign it all back to the main show patch "saving" it.
	
	api.send( 'sendShow', show );	//send back to main just in case...
	initializeShow(show);	//at this end, reinit the UI
}

//  ***** END PATCH



function startUp(){
	console.log("STARTUP: current settings.activeFile", settings.activeFile);
	//***** LOAD THE SHOW
	try{	
		if(settings.activeFile !== undefined && settings.activeFile !== ""){
			bootbox.confirm("Would you like to load the last used file: " + settings.activeFile, function(answer){
				if(answer === true){
					// readShowFile(settings.activeFile);
					api.send( 'openShowFile', settings.activeFile );
					
				}else{
					// readShowFile('new');
					api.send( 'newShowFile');
				}
			});
		}else{
			// readShowFile('new');
			api.send( 'newShowFile');
		}
		// console.log(show);
	}catch (err) {
		bootbox.alert("error: " + err);
	}
}











// ***** UTILITY FUNCTIONS
// ***** UTILITY FUNCTIONS
// ***** UTILITY FUNCTIONS


dmx_to_percent = function(val){
	return Math.round((val / 255) * 100);
}

percent_to_dmx = function(val){
	return Math.round((val / 100) * 255);
}

componentToHex = function(c) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

rgbToHex = function(r, g, b) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

colorLevelsToHex = function(r,g,b){
	r = percent_to_dmx(r);
	g = percent_to_dmx(g);
	b = percent_to_dmx(b);
	return rgbToHex(r, g, b);
}

getUUID = function(){
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
	console.log("generated uuid: " + uuid);
	return uuid;
}

containsAll = function(needles, haystack){
	var success = needles.every(function(val) {
		return haystack.indexOf(val) !== -1;
	});
	return success;
}






// ********* TEST FUNCTION
function test(p1, p2){
	console.log("TESTING RENDERER", p1, p2);
}


// TODO! THESE HAVE BEEN MOVED TO MAIN... NEED TO BE ADJUSTED

function readShowFile(filetype){
	// console.log("readShowFile", filetype);
	// statusNotice("Reading File: " + filetype, false, false);
	// var file = readFile(filetype);
	// var showData = file.data;
	// if(JSON.parse(showData)){
	// 	show = JSON.parse(showData);
	// 	settings.activeFile = (filetype=='new') ? "" : file.path;
	// 	updateSettings();

	// 	initializeShow();
	// }else{
	// 	bootbox.alert("Invalid show file. Please choose another.");
	// }
}

function readFile(filetype){
	// console.log(arguments);
	// var file;
	// if(filetype === "new"){
	// 	console.log("reading default setup file");
	// 	file = [settings.defaultShowFile];
	// }
	// else if(filetype !== "" && filetype !== undefined){
	// 	file = [filetype];
	// }
	// else{
	// 	console.log("choosing a file:");
	// 	file = dialog.showOpenDialog({properties: ['openFile']});

	// 	if(file===undefined) return false;
	// }

	// try {
	// 	//test to see if settings exist
	// 	console.log("reading file:");
	// 	console.log(file);

	// 	var path = file[0];
	// 	console.log(path);
	// 	fs.openSync(path, 'r+'); //throws error if file doesn't exist
	// 	var data=fs.readFileSync(path); //file exists, get the contents
	// 	// console.log(data);

	// 	return {"path":path, "data":data};
		
	// } catch (err) {
	// 	console.log("error! " + err);
	// 	return false;
	// }
}

function saveFile(existing) {
	// console.log("saveFile called");
	// if(existing===true && settings.activeFile !== "" && settings.activeFile !== undefined){
	// 	fileName = settings.activeFile;
	// 	fs.writeFile(fileName, JSON.stringify(show, null, 2), function(err) {
	// 		console.log("file saved: " + fileName);
	// 		settings.activeFile = fileName;
	// 		updateSettings();
	// 		updateStatusBar();
	// 	});
	// }else{
	
	// 	dialog.showSaveDialog({
	// 		filters: [{
	// 			name: 'show',
	// 			extensions: ['shw']
	// 		}]
	// 	}, function(fileName) {
	// 		if (fileName === undefined) return;
	// 		fs.writeFile(fileName, JSON.stringify(show, null, 2), function(err) {
	// 			dialog.showMessageBox({
	// 				message: "The file has been saved! :-)",
	// 				buttons: ["OK"]
	// 			});
	// 			settings.activeFile = fileName;
	// 			updateSettings();
	// 			updateStatusBar();
	// 		});
	// 	});
	// }
}

function requireJSON(filePath) {
	// try{
  	// 	return JSON.parse(fs.readFileSync(filePath, "utf8"));
	// }catch (err) {
	// 	console.log(err);
	// }
}
// END ADJUST


Array.prototype.move = function(from,to){
	console.log("moving from: " + from + " to: " + to);
  this.splice(to,0,this.splice(from,1)[0]);
  return this;
};


function statusNotice(text, type, permanent){
	console.log("Status Notice: " + text);
	previousStatus = $("#status-mid").text();

	permanent = (typeof permanent !== "undefined") ? permanent : false;

	$("#status-mid").text(text);
	$("#status-mid").css("font-weight","bold");
	$("#status-mid").css("opacity",1);

	if(type=="good"){
		$("#status-mid").css("color","#0C5F00");
		$("#status-mid").addClass("pulsate");
	}else if(type=="bad"){
		$("#status-mid").addClass("pulsate");
		$("#status-mid").css("color","#941E17");
	}else{
		$("#status-mid").removeClass("pulsate");
		$("#status-mid").css("color","black");
		$("#status-mid").css("font-weight","normal");
	}

	if(permanent === false){
		setTimeout(function(){ 
			$("#status-mid").fadeTo('slow', 0);
		 }, 5000);
	}
}



// ******** ABOUT SCREEN 
function showAbout(){
	$("#aboutScreen").show();
	// visitor.event("easycue", "about_us").send();
}

function goDonate(){
	api.send( 'openUrl', 'https://www.paypal.com/paypalme/drhoare' );
	$("#aboutScreen").hide();
	// visitor.event("easycue", "go_donate").send();
}
function goUrl(url){
	api.send( 'openUrl', url);
}


function evaluating(){
// visitor.event("easycue", "still_evaluating", function(){
	$("#aboutScreen").hide();
// }).send();
}

function thanks(){
	settings.donated = true;
	updateSettings();
	// visitor.event("easycue", "donated_thanks").send();
	$("#aboutScreen").hide();
	bootbox.alert("Thank you so very much for your support! I hope you enjoy EasyCue. Please let me know if there's anything I can do to improve it. Cheers!");
}
// ****** END of ABOUT screen








// ******
// GENERIC FUNCTION TO RUN RENDERER COMMANDS BASED ON MESSAGE FROM MAIN
api.handle( 'callRendererFunction', ( event, data ) => function( event, data ) {
    console.log( 'calling function', data )
	window[data.func].apply(this, data.params);
}); 




// PASS SETTINGS BACK AND FORTH

// SEND RENDERER settings back to MAIN
function updateSettings(){
    api.send( 'sendSettings', settings );
}

// receive settings pushed from Main
api.handle( 'sendSettings', ( event, data ) => function( event, data ) {
    console.log( 'received settings from MAIN', data )
    settings = data;
});

// getting settings...may not be needed because they can be pushed using above 'sendsettings' listener
async function getSettingsFromMain(){
    const result = await api.send( 'getSettings');
    console.log("received settings: ", result);
    settings = result;
};
// END OF SETTINGS FUNCTIONS



// PASS SETTINGS BACK AND FORTH

// SEND RENDERER settings back to MAIN
function updateShow(){
    api.send( 'sendShow', show );
}

// receive settings pushed from Main
api.handle( 'sendShow', ( event, data ) => function( event, data ) {
    console.log( 'received SHOW from MAIN', data )
    if(data) show = data;
});

// getting settings...may not be needed because they can be pushed using above 'sendsettings' listener
async function getShowFromMain(){
    const result = await api.send( 'getShow');
    console.log("received show: ", result);
    if(result) show = result;
};
// END OF SETTINGS FUNCTIONS




// receive new soundFile from picker
api.handle( 'fetchShowForSave', ( event, data ) => function( event, data ) {	//for main-initiated update
	console.log( 'fetchShowForSave :: sending the current SHOW, with a save action', data );
	
	api.send( 'sendShow', {show : show, action : data.action} );	//send the SHOW back to MAIN, with an action for it to continue with...

});









// Sync LIVE DMX universe data
async function getLive(){
    const result = await api.send( 'getLive');
    // console.log("received LIVE: ", result);
    console.log("received LIVE");
    live = result;
	updateAllSliders();
};
api.handle( 'sendLive', ( event, data ) => function( event, data ) {	//for main-initiated update
    console.log( 'received LIVE from MAIN', data )
    live = data;
});


// at the end of a DMX animation, this will be sent, with the updated live universe
api.handle( 'lxFinishedCue', ( event, data ) => function( event, data ) {	//for main-initiated update
    // console.log( 'received lxFinishedCue from MAIN', data )
    live = data;
	lxFinishedCue();
});


// trigger file-picker
async function chooseSoundFile(cue){
	api.send( 'chooseSoundFile', {cue:cue});
};

// receive new soundFile from picker
api.handle( 'chosenSoundFile', ( event, data ) => function( event, data ) {	//for main-initiated update
	console.log( 'received chosenSoundFile from MAIN', data );

	// $(this).closest("tr").find("span[data-part='file']").text(file.path);
	// var cueNum = $(this).closest("tr").data("snd");

	updateSndData(data.cue, "file", data.file);
	updateSndCuelist();
});




/**
 * test  Sending messages to Main
 * `data` can be a boolean, number, string, object, or array
 */
api.send( 'pingMain', 'RENDERER READY' );

/**
 * Receiving messages from Main
 */
api.handle( 'pingRenderer', ( event, data ) => function( event, data ) {
    console.log( 'received from MAIN', data )
});





