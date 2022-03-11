// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const fs = require('fs');
const utils = require('./utils.js');


// SET OPTIONS STORAGE
const Store = require('electron-store');
const store = new Store();
console.log("storing settings in: ", app.getPath('userData'));


//global variable.
var settings = {
	defaultShowFile: app.getAppPath() + "/showfiles/default.shw",
	// deviceType: "enttec-usb-dmx-pro",
	deviceType: "null",
	donated: "false",
	userid: ""
};



// DMX FUNCTIONS
// DMX FUNCTIONS
// DMX FUNCTIONS

// DMX JAVASCRIPT
var DMX = require('dmx');
var Animator = DMX.Animation;
// new Animator().add(fullLevels, time).run(universe, lxFinishedCue);

var currentAnim = null;
var dmx = new DMX();
// var universe = dmx.addUniverse('demo', 'null');
// var universe = dmx.addUniverse('demo', 'enttec-open-usb-dmx', '/dev/cu.usbserial-AL00DG7I');
// var universe = dmx.addUniverse('demo', 'enttec-usb-dmx-pro', '/dev/cu.usbserial-EN189208');
// var live = universe.universe;



function chooseDeviceType(deviceType) {
	console.log("chooseDeviceType", deviceType)
	// statusNotice("Looking for device: " + deviceType);

	if (deviceType == "enttec-usb-dmx-pro") {
		var SerialPort = require('serialport');
		var found = false;

		// NEW SERIALPORTS FUNCTION
		SerialPort.list().then(function (ports) {

			ports.forEach(function (port) {
				console.log("PORT", port);
				if (port.manufacturer == "FTDI" && port.serialNumber && port.serialNumber.indexOf("EN") > -1) {
					console.log("found the device on a port");
					found = port.path;
				}
			});

			console.log("found? " + found);

			if (found === false) {
				deviceNotFound(deviceType);
				return false;
			} else {
				console.log("testing to see if port's open...");

				var testport = new SerialPort(found, function (err) {
					console.log("opening test port...");

					if (err) {
						console.log("Error opening port: " + err.message);
						deviceNotFound(deviceType, "Error opening port: " + err.message);
						return false;
					}

					testport.close(function () {
						console.log("testport closed... ready to continue");
						console.log("attaching to universe:")
						console.log(found)
						dmx = new DMX();
						universe = dmx.addUniverse('demo', 'enttec-usb-dmx-pro', found);
						statusNotice("Found and activated: " + deviceType, "good");
						// // then activate whatever universe is loaded
						settings.deviceType = deviceType;	//save it for next time...
						// updateSettings();
						// live = universe.universe;	//reset what 'live' is based on the chosen universe...
						// initializeShow();
					});

				});
			}


		}).catch(function (error) { 
			console.log("SERIALPORTS ERROR: ", error)
		});


	}



	else if (deviceType == "enttec-open-usb-dmx") {
		deviceNotFound(deviceType, "Sorry! We currently do not have an active driver for this device.");
	}



	else {	//null
		deviceType = "null";
		dmx = new DMX();
		universe = dmx.addUniverse('demo', 'null', 1, { dmx_speed: 1 });
		// statusNotice("Using offline test mode", "good");
		settings.deviceType = deviceType;	//save it for next time...
		// updateSettings();
		// live = universe.universe;	//reset what 'live' is based on the chosen universe...
		// initializeShow();
	}


}

function deviceNotFound(type, error) {
	error = (typeof error !== "undefined") ? error : "No " + type + " device could be found...";
	doAlert(error + "\nTry restarting this program, or re-plugging the device into a different port and selecting the device type again, or restarting the computer.");
	chooseDeviceType("null");
}



// LOAD past saved settings (if any) and choose the device based on that
if(store.has('settings')){
	data = store.get('settings');
	console.log("read Settings from storage:", data)
	// test for at least one property
	if(data.defaultShowFile && data.deviceType) {
		settings=data;	//assign it to the global
	}else{
		console.log("bad settings file")	//otherwise just go with the default defined above
	}

}else{
	console.error("no Settings file");
}
//***** activated last-used device
chooseDeviceType(settings.deviceType);
// chooseDeviceType("null");

// storage.get('settings', function (error, data) {
// 	console.log("got settings from storage:", data)
// 	if (error) {
// 		console.error("error fetching settings", error, data);
// 		throw error;
// 	}
// 	if (data) {
// 		settings = data;  //set the stored values back into the global variable
// 	}
// 	//restore some constants just in case...
// 	settings.defaultShowFile = app.getAppPath() + "/showfiles/default.shw";

	
// 	//***** activated last-used device
// 	chooseDeviceType(settings.deviceType);
// 	// chooseDeviceType("null");

// });






// setup the menu
// const template = require("./menu.js");
const template = [
	{
		label: 'ShowFile',
		submenu: [
			{
				label: 'New',
				accelerator: 'CmdOrCtrl+N',
				click(item, focusedWindow) {
					console.log("menu clicked: " + item.label);
					promptNewFile();
				}
			},
			{
				label: 'Open',
				accelerator: 'CmdOrCtrl+O',
				click(item, focusedWindow) {
					console.log("menu clicked: " + item.label);
					openShowFile();
				}
			},
			{
				label: 'Save As...',
				accelerator: 'Shift+CmdOrCtrl+S',
				click(item, focusedWindow) {
					console.log("menu clicked: " + item.label);
					startSaveFile('saveAs')
				}
			},
			{
				label: 'Save',
				accelerator: 'CmdOrCtrl+S',
				click(item, focusedWindow) {
					console.log("menu clicked: " + item.label);
					startSaveFile('save')
				}
			},
			{
				label: 'DMX Patch',
				click(item, focusedWindow) {
					console.log("menu clicked: " + item.label);
					// showPatchWindow();
					focusedWindow.webContents.send('callRendererFunction', { func: 'showPatchWindow', params: [] });
				}
			},
			{
				label: 'DMX Device',
				submenu: [
					{
						label: 'Entec USB-DMX PRO',
						value: 'enttec-usb-dmx-pro',
						click(item, focusedWindow) {
							console.log("menu clicked: " + item.value);
							chooseDeviceType(item.value);
						}
					},
					// {
					//   label: 'Entec OPEN USB-DMX',
					//   value: 'enttec-open-usb-dmx',
					//   click (item, focusedWindow) {
					//     console.log("menu clicked: " + item.value);
					//     chooseDeviceType(item.value);
					//   }
					// },
					{
						label: 'Offline / Testing',
						value: 'null',
						click(item, focusedWindow) {
							console.log("menu clicked: " + item.value);
							chooseDeviceType(item.value);
						}
					}
				]
			}
		]
	},
	{
		label: 'Edit',
		submenu: [
			{
				role: 'undo'
			},
			{
				role: 'redo'
			}
		]
	},
	{
		label: 'View',
		submenu: [
			{
				label: 'Reload',
				accelerator: 'CmdOrCtrl+R',
				click(item, focusedWindow) {
					if (focusedWindow) focusedWindow.reload()
				}
			},
			// {
			//   label: 'Toggle Developer Tools',
			//   accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
			//   click (item, focusedWindow) {
			//     if (focusedWindow) focusedWindow.webContents.toggleDevTools()
			//   }
			// },
			{
				role: 'togglefullscreen'
			}
		]
	},
	{
		role: 'window',
		submenu: [
			{
				role: 'minimize'
			},
			{
				role: 'close'
			}
		]
	},
	{
		role: 'help',
		submenu: [
			{
				label: 'About EasyCue',
				click(item, focusedWindow) {
					console.log("menu clicked: " + item.label);
					focusedWindow.webContents.send( 'callRendererFunction', {func:'showAbout', params:[]} );
				}
			}
			, {
				label: 'Visit EasyCue online',
				click() { require('electron').shell.openExternal('http://davidhoare.net/easycue') }
			}
			// , {
			// 	label: 'TEST',
			// 	click(event, focusedWindow, focusedWebContents) {
			// 		console.log("test menu function clicked", event, focusedWindow);
			// 		test();
			// 		// focusedWindow.webContents.send( 'callRendererFunction', {func:'test', params:['foo', 'bar']} );
			// 	}
			// }
		]
	}
];

if (process.platform === 'darwin') {
	template.unshift({
		label: app.getName(),
		submenu: [
			{
				role: 'about'
			},
			{
				type: 'separator'
			},
			{
				role: 'services',
				submenu: []
			},
			{
				type: 'separator'
			},
			{
				role: 'hide'
			},
			{
				role: 'hideothers'
			},
			{
				role: 'unhide'
			},
			{
				type: 'separator'
			},
			{
				role: 'quit'
			}
		]
	})
	// Window menu.
	template[4].submenu = [
		{
			label: 'Close',
			accelerator: 'CmdOrCtrl+W',
			role: 'close'
		},
		{
			label: 'Minimize',
			accelerator: 'CmdOrCtrl+M',
			role: 'minimize'
		},
		{
			label: 'Bring All to Front',
			role: 'front'
		}
	]
};

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)


let mainWindow;


const path = require('path');
const { setFdLimit } = require('process');

function createWindow() {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1600,
		height: 800,
		'min-width': 500,
		'min-height': 200,
		'accept-first-mouse': true,
		'title-bar-style': 'hidden',
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			preload: path.join(__dirname, 'preload.js')
		}
	})

	// and load the index.html of the app.
	mainWindow.loadFile('index.html')

	// Open the DevTools.
	mainWindow.webContents.openDevTools()

	// 
	mainWindow.webContents.send('pingRenderer', "MAIN is ready");
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	createWindow()

	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit()
})



app.on('quit', function () {
	console.log("quitting...saving settings", settings);
	//store default config settings
	store.set('settings', settings);
	// storage.set('settings', settings, function (error) {
	// 	if (error) throw error;
	// });
});


// ************ PROGRAM LOGIC
// ************ PROGRAM LOGIC
// ************ PROGRAM LOGIC

var show = {};


// ****** PROMPTING FUNCTIONS
function doAlert(message) {
	dialog.showMessageBox({
		message: message,
		type: "warning",
		title: "Notice!"
	})
}

function promptNewFile() {
	dialog.showMessageBox({
		message: "Clear the current show and start a new one?",
		type: "question",
		buttons: [
			"No, Cancel",
			"Yes, New Show"
		],
		defaultId: 0,
		title: "New Show?"
	}).then(result => {
		console.log("clicked", result)
		if (result.response === 1) newShowFile();
	});
}





// *** FILE READING & WRITING

function newShowFile() {
	console.log("newShowFile", settings);
	statusNotice("Creating New Show File", false, false);
	var file = readFile(settings.defaultShowFile);
	var newShow = JSON.parse(file.data)
	if (newShow) {
		settings.activeFile = file.path;
		show = newShow;	//save to the MAIN global
		updateSettings();

		initializeShow();

	} else {
		doAlert("Invalid show file. Please choose another.");
	}
}

function openShowFile(filepath) {
	if(!filepath){
		console.log("no file specified, so choosing...");
		dialog.showOpenDialog({ properties: ['openFile'] })
			.then(result => {
				console.log(result.canceled)
				if (result.canceled) return false;

				console.log("chose file", result.filePaths[0])
				var file = readFile(result.filePaths[0]);
				// console.log("Opened file", file);
				var newShow = JSON.parse(file.data)
				if (newShow) {
					settings.activeFile = file.path;
					show = newShow;	//save to the MAIN global
					updateSettings();

					initializeShow();

				} else {
					doAlert("Invalid show file. Please choose another.");
				}

			}).catch(err => {
				console.log(err)
			})
	
	}else{
		console.log("opening specified file", filepath)
		var file = readFile(filepath);
		// console.log("Opened file", file);
		var newShow = JSON.parse(file.data)
		if (newShow) {
			settings.activeFile = file.path;
			show = newShow;	//save to the MAIN global
			updateSettings();

			initializeShow();

		} else {
			doAlert("Invalid show file. Please choose another.");
		}
	}
	
	
}


function readFile(path) {
	console.log("readfile: ", path);

	try {
		fs.openSync(path, 'r+'); //throws error if file doesn't exist
		var data = fs.readFileSync(path, { encoding: "utf8" }); //file exists, get the contents
		// console.log("read fileData", data);

		return { "path": path, "data": data };

	} catch (err) {
		console.log("error! " + err);
		return false;
	}
}

// send a message to renderer to get the SHOW sent back and start the following action
function startSaveFile(action) {
	if (mainWindow && mainWindow.webContents) {
		mainWindow.webContents.send('fetchShowForSave', { action: action });
	}
}

function saveFile(existing) {
	console.log("saveFile called", settings);
	if (existing === true && settings.activeFile !== "" && settings.activeFile !== undefined) {
		console.log("Saving EXISTING FILE", settings.activeFile)
		var fileName = settings.activeFile;
		fs.writeFile(fileName, JSON.stringify(show, null, 2), function (err) {
			if (err) {
				console.log(err);
				return false;
			} else {
				console.log("file saved: " + fileName);
				settings.activeFile = fileName;
				updateSettings();
				statusNotice("File Saved", false, false);
				updateStatusBar();
			}
		});
	} else {
		console.log("Saving NEW FILE")

		dialog.showSaveDialog({
			filters: [{
				name: 'show',
				extensions: ['shw']
			}]
		}).then(result => {
			console.log(result)
			if (result.canceled) return false;
			var filename = result.filePath;
			console.log("chose file", filename)
			fs.writeFile(filename, JSON.stringify(show, null, 2), function (err) {
				// fs.writeFile(filename, "testing 123", 'utf8', function (err) {
				if (err) {
					console.log(err);
					return false;
				} else {
					dialog.showMessageBox({
						type: "info",
						title: "Saved",
						message: "The file has been saved! :-)",
						buttons: ["OK"]
					});
					settings.activeFile = filename;
					updateSettings();

					updateStatusBar();
				}
			});

		}).catch(err => {
			console.log(err)
		})


		// , function (fileName) {
		// 	if (fileName === undefined) return;
		// 	fs.writeFile(fileName, JSON.stringify(show, null, 2), function (err) {
		// 		dialog.showMessageBox({
		// 			message: "The file has been saved! :-)",
		// 			buttons: ["OK"]
		// 		});
		// 		settings.activeFile = fileName;
		// 		updateSettings();
		// 		// updateStatusBar();
		// 	});
		// });
	}
}

function requireJSON(filePath) {
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch (err) {
		console.log(err);
	}
}











//******* UTILITY FUNCTIONS *************
//******* UTILITY FUNCTIONS *************
//******* UTILITY FUNCTIONS *************

// ********* TEST FUNCTION
function test() {
	console.log("TESTING MAIN");
}



// ******** FUNCTIONS BETWEEN MAIN AND RENDERER
// ******** FUNCTIONS BETWEEN MAIN AND RENDERER
// ******** FUNCTIONS BETWEEN MAIN AND RENDERER

// SETTINGS
ipcMain.handle('sendSettings', async (event, data) => { //receive settings from renderer for some reaason...
	console.log('received settings from RENDERER', data)
	if (data) {
		settings = data;
	}
})

ipcMain.handle('getSettings', async (event, data) => { //return a request for the settings from this file...
	return settings;
})

function updateSettings(newSettings) {
	console.log("updateSettings", newSettings);
	if (newSettings) {
		settings = newSettings;	//update this MAIN global variable
		sendSettings();//also send them to RENDERER
	}
}
function sendSettings() {	//send it to the renderer
	console.log("sendSettings");
	if (mainWindow && mainWindow.webContents) {
		mainWindow.webContents.send('sendSettings', settings);
	}
}

// end settings



// SHOW
ipcMain.handle('sendShow', async (event, data) => { //receive settings from renderer for some reaason...
	console.log('received SHOW from RENDERER', data.show)
	if (data.show) {
		show = data.show;
	}

	console.log('with ACTION', data.action)
	if (data.action == 'saveAs') {
		saveFile()
	} else if (data.action == 'save') {
		saveFile(true)
	}
})

ipcMain.handle('getShow', async (event, data) => { //return a request for the settings from this file...
	return show;
})

function updateShow(newShow) {
	console.log("updateShow", newShow);
	if (newShow) {
		show = newShow;	//update this MAIN global variable
		sendShow();//also send them to RENDERER
	}
}
function sendShow() {	//send it to the renderer
	console.log("sendShow");
	if (mainWindow && mainWindow.webContents) {
		mainWindow.webContents.send('sendShow', show);
	}
}



// end SHOW



// *****UPDATE DMX UNIVERSE FROM RENDERER
ipcMain.handle('updateUniverse', async (event, data) => { //return current live settings...
	console.log("updateUniverse", data);
	universe.update({ [data.patchedChan]: data.newvalue });
})

ipcMain.handle('getLive', async (event, data) => { //return a request for the current LIVE DMX UNIVERSE...
	console.log("getLive");
	return universe.universe;
})

function sendLive() {	//send it to the renderer
	console.log("sendLive");
	if (mainWindow && mainWindow.webContents) {
		mainWindow.webContents.send('sendLive', universe.universe);
	}
}

// CHOOSE A FILE, triggered via REMOTE
ipcMain.handle('chooseSoundFile', async (event, data) => { //return a request for the current LIVE DMX UNIVERSE...
	console.log("chooseSoundFile", data.cue);
	
	dialog.showOpenDialog({ properties: ['openFile'] })
	.then(result => {
		console.log(result.canceled)
		if (result.canceled) return false;
		
		console.log("chose file", result.filePaths[0])
		if (mainWindow && mainWindow.webContents) {
				mainWindow.webContents.send('chosenSoundFile', { file: result.filePaths[0], cue: data.cue });
			}

		}).catch(err => {
			console.log(err)
		})


})


// trigger DMX Animation
ipcMain.handle('runDmxAnimation', async (event, data) => {
	console.log("starting animation", data);
	new Animator().add(data.levels, data.time).run(universe, function () {
		console.log("finished animation");
		mainWindow.webContents.send('lxFinishedCue', universe.universe);
	});
})


// FILE OPERATIONS
ipcMain.handle('openShowFile', async (event, data) => {
	console.log('received openShowFile from RENDERER', data)
	openShowFile(data);
})
ipcMain.handle('newShowFile', async (event, data) => {
	console.log('received newShowFile from RENDERER', data)
	newShowFile();
})




// duplicate function: statusNotice
function statusNotice(text, type, permanent) {
	console.log("StatusNotice: " + text);
	mainWindow.webContents.send('callRendererFunction', { func: 'statusNotice', params: [text, type, permanent] });
}

// duplicate function: updateStatusBar
function updateStatusBar() {
	mainWindow.webContents.send('callRendererFunction', { func: 'updateStatusBar', params: [] });
}


// duplicate function: initializeShow
// INIT the parts needed here, then send the show to the renderere
function initializeShow() {
	console.log("INITILIZING SHOW on MAIN");
	//load the first cue of the active show
	universe.updateAll(0);
	// universe.update(show.lx[0].levels);
	mainWindow.webContents.send('callRendererFunction', { func: 'initializeShow', params: [show] });	//start the GUI initializing
}

// ***** open a URL in the sustem browser
ipcMain.handle('openUrl', async (event, data) => { //return a request for the current LIVE DMX UNIVERSE...
	console.log("opening URL", data);
	require('electron').shell.openExternal(data);
})

/**
 * Receiving test messages from Renderer
 */
ipcMain.handle('pingMain', async (event, data) => {
	console.log('received from RENDERER', data)
})





//****** analytics
// var ua = require('universal-analytics');
// if(settings.userid === undefined || settings.userid === ""){	//if it doesn't exist, then create and store a new userid
// 	settings.userid = utils.getUUID();
// 	updateSettings();
// }
// var visitor = ua('UA-90364369-1', settings.userid, {strictCidFormat: false});
// visitor.event("easycue", "load").send();


