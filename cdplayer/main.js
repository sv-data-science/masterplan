const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const { isWin, TOOLS, NULL_DEVICE, detectCdDrive } = require('./tools');

let mainWindow;
let mpvProcess = null;
let ripProcess = null;
let cdStreamProcess = null; // cdparanoia ripping a track for playback (Windows)

// mpv IPC (pause/seek/volume/position). Named pipe on Windows, unix socket elsewhere.
const MPV_IPC = isWin ? '\\\\.\\pipe\\cdplayer-mpv' : path.join(os.tmpdir(), 'cdplayer-mpv.sock');
let mpvSocket = null;
let mpvPaused = false;
let mpvVolume = 80;
let mpvPoller = null;
let mpvPos = 0, mpvDur = 0;

function mpvSend(command, requestId) {
  if (!mpvSocket || mpvSocket.destroyed) return;
  const msg = { command };
  if (requestId) msg.request_id = requestId;
  try { mpvSocket.write(JSON.stringify(msg) + '\n'); } catch {}
}

function connectMpvIpc(attempt = 0) {
  if (!mpvProcess || attempt > 30) return;
  const sock = net.connect(MPV_IPC);
  sock.on('connect', () => {
    mpvSocket = sock;
    mpvSend(['set_property', 'volume', mpvVolume]);
    let buf = '';
    sock.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.request_id === 1 && typeof msg.data === 'number') mpvPos = msg.data;
          if (msg.request_id === 2 && typeof msg.data === 'number') mpvDur = msg.data;
          if (msg.request_id === 3 && typeof msg.data === 'boolean') {
            mpvPaused = msg.data;
            mainWindow?.webContents.send('playback-position', { pos: mpvPos, dur: mpvDur, paused: mpvPaused });
          }
        } catch {}
      }
    });
    mpvPoller = setInterval(() => {
      mpvSend(['get_property', 'time-pos'], 1);
      mpvSend(['get_property', 'duration'], 2);
      mpvSend(['get_property', 'pause'], 3);
    }, 500);
  });
  sock.on('error', () => { sock.destroy(); setTimeout(() => connectMpvIpc(attempt + 1), 100); });
}

function closeMpvIpc() {
  if (mpvPoller) { clearInterval(mpvPoller); mpvPoller = null; }
  if (mpvSocket) { try { mpvSocket.destroy(); } catch {} mpvSocket = null; }
  mpvPaused = false; mpvPos = 0; mpvDur = 0;
}

// Portable builds (electron-builder "portable" target) set
// PORTABLE_EXECUTABLE_DIR — storing config next to the .exe is what makes
// the USB copy truly portable. Otherwise fall back to the OS userData dir.
function configDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  return app.getPath('userData');
}

function configPath() {
  return path.join(configDir(), 'config.json');
}

function loadConfig() {
  try {
    const p = configPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return { libraryPath: path.join(os.homedir(), 'Music'), skin: 'winamp', mp3Quality: '192' };
}

function saveConfig(cfg) {
  const p = configPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
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
  const device = await detectCdDrive();
  if (isWin) return device ? { found: true, device } : { found: false };
  // Linux: probe with cd-info (libcdio).
  return new Promise((resolve) => {
    execFile(TOOLS.cdInfo, ['--no-header', '-q'], (err, stdout) => {
      resolve(err ? { found: false } : { found: true, device, raw: stdout });
    });
  });
});

let cdparanoiaAutosense = false; // set when -d <device> yields no TOC (libcdio/Windows quirks)
let tocFingerprint = 'unknown'; // set by get-cd-toc; keys the Windows playback cache

function formatTocTime(t) { // "03:21.35" (mm:ss.frames) -> "3:21"
  const m = t.match(/^(\d+):(\d+)\./);
  return m ? `${parseInt(m[1])}:${m[2]}` : t;
}

function parseToc(output) {
  const tracks = [];
  for (const line of output.split('\n')) {
    // Columns: track#  length-sectors [length-time]  begin-sector [begin-time]
    const m = line.match(/^\s+(\d+)\.\s+(\d+)\s+\[(\d+:\d+\.\d+)\]\s+(\d+)\s+\[\d+:\d+\.\d+\]/);
    if (m) {
      tracks.push({
        number: parseInt(m[1]),
        sectors: parseInt(m[2]),
        startSector: parseInt(m[4]),
        duration: formatTocTime(m[3]),
      });
    }
  }
  return tracks;
}

function runTocQuery(args) {
  return new Promise((resolve) => {
    execFile(TOOLS.cdparanoia, args, { timeout: 10000 }, (err, stdout, stderr) => {
      resolve(parseToc((stderr || '') + (stdout || '')));
    });
  });
}

ipcMain.handle('get-cd-toc', async () => {
  const device = await detectCdDrive();
  if (!device) return [];
  // libcdio's cd-paranoia requires a span argument even with -Q (without one
  // it prints usage and exits); classic cdparanoia accepts and ignores it.
  // Try the explicit device first, then fall back to autosense.
  let tracks = await runTocQuery(['-Q', '-d', device, '1']);
  if (tracks.length === 0) {
    tracks = await runTocQuery(['-Q', '1']);
    if (tracks.length > 0) cdparanoiaAutosense = true;
  }
  if (tracks.length > 0) {
    const last = tracks[tracks.length - 1];
    tocFingerprint = `${tracks.length}_${last.startSector + last.sectors}`;
  }
  return tracks;
});

// ── MusicBrainz Lookup ───────────────────────────────────────────────────────
// MusicBrainz Disc ID: SHA-1 over first/last track (hex), lead-out and the
// 99 track offsets (all +150 lead-in), base64 with MB's character swaps.
function musicBrainzDiscId(toc) {
  const leadout = toc[toc.length - 1].startSector + toc[toc.length - 1].sectors + 150;
  let s = (1).toString(16).toUpperCase().padStart(2, '0')
        + toc.length.toString(16).toUpperCase().padStart(2, '0')
        + leadout.toString(16).toUpperCase().padStart(8, '0');
  for (let i = 0; i < 99; i++) {
    const off = i < toc.length ? toc[i].startSector + 150 : 0;
    s += off.toString(16).toUpperCase().padStart(8, '0');
  }
  return crypto.createHash('sha1').update(s).digest('base64')
    .replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');
}

const MB_UA = 'CDPlayer/1.0 (sv.data.analytics@gmail.com)';

async function mbFetchJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': MB_UA } });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      console.error(`MusicBrainz HTTP ${res.status} (attempt ${attempt})`);
    } catch (e) {
      console.error(`MusicBrainz fetch failed (attempt ${attempt}):`, e.message);
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 1200));
  }
  return undefined; // server/network failure after retries
}

ipcMain.handle('lookup-cd', async (_, { discId, toc }) => {
  if (!toc || toc.length === 0) return null;

  const leadout = toc[toc.length - 1].startSector + toc[toc.length - 1].sectors + 150;
  const offsets = toc.map(t => t.startSector + 150);
  const tocStr = `1+${toc.length}+${leadout}+${offsets.join('+')}`;
  const id = musicBrainzDiscId(toc);

  // 1) Exact disc ID lookup — precise, no fuzzy matches.
  const byId = await mbFetchJson(`https://musicbrainz.org/ws/2/discid/${id}?fmt=json&inc=artists+recordings`);
  if (byId) {
    const rels = byId.releases || [byId];
    // Prefer a release where the matched medium has its own title
    // (bonus discs in special editions, e.g. "Easter Lily").
    const rel = rels.find(r => (r.media || []).some(m => m.title && (m.discs || []).some(d => d.id === id)))
             || rels.find(r => (r.media || []).some(m => (m.discs || []).some(d => d.id === id)))
             || rels[0];
    if (rel && rel.id) return formatMBRelease(rel, toc, id);
  }

  // 2) Fallback: TOC search, but only accept an EXACT offsets match — a
  //    fuzzy match would tag the ripped MP3s with the wrong album.
  const byToc = await mbFetchJson(`https://musicbrainz.org/ws/2/discid/-?toc=${tocStr}&fmt=json&inc=artists+recordings`);
  if (byToc && byToc.releases) {
    const exact = byToc.releases.find(r =>
      (r.media || []).some(m => (m.discs || []).some(d =>
        d.sectors === leadout && JSON.stringify(d.offsets) === JSON.stringify(offsets))));
    if (exact) return formatMBRelease(exact, toc, id);
    console.error('MusicBrainz: no exact TOC match among', byToc.releases.length, 'candidates');
  }
  return null;
});

// Search MusicBrainz by artist/album name (for discs whose lookup misses or
// matches the wrong release).
ipcMain.handle('search-musicbrainz', async (_, { artist, album }) => {
  const parts = [];
  if (artist) parts.push(`artist:"${artist.replace(/"/g, '')}"`);
  if (album) parts.push(`release:"${album.replace(/"/g, '')}"`);
  if (parts.length === 0) return [];
  const q = encodeURIComponent(parts.join(' AND '));
  const data = await mbFetchJson(`https://musicbrainz.org/ws/2/release/?query=${q}&fmt=json&limit=10`);
  if (!data || !data.releases) return [];
  return data.releases.map(r => ({
    id: r.id,
    title: r.title,
    artist: (r['artist-credit'] || []).map(a => a.name).join(''),
    date: r.date || '',
    trackCount: r['track-count'] || 0,
    media: (r.media || []).map(m => ({
      title: m.title || '',
      format: m.format || '',
      trackCount: m['track-count'] || 0,
    })),
  }));
});

// Load a chosen release's tracklist for the inserted disc.
ipcMain.handle('get-musicbrainz-release', async (_, { releaseId, toc }) => {
  if (!releaseId) return null;
  const rel = await mbFetchJson(`https://musicbrainz.org/ws/2/release/${releaseId}?fmt=json&inc=recordings+artists`);
  if (!rel || !rel.id) return null;
  return formatMBRelease(rel, toc, null);
});

function formatMBRelease(release, toc, discId) {
  const artist = release['artist-credit']?.[0]?.name || 'Unknown Artist';
  const year = release.date?.substring(0, 4) || '';
  const media = release.media || [];
  // Multi-disc sets (e.g. special editions with bonus CDs): pick the medium
  // that is actually in the drive — by disc ID, else by track count.
  let medium = null;
  if (discId) medium = media.find(m => (m.discs || []).some(d => d.id === discId));
  if (!medium && toc) medium = media.find(m => (m.tracks || []).length === toc.length);
  if (!medium) medium = media[0] || {};
  const title = medium.title || release.title || 'Unknown Album';
  const tracks = (medium.tracks || []).map((t, i) => ({
    number: i + 1,
    title: t.title || `Track ${i + 1}`,
    artist: t['artist-credit']?.[0]?.name || artist,
    duration: formatDuration(t.length),
    lengthMs: t.length,
  }));
  return { artist, title, year, genre: '', releaseId: release.id, tracks };
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── CD Playback via mpv ──────────────────────────────────────────────────────
ipcMain.handle('play-cd-track', async (_, trackNum) => {
  stopMpv();
  const device = await detectCdDrive();
  if (isWin) {
    // The shinchiro mpv builds have no CDDA support (no 'cdda' feature), so
    // cdda:// cannot work on Windows. Streaming cdparanoia's stdout into mpv
    // also fails: cd-paranoia never calls _setmode, so its stdout stays in
    // text mode on Windows and the CRT expands 0x0A bytes, corrupting the
    // audio (white noise). File output is opened with O_BINARY, so rip the
    // track to a temp WAV and play the file instead.
    const wavPath = await ripTrackForPlayback(device, trackNum);
    if (!wavPath) { mainWindow?.webContents.send('playback-ended'); return false; }
    mpvProcess = spawn(TOOLS.mpv, ['--no-video', '--really-quiet', '--input-ipc-server=' + MPV_IPC, wavPath]);
    watchMpv();
    return true;
  }
  const args = [`cdda:///${trackNum}`, '--no-video', '--really-quiet', '--input-ipc-server=' + MPV_IPC];
  if (device) args.push(`--cdrom-device=${device}`);
  mpvProcess = spawn(TOOLS.mpv, args);
  watchMpv();
  return true;
});

ipcMain.handle('stop-playback', () => { stopMpv(); return true; });

ipcMain.handle('toggle-pause', () => {
  if (!mpvProcess) return null;
  mpvPaused = !mpvPaused;
  mpvSend(['set_property', 'pause', mpvPaused]);
  return mpvPaused;
});

ipcMain.handle('seek-playback', (_, seconds) => {
  mpvSend(['seek', seconds, 'absolute']);
  return true;
});

ipcMain.handle('set-volume', (_, vol) => {
  mpvVolume = Math.max(0, Math.min(100, vol));
  mpvSend(['set_property', 'volume', mpvVolume]);
  return true;
});

ipcMain.handle('play-file', (_, filePath) => {
  stopMpv();
  mpvProcess = spawn(TOOLS.mpv, ['--no-video', '--really-quiet', '--input-ipc-server=' + MPV_IPC, filePath]);
  watchMpv();
  return true;
});

function watchMpv() {
  connectMpvIpc();
  mpvProcess.on('error', (e) => { console.error('mpv failed to start:', e.message); closeMpvIpc(); mpvProcess = null; });
  mpvProcess.stderr?.on('data', (d) => console.error('mpv:', d.toString().trim()));
  mpvProcess.on('exit', () => { closeMpvIpc(); mpvProcess = null; mainWindow?.webContents.send('playback-ended'); });
}

function stopMpv() {
  closeMpvIpc();
  if (cdStreamProcess) { try { cdStreamProcess.kill(); } catch {} cdStreamProcess = null; }
  if (mpvProcess) { try { mpvProcess.kill(); } catch {} mpvProcess = null; }
}

// Windows CD playback: rip one track to a cached temp WAV for mpv to play.
// -Z (no paranoia verification) keeps the wait to a few seconds; the RIP tab
// still uses full paranoia. Cached per disc (TOC fingerprint) + track.
async function ripTrackForPlayback(device, trackNum) {
  const cacheDir = path.join(os.tmpdir(), 'cdplayer-play-cache', tocFingerprint);
  fs.mkdirSync(cacheDir, { recursive: true });
  const wavPath = path.join(cacheDir, `track${trackNum}.wav`);
  if (fs.existsSync(wavPath)) return wavPath;
  const args = cdparanoiaAutosense
    ? ['-Z', String(trackNum), wavPath]
    : ['-d', device, '-Z', String(trackNum), wavPath];
  const ok = await new Promise((resolve) => {
    const proc = spawn(TOOLS.cdparanoia, args);
    cdStreamProcess = proc;
    proc.on('error', (e) => { console.error('cdparanoia playback rip failed:', e.message); if (cdStreamProcess === proc) cdStreamProcess = null; resolve(false); });
    proc.on('exit', (code) => { if (cdStreamProcess === proc) cdStreamProcess = null; resolve(code === 0); });
  });
  if (!ok) { try { fs.unlinkSync(wavPath); } catch {} return null; }
  return wavPath;
}

// ── CD Ripping ───────────────────────────────────────────────────────────────
// Output layout follows Sergio's library convention:
//   <outputDir>/<Artist>/<Album>/NN <Title>.mp3
ipcMain.handle('rip-cd', async (_, { tracks, metadata, quality, outputDir, onProgress }) => {
  if (ripProcess) return { error: 'Rip already in progress' };

  const device = await detectCdDrive();
  if (!device) return { error: 'No CD drive with a disc found' };

  const albumDir = path.join(
    outputDir,
    sanitizeFilename(metadata.artist || 'Unknown Artist'),
    sanitizeFilename(metadata.title || 'Unknown Album'),
  );
  fs.mkdirSync(albumDir, { recursive: true });

  // Fetch front cover art from the Cover Art Archive (if the disc was
  // identified) so lame can embed it in each MP3 — car stereos read the
  // embedded ID3 picture, like Windows Media Player rips.
  let coverPath = null;
  if (metadata.releaseId) {
    try {
      const res = await fetch(`https://coverartarchive.org/release/${metadata.releaseId}/front-500`, {
        headers: { 'User-Agent': 'CDPlayer/1.0 (sv.data.analytics@gmail.com)' },
      });
      if (res.ok && (res.headers.get('content-type') || '').startsWith('image/')) {
        coverPath = path.join(os.tmpdir(), 'cdplayer_cover.jpg');
        fs.writeFileSync(coverPath, Buffer.from(await res.arrayBuffer()));
      } else {
        console.error('Cover art fetch: HTTP', res.status);
      }
    } catch (e) { console.error('Cover art fetch failed:', e.message); }
  }

  const results = [];
  for (const track of tracks) {
    const safeName = sanitizeFilename(`${String(track.number).padStart(2,'0')} ${track.title}`);
    const wavPath = path.join(os.tmpdir(), `cdplayer_track${track.number}.wav`);
    const mp3Path = path.join(albumDir, `${safeName}.mp3`);

    // Rip to WAV
    await new Promise((resolve, reject) => {
      const ripArgs = cdparanoiaAutosense
        ? [`${track.number}`, wavPath]
        : ['-d', device, `${track.number}`, wavPath];
      ripProcess = spawn(TOOLS.cdparanoia, ripArgs);
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
        ...(coverPath ? ['--add-id3v2', '--ti', coverPath] : []),
        wavPath, mp3Path,
      ];
      ripProcess = spawn(TOOLS.lame, lameArgs);
      ripProcess.on('exit', code => {
        ripProcess = null;
        try { fs.unlinkSync(wavPath); } catch {}
        code === 0 ? resolve() : reject(new Error(`lame exited ${code}`));
      });
    });

    results.push({ track: track.number, path: mp3Path });
    mainWindow?.webContents.send('rip-progress', { done: track.number, total: tracks.length, path: mp3Path });
  }

  if (coverPath) { try { fs.unlinkSync(coverPath); } catch {} }
  return { results };
});

ipcMain.handle('cancel-rip', () => {
  if (ripProcess) { try { ripProcess.kill(); } catch {} ripProcess = null; }
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
