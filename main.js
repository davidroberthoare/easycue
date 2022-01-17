// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain} = require('electron')
const fs = require('fs');
const utils = require('./utils.js');

// SET OPTIONS STORAGE
const storage = require('electron-json-storage');
console.log("storing settings in: " + app.getPath('userData'));


//global variable.
var settings = {
    defaultShowFile: app.getAppPath() + "/showfiles/default.shw",
    deviceType: "enttec-usb-dmx-pro",
    donated: "false",
    userid: ""
};


storage.get('settings', function(error, data) {
  if (error) throw error;
  console.log(data);
  settings = data;  //set the stored values back into the global variable

  //restore some constants just in case...
  settings.defaultShowFile = app.getAppPath() + "/default.shw";
});


// DMX FUNCTIONS
// DMX FUNCTIONS
// DMX FUNCTIONS

// DMX JAVASCRIPT
var DMX = require('./js/dmx.js');
var A = DMX.Animation;
var currentAnim = null;
var dmx = new DMX();
var universe = dmx.addUniverse('demo', 'null');
// var universe = dmx.addUniverse('demo', 'enttec-open-usb-dmx', '/dev/cu.usbserial-AL00DG7I');
// var universe = dmx.addUniverse('demo', 'enttec-usb-dmx-pro', '/dev/cu.usbserial-EN189208');
var live = universe.universe;


function chooseDeviceType(deviceType){
	statusNotice("Looking for device: " + deviceType);

	if(deviceType == "enttec-usb-dmx-pro"){
		var SerialPort = require('serialport');
		var found = false;
		
		SerialPort.list(function (err, ports) {
			ports.forEach(function(port) {
				console.log(port.comName);
				console.log(port.manufacturer);
				if(port.comName.indexOf("usbserial") > -1 && port.manufacturer == "ENTTEC"){
					console.log("found the device on a port");
					found = port.comName;
				}
			});

			console.log("found? " + found);

			if(found === false){
				deviceNotFound(deviceType);
				return false;
			}else{
				console.log("testing to see if port's open...");

				var testport = new SerialPort(found, function (err) {
					console.log("opening test port...");
				  
				  if (err) {
				  	console.log("Error opening port: " + err.message);
				  	deviceNotFound(deviceType, "Error opening port: " + err.message);
					return false;
				  }

				  testport.close(function(){
					  	console.log("testport closed... ready to continue");
						console.log("attaching to universe:")
						console.log(found)

						universe = dmx.addUniverse('demo', 'enttec-usb-dmx-pro', found);
						statusNotice("Found and activated: " + deviceType, "good");
						// // then activate whatever universe is loaded
						settings.deviceType = deviceType;	//save it for next time...
						updateSettings();
						live = universe.universe;	//reset what 'live' is based on the chosen universe...
						initializeShow();
					});

			  	});
			}
		  
		});
	}



	else if(deviceType == "enttec-open-usb-dmx"){
		deviceNotFound(deviceType, "Sorry! We currently do not have an active driver for this device.");
	}
	


	else{	//null
		deviceType = "null";
		universe = dmx.addUniverse('demo', 'null');
		statusNotice("Using offline test mode", "good");
		settings.deviceType = deviceType;	//save it for next time...
		updateSettings();
		live = universe.universe;	//reset what 'live' is based on the chosen universe...
		initializeShow();
	}
	
	
}

function deviceNotFound(type, error){
	error = (typeof error !== "undefined") ? error : "No "+type+" device could be found...";
	bootbox.alert(error + "<br>Try restarting this program, or re-plugging the device into a different port and selecting the device type again, or restarting the computer.");
	chooseDeviceType("null");
}








// setup the menu
const template = require("./menu.js");
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)


let mainWindow;


const path = require('path')

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1410,
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
  mainWindow.webContents.send( 'pingRenderer', "MAIN is ready" );
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
  console.log("quitting...");
  console.log(settings);
  //store default config settings
  storage.set('settings', settings, function(error) {
    if (error) throw error;
  });
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


//******* UTILITY FUNCTIONS *************
//******* UTILITY FUNCTIONS *************
//******* UTILITY FUNCTIONS *************


ipcMain.handle( 'sendSettings', async ( event, data ) => {
  console.log( 'received settings from RENDERER', data )
  settings = data;
} )

function sendSettings(){
  mainWindow.webContents.send( 'sendSettings', settings );
}

ipcMain.handle( 'getSettings', async ( event, data ) => {
 return settings;
} )

 /**
  * Receiving test messages from Renderer
  */
 ipcMain.handle( 'pingMain', async ( event, data ) => {
    console.log( 'received from RENDERER', data )
  } )

  
  


 
//****** analytics
var ua = require('universal-analytics');
if(settings.userid === undefined || settings.userid === ""){	//if it doesn't exist, then create and store a new userid
	settings.userid = utils.getUUID();
	// updateSettings();
}
var visitor = ua('UA-90364369-1', settings.userid, {strictCidFormat: false});
visitor.event("easycue", "load").send();
