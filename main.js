// "use strict"
const electron = require('electron');
// Module to control application life.
const app = electron.app
console.log("local app path: " + app.getAppPath());
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow


const storage = require('electron-json-storage');
console.log("storing settings in: " + app.getPath('userData'));

//global variable.
global.sharedObj = {
  settings:
  {
    defaultShowFile: app.getAppPath() + "/default.shw",
    deviceType: "enttec-usb-dmx-pro",
    donated: "false",
    userid: ""
  }
};


storage.get('settings', function(error, data) {
  if (error) throw error;
  console.log(data);
  global.sharedObj = {settings: data};  //set the stored values back into the global variable

  //restore some constants just in case...
  global.sharedObj.settings.defaultShowFile = app.getAppPath() + "/default.shw";
});







// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1410,
    height: 800,
    'min-width': 500,
    'min-height': 200,
    'accept-first-mouse': true,
    'title-bar-style': 'hidden'
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  doEverything();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  console.log("closing...");
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
    app.quit()
  // }
})


app.on('quit', function () {
  console.log("quitting...");
  console.log(global.sharedObj.settings);
  //store default config settings
  storage.set('settings', global.sharedObj.settings, function(error) {
    if (error) throw error;
  });
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function doEverything(){

}