const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  chooseLibraryPath: () => ipcRenderer.invoke('choose-library-path'),

  // CD
  detectCd: () => ipcRenderer.invoke('detect-cd'),
  getCdToc: () => ipcRenderer.invoke('get-cd-toc'),
  lookupCd: (args) => ipcRenderer.invoke('lookup-cd', args),

  // Playback
  playCdTrack: (n) => ipcRenderer.invoke('play-cd-track', n),
  playFile: (p) => ipcRenderer.invoke('play-file', p),
  stopPlayback: () => ipcRenderer.invoke('stop-playback'),
  onPlaybackEnded: (cb) => ipcRenderer.on('playback-ended', cb),

  // Ripping
  ripCd: (args) => ipcRenderer.invoke('rip-cd', args),
  cancelRip: () => ipcRenderer.invoke('cancel-rip'),
  onRipProgress: (cb) => ipcRenderer.on('rip-progress', (_, data) => cb(data)),

  // Library
  scanLibrary: (dir) => ipcRenderer.invoke('scan-library', dir),
  openFileLocation: (p) => ipcRenderer.invoke('open-file-location', p),

  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
