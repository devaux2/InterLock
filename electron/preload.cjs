const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('rams', {
  isElectron: true,
  appInfo: invoke('app:info'),
  getSettings: invoke('settings:get'),
  saveSettings: invoke('settings:save'),
  getLibrary: invoke('library:get'),
  saveLibrary: invoke('library:save'),
  listEvents: invoke('events:list'),
  getEvent: invoke('events:get'),
  saveEvent: invoke('events:save'),
  deleteEvent: invoke('events:delete'),
  duplicateEvent: invoke('events:duplicate'),
  pickAttachments: invoke('attachments:pick'),
  pickAsset: invoke('assets:pick'),
  fileExists: invoke('file:exists'),
  fileDataUrl: invoke('file:dataUrl'),
  printResources: invoke('print:resources'),
  exportPdf: invoke('export:run'),
  revealPath: invoke('shell:reveal'),
  openPath: invoke('shell:open'),
  openExternal: invoke('shell:openExternal'),
  checkUpdates: invoke('updates:check'),
});
