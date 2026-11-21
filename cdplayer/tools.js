// Platform layer: resolves bundled CLI tools (lame, mpv, cdparanoia, cd-info)
// and the CD drive, so main.js stays platform-agnostic.
//
// Bundled binaries live in resources/bin/<platform>/ during development and
// in <resourcesPath>/bin/<platform>/ in the packaged app (electron-builder
// extraResources). If a bundled binary is missing we fall back to PATH.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const isWin = process.platform === 'win32';

function binDir() {
  const packaged = process.resourcesPath && !process.defaultApp;
  const base = packaged ? process.resourcesPath : path.join(__dirname, 'resources');
  return path.join(base, 'bin', isWin ? 'win' : 'linux');
}

function toolPath(name) {
  const exe = isWin ? `${name}.exe` : name;
  const bundled = path.join(binDir(), exe);
  return fs.existsSync(bundled) ? bundled : exe;
}

const TOOLS = {
  get lame() { return toolPath('lame'); },
  get mpv() { return toolPath('mpv'); },
  get cdparanoia() { return toolPath('cdparanoia'); },
  get cdInfo() { return toolPath('cd-info'); },
};

const NULL_DEVICE = isWin ? 'NUL' : '/dev/null';

// Returns the CD device to pass to cdparanoia/mpv, or null if none found.
// Windows: drive letter like "D:" (first CD drive with media loaded).
// Linux: /dev/cdrom.
function detectCdDrive() {
  return new Promise((resolve) => {
    if (!isWin) return resolve('/dev/cdrom');
    execFile('powershell.exe', [
      '-NoProfile', '-Command',
      "(Get-CimInstance Win32_CDROMDrive | Where-Object { $_.MediaLoaded } | Select-Object -First 1).Drive",
    ], { timeout: 15000 }, (err, stdout) => {
      const drive = (stdout || '').trim();
      resolve(!err && /^[A-Za-z]:$/.test(drive) ? drive : null);
    });
  });
}

module.exports = { isWin, TOOLS, NULL_DEVICE, detectCdDrive };
