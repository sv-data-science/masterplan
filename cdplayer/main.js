const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let mpvProcess = null;
let ripProcess = null;

const CONFIG_PATH = path.join(os.homedir(), '.config', 'cdplayer', 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  return { libraryPath: path.join(os.homedir(), 'Music'), skin: 'winamp', mp3Quality: '192' };
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'renderer/assets/icons/icon.png'),
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── Config ──────────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (_, cfg) => { saveConfig(cfg); return true; });

ipcMain.handle('choose-library-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

// ── CD Detection ─────────────────────────────────────────────────────────────
ipcMain.handle('detect-cd', async () => {
  return new Promise((resolve) => {
    execFile('cd-info', ['--no-header', '-q'], (err, stdout) => {
      if (err) { resolve({ found: false }); return; }
      resolve({ found: true, raw: stdout });
    });
  });
});

ipcMain.handle('get-cd-toc', async () => {
  return new Promise((resolve) => {
    execFile('cdparanoia', ['-Q', '--output-wav', '/dev/null'], { timeout: 10000 }, (err, stdout, stderr) => {
      const lines = (stderr || '').split('\n');
      const tracks = [];
      for (const line of lines) {
        const m = line.match(/^\s+(\d+)\.\s+(\d+)\s+\[\d+:\d+\.\d+\]\s+(\d+)\s+\[(\d+:\d+\.\d+)\]/);
        if (m) {
          tracks.push({
            number: parseInt(m[1]),
            sectors: parseInt(m[2]),
            startSector: parseInt(m[3]),
            duration: m[4],
          });
        }
      }
      resolve(tracks);
    });
  });
});

// ── MusicBrainz Lookup ───────────────────────────────────────────────────────
ipcMain.handle('lookup-cd', async (_, { discId, toc }) => {
  // Try MusicBrainz disc ID lookup first, then TOC-based search
  const fetch = (await import('node-fetch')).default;
  const UA = 'CDPlayer/1.0 (sv.data.analytics@gmail.com)';

  // Build TOC string for MusicBrainz: firstTrack lastTrack leadoutOffset track1offset...
  if (toc && toc.length > 0) {
    try {
      const leadout = toc[toc.length - 1].startSector + toc[toc.length - 1].sectors + 150;
      const offsets = toc.map(t => t.startSector + 150).join('+');
      const tocStr = `1+${toc.length}+${leadout}+${offsets}`;
      const url = `https://musicbrainz.org/ws/2/discid/-?toc=${tocStr}&fmt=json&inc=artists+recordings`;
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const data = await res.json();
        if (data.releases && data.releases.length > 0) {
          return formatMBRelease(data.releases[0], toc);
        }
      }
    } catch (e) { console.error('MusicBrainz TOC lookup failed:', e.message); }
  }
  return null;
});

function formatMBRelease(release, toc) {
  const artist = release['artist-credit']?.[0]?.name || 'Unknown Artist';
  const title = release.title || 'Unknown Album';
  const year = release.date?.substring(0, 4) || '';
  const media = release.media?.[0];
  const tracks = (media?.tracks || []).map((t, i) => ({
    number: i + 1,
    title: t.title || `Track ${i + 1}`,
    artist: t['artist-credit']?.[0]?.name || artist,
    duration: formatDuration(t.length),
    lengthMs: t.length,
  }));
  return { artist, title, year, genre: '', tracks };
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── CD Playback via mpv ──────────────────────────────────────────────────────
ipcMain.handle('play-cd-track', (_, trackNum) => {
  stopMpv();
  mpvProcess = spawn('mpv', [
    `cdda:///${trackNum}`,
    '--no-video',
    '--really-quiet',
    `--cdrom-device=/dev/cdrom`,
  ]);
  mpvProcess.on('exit', () => { mpvProcess = null; mainWindow?.webContents.send('playback-ended'); });
  return true;
});

ipcMain.handle('stop-playback', () => { stopMpv(); return true; });

ipcMain.handle('play-file', (_, filePath) => {
  stopMpv();
  mpvProcess = spawn('mpv', ['--no-video', '--really-quiet', filePath]);
  mpvProcess.on('exit', () => { mpvProcess = null; mainWindow?.webContents.send('playback-ended'); });
  return true;
});

function stopMpv() {
  if (mpvProcess) { try { mpvProcess.kill('SIGTERM'); } catch {} mpvProcess = null; }
}

// ── CD Ripping ───────────────────────────────────────────────────────────────
ipcMain.handle('rip-cd', async (_, { tracks, metadata, quality, outputDir, onProgress }) => {
  if (ripProcess) return { error: 'Rip already in progress' };

  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  for (const track of tracks) {
    const safeName = sanitizeFilename(`${String(track.number).padStart(2,'0')} - ${track.title}`);
    const wavPath = path.join(os.tmpdir(), `cdplayer_track${track.number}.wav`);
    const mp3Path = path.join(outputDir, `${safeName}.mp3`);

    // Rip to WAV
    await new Promise((resolve, reject) => {
      ripProcess = spawn('cdparanoia', [`${track.number}`, wavPath]);
      ripProcess.on('exit', code => { ripProcess = null; code === 0 ? resolve() : reject(new Error(`cdparanoia exited ${code}`)); });
    });

    // Encode to MP3
    await new Promise((resolve, reject) => {
      const lameArgs = [
        '-b', quality,
        '--tt', track.title,
        '--ta', metadata.artist,
        '--tl', metadata.title,
        '--tn', String(track.number),
        '--ty', metadata.year || '',
        wavPath, mp3Path,
      ];
      ripProcess = spawn('lame', lameArgs);
      ripProcess.on('exit', code => {
        ripProcess = null;
        try { fs.unlinkSync(wavPath); } catch {}
        code === 0 ? resolve() : reject(new Error(`lame exited ${code}`));
      });
    });

    results.push({ track: track.number, path: mp3Path });
    mainWindow?.webContents.send('rip-progress', { done: track.number, total: tracks.length, path: mp3Path });
  }

  return { results };
});

ipcMain.handle('cancel-rip', () => {
  if (ripProcess) { try { ripProcess.kill('SIGTERM'); } catch {} ripProcess = null; }
  return true;
});

// ── MP3 Library ──────────────────────────────────────────────────────────────
ipcMain.handle('scan-library', async (_, libraryPath) => {
  const { parseFile } = await import('music-metadata');
  const files = walkDir(libraryPath, ['.mp3', '.flac', '.ogg', '.m4a', '.wav']);
  const tracks = [];

  for (const filePath of files) {
    try {
      const meta = await parseFile(filePath, { duration: true });
      const c = meta.common;
      tracks.push({
        path: filePath,
        title: c.title || path.basename(filePath, path.extname(filePath)),
        artist: c.artist || 'Unknown Artist',
        album: c.album || 'Unknown Album',
        year: c.year || '',
        genre: c.genre?.[0] || '',
        track: c.track?.no || 0,
        duration: formatDuration(meta.format.duration ? meta.format.duration * 1000 : 0),
        durationSec: Math.floor(meta.format.duration || 0),
      });
    } catch {}
  }
  return tracks;
});

ipcMain.handle('open-file-location', (_, filePath) => { shell.showItemInFolder(filePath); });

function walkDir(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full, exts));
    else if (exts.includes(path.extname(entry.name).toLowerCase())) results.push(full);
  }
  return results;
}

function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

// ── Window Controls ───────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('window-close', () => mainWindow?.close());
