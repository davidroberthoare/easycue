// const {app,Menu} = require('electron');
const template = [
  {
    label: 'ShowFile',
    submenu: [
      {
        label: 'New',
        accelerator: 'CmdOrCtrl+N',
        click (item, focusedWindow) {
          console.log("menu clicked: " + item.label);
          bootbox.confirm("Clear the current show and start a new one?", function(result){ 
            if(result=== true) readShowFile('new');
          });
        }
      },
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click (item, focusedWindow) {
          console.log("menu clicked: " + item.label);
          readShowFile();
        }
      },
      {
        label: 'Save As...',
        accelerator: 'Shift+CmdOrCtrl+S',
        click (item, focusedWindow) {
          console.log("menu clicked: " + item.label);
          saveFile();
        }
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click (item, focusedWindow) {
          console.log("menu clicked: " + item.label);
          saveFile(true);
        }
      },
      {
        label: 'DMX Patch',
        click (item, focusedWindow) {
          console.log("menu clicked: " + item.label);
          showPatchWindow();
        }
      },
      {
        label: 'DMX Device',
        submenu: [
          {
            label: 'Entec USB-DMX PRO',
            value: 'enttec-usb-dmx-pro',
            click (item, focusedWindow) {
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
            click (item, focusedWindow) {
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
        click (item, focusedWindow) {
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
        click () { window.open("about.html", "","width=1000, height=650") }
      }
      ,{
        label: 'Visit EasyCue online',
        click () { require('electron').shell.openExternal('http://davidhoare.net/easycue') }
      }
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
 
module.exports = template;