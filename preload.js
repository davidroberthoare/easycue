// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require('electron')


contextBridge.exposeInMainWorld( 'api', {
    send: ( channel, data ) => ipcRenderer.invoke( channel, data ),
    handle: ( channel, callable, event, data ) => ipcRenderer.on( channel, callable( event, data ) )
} )

console.log("PRELOAD process.resourcesPath", process.resourcesPath);
contextBridge.exposeInMainWorld( 'globals', {
    resourcesPath: process.resourcesPath
} )