'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let config = {};
let cdTracks = [];
let cdMeta = null;
let currentTrackIdx = -1;
let isPlaying = false;
let playMode = 'cd'; // 'cd' | 'library'
let libraryTracks = [];
let filteredTracks = [];
let selectedArtist = null;
let isPaused = false;
let seekDur = 0;
let seeking = false;

// ── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  config = await window.api.getConfig();
  applySkin(config.skin || 'winamp');
  document.getElementById('skin-select').value = config.skin || 'winamp';
  document.getElementById('settings-lib-path').value = config.libraryPath || '';
  document.getElementById('settings-quality').value = config.mp3Quality || '192';
  document.getElementById('settings-skin').value = config.skin || 'winamp';
  document.getElementById('rip-output').value = config.libraryPath || '';
  document.getElementById('rip-quality').value = config.mp3Quality || '192';

  setupTabs();
  setupTitlebar();
  setupCdTab();
  setupRipTab();
  setupLibraryTab();
  setupSettingsTab();
  setupPlayback();
})();

// ── Skin ─────────────────────────────────────────────────────────────────────
function applySkin(skin) {
  document.getElementById('skin-css').href = `skins/${skin}.css`;
  config.skin = skin;
}

document.getElementById('skin-select').addEventListener('change', e => {
  applySkin(e.target.value);
  document.getElementById('settings-skin').value = e.target.value;
});

// ── Tabs ─────────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'library') refreshLibrary();
    });
  });
}

// ── Titlebar ──────────────────────────────────────────────────────────────────
function setupTitlebar() {
  document.getElementById('btn-minimize').onclick = () => window.api.minimize();
  document.getElementById('btn-maximize').onclick = () => window.api.maximize();
  document.getElementById('btn-close').onclick = () => window.api.close();
}

// ── CD Tab ───────────────────────────────────────────────────────────────────
function setupCdTab() {
  document.getElementById('btn-detect-cd').onclick = detectCd;
  document.getElementById('btn-mb-search').onclick = searchMusicBrainz;
  ['mb-artist', 'mb-album'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') searchMusicBrainz(); }));
}

async function detectCd() {
  setStatus('Detecting CD...');
  const disc = await window.api.detectCd();
  if (!disc.found) { setStatus('No CD found. Please insert a disc.'); return; }

  setStatus('Reading track list...');
  const toc = await window.api.getCdToc();
  if (!toc || toc.length === 0) { setStatus('Could not read CD tracks.'); return; }

  cdTracks = toc.map(t => ({ ...t, title: `Track ${t.number}` }));
  setStatus(`Found ${cdTracks.length} tracks. Looking up metadata...`);
  renderCdTracks();

  const meta = await window.api.lookupCd({ toc });
  if (meta) {
    cdMeta = meta;
    cdTracks = cdTracks.map((t, i) => ({ ...t, ...(meta.tracks[i] || {}), number: t.number }));
    document.getElementById('cd-artist').textContent = meta.artist;
    document.getElementById('cd-album').textContent = meta.title;
    document.getElementById('cd-year').textContent = meta.year;
    setStatus(`${meta.artist} — ${meta.title}`);
    updateCoverArt({ releaseId: meta.releaseId, artist: meta.artist, album: meta.title }, { np: false, cd: true });
    populateRipTracks();
  } else {
    cdMeta = { artist: 'Unknown Artist', title: 'Unknown Album', year: '', tracks: cdTracks };
    document.getElementById('cd-artist').textContent = 'Audio CD';
    document.getElementById('cd-album').textContent = `${cdTracks.length} tracks`;
    document.getElementById('cd-year').textContent = '';
    setStatus(`${cdTracks.length} tracks loaded (no metadata found)`);
    populateRipTracks();
  }
  renderCdTracks();
}

async function searchMusicBrainz() {
  const artist = document.getElementById('mb-artist').value.trim();
  const album = document.getElementById('mb-album').value.trim();
  const box = document.getElementById('mb-results');
  if (!artist && !album) { box.innerHTML = '<div class="mb-result-note">Type an artist or album first.</div>'; return; }
  box.innerHTML = '<div class="mb-result-note">Searching...</div>';
  const results = await window.api.searchMusicBrainz({ artist, album });
  if (!results || results.length === 0) { box.innerHTML = '<div class="mb-result-note">No matches.</div>'; return; }
  box.innerHTML = '';
  results.forEach(r => {
    const row = document.createElement('div');
    row.className = 'mb-result-row';
    const mediaNote = r.media.length > 1 ? ` · ${r.media.length} discs` : '';
    row.innerHTML = `<span>${esc(r.artist)} — ${esc(r.title)}</span><span class="mb-result-meta">${esc(r.date)} · ${r.trackCount} tracks${mediaNote}</span>`;
    row.addEventListener('click', () => applyMbRelease(r.id));
    box.appendChild(row);
  });
}

async function applyMbRelease(releaseId) {
  if (cdTracks.length === 0) { setStatus('Detect a CD first, then search.'); return; }
  setStatus('Loading release from MusicBrainz...');
  const toc = cdTracks.map(t => ({ number: t.number, startSector: t.startSector, sectors: t.sectors }));
  const meta = await window.api.getMusicBrainzRelease({ releaseId, toc });
  if (!meta) { setStatus('Could not load that release.'); return; }
  cdMeta = meta;
  cdTracks = cdTracks.map((t, i) => ({ ...t, ...(meta.tracks[i] || {}), number: t.number }));
  document.getElementById('cd-artist').textContent = meta.artist;
  document.getElementById('cd-album').textContent = meta.title;
  document.getElementById('cd-year').textContent = meta.year;
  setStatus(`${meta.artist} — ${meta.title}`);
  document.getElementById('mb-results').innerHTML = '';
  updateCoverArt({ releaseId: meta.releaseId, artist: meta.artist, album: meta.title }, { np: false, cd: true });
  populateRipTracks();
  renderCdTracks();
}

function renderCdTracks() {
  const container = document.getElementById('cd-tracks');
  container.innerHTML = '';
  cdTracks.forEach((track, idx) => {
    const row = document.createElement('div');
    row.className = 'track-row' + (idx === currentTrackIdx && playMode === 'cd' ? ' active playing' : '');
    row.dataset.idx = idx;
    row.innerHTML = `
      <span class="col-num"><span>${track.number}</span></span>
      <span class="col-title">${esc(track.title)}</span>
      <span class="col-dur">${track.duration || '—'}</span>
      <span class="col-act"><span class="play-icon" title="Play">&#9654;</span></span>
    `;
    row.addEventListener('dblclick', () => playTrackByIdx(idx));
    row.querySelector('.play-icon').addEventListener('click', () => playTrackByIdx(idx));
    container.appendChild(row);
  });
}

function setStatus(msg) { document.getElementById('cd-status').textContent = msg; }

// ── Rip Tab ───────────────────────────────────────────────────────────────────
function setupRipTab() {
  document.getElementById('btn-rip-browse').onclick = async () => {
    const p = await window.api.chooseLibraryPath();
    if (p) document.getElementById('rip-output').value = p;
  };
  document.getElementById('btn-rip-select-all').onclick = () =>
    document.querySelectorAll('.rip-track-cb').forEach(c => c.checked = true);
  document.getElementById('btn-rip-select-none').onclick = () =>
    document.querySelectorAll('.rip-track-cb').forEach(c => c.checked = false);
  document.getElementById('btn-start-rip').onclick = startRip;
  document.getElementById('btn-cancel-rip').onclick = async () => {
    await window.api.cancelRip();
    document.getElementById('rip-progress-section').style.display = 'none';
    document.getElementById('btn-start-rip').style.display = '';
    document.getElementById('btn-cancel-rip').style.display = 'none';
  };

  window.api.onRipProgress(({ done, total, path }) => {
    const pct = Math.round((done / total) * 100);
    document.getElementById('rip-progress-bar').style.width = pct + '%';
    document.getElementById('rip-progress-label').textContent = `Ripped track ${done} of ${total}...`;
    const log = document.getElementById('rip-log');
    log.innerHTML += `<div>✓ Track ${done}: ${path}</div>`;
    log.scrollTop = log.scrollHeight;
  });
}

function populateRipTracks() {
  document.getElementById('rip-artist').value = cdMeta?.artist || '';
  document.getElementById('rip-album').value = cdMeta?.title || '';
  document.getElementById('rip-year').value = cdMeta?.year || '';
  const container = document.getElementById('rip-track-checkboxes');
  container.innerHTML = '';
  cdTracks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'rip-check-row';
    row.innerHTML = `<input type="checkbox" class="rip-track-cb" value="${t.number}" checked/> <span>${t.number}.</span> <input type="text" class="rip-title-input" data-num="${t.number}" value="${esc(t.title)}"/>`;
    container.appendChild(row);
  });
}

async function startRip() {
  const selectedNums = [...document.querySelectorAll('.rip-track-cb:checked')].map(c => parseInt(c.value));
  if (selectedNums.length === 0) { alert('Select at least one track to rip.'); return; }

  const outputDir = document.getElementById('rip-output').value;
  if (!outputDir) { alert('Select an output folder.'); return; }
  if (cdTracks.length === 0) { alert('No CD loaded. Detect a CD first.'); return; }

  const quality = document.getElementById('rip-quality').value;
  const titleByNum = {};
  document.querySelectorAll('.rip-title-input').forEach(inp => {
    titleByNum[parseInt(inp.dataset.num)] = inp.value.trim();
  });
  const tracks = cdTracks
    .filter(t => selectedNums.includes(t.number))
    .map(t => ({ ...t, title: titleByNum[t.number] || t.title }));
  const editedArtist = document.getElementById('rip-artist').value.trim();
  const editedAlbum = document.getElementById('rip-album').value.trim();
  const meta = {
    ...(cdMeta || {}),
    artist: editedArtist || 'Unknown Artist',
    title: editedAlbum || 'Unknown Album',
    year: document.getElementById('rip-year').value.trim(),
  };
  // If the user corrected a wrong match, don't embed that release's cover.
  if (cdMeta && (editedArtist !== (cdMeta.artist || '') || editedAlbum !== (cdMeta.title || ''))) {
    meta.releaseId = null;
  }

  document.getElementById('rip-progress-section').style.display = '';
  document.getElementById('rip-log').innerHTML = '';
  document.getElementById('rip-progress-bar').style.width = '0%';
  document.getElementById('btn-start-rip').style.display = 'none';
  document.getElementById('btn-cancel-rip').style.display = '';

  const result = await window.api.ripCd({ tracks, metadata: meta, quality, outputDir });

  document.getElementById('btn-start-rip').style.display = '';
  document.getElementById('btn-cancel-rip').style.display = 'none';

  if (result.error) {
    document.getElementById('rip-progress-label').textContent = `Error: ${result.error}`;
  } else {
    document.getElementById('rip-progress-label').textContent = `Done! Ripped ${result.results.length} tracks.`;
    document.getElementById('rip-progress-bar').style.width = '100%';
  }
}

// ── Library Tab ───────────────────────────────────────────────────────────────
function setupLibraryTab() {
  document.getElementById('btn-refresh-lib').onclick = () => refreshLibrary(true);
  document.getElementById('lib-search').addEventListener('input', applyLibraryFilter);
}

async function refreshLibrary(force = false) {
  if (libraryTracks.length > 0 && !force) return;
  const libPath = config.libraryPath;
  if (!libPath) { document.getElementById('library-tracks').innerHTML = '<div style="padding:20px;color:var(--text-muted)">Set library folder in Settings.</div>'; return; }
  document.getElementById('library-tracks').innerHTML = '<div style="padding:20px;color:var(--text-muted)">Scanning...</div>';
  libraryTracks = await window.api.scanLibrary(libPath);
  applyLibraryFilter();
  buildArtistSidebar();
}

function buildArtistSidebar() {
  const artists = [...new Set(libraryTracks.map(t => t.artist))].sort();
  const sidebar = document.getElementById('sidebar-artists');
  sidebar.innerHTML = `<div class="sidebar-heading">Artists</div>
    <div class="sidebar-item ${!selectedArtist ? 'active' : ''}" data-artist="">All Artists (${libraryTracks.length})</div>`;
  artists.forEach(a => {
    const div = document.createElement('div');
    div.className = 'sidebar-item' + (selectedArtist === a ? ' active' : '');
    div.dataset.artist = a;
    div.textContent = a;
    div.title = a;
    div.onclick = () => { selectedArtist = a || null; buildArtistSidebar(); applyLibraryFilter(); };
    sidebar.appendChild(div);
  });
  sidebar.querySelector('[data-artist=""]').onclick = () => { selectedArtist = null; buildArtistSidebar(); applyLibraryFilter(); };
}

function applyLibraryFilter() {
  const q = document.getElementById('lib-search').value.toLowerCase();
  filteredTracks = libraryTracks.filter(t => {
    const matchArtist = !selectedArtist || t.artist === selectedArtist;
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q);
    return matchArtist && matchSearch;
  });
  renderLibraryTracks();
}

function renderLibraryTracks() {
  const container = document.getElementById('library-tracks');
  if (filteredTracks.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:var(--text-muted)">No tracks found.</div>';
    return;
  }
  container.innerHTML = '';
  filteredTracks.forEach((track, idx) => {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
      <span class="col-num"><span>${track.track || idx + 1}</span></span>
      <span class="col-title">${esc(track.title)}</span>
      <span class="col-artist">${esc(track.artist)}</span>
      <span class="col-album">${esc(track.album)}</span>
      <span class="col-dur">${track.duration}</span>
    `;
    row.addEventListener('dblclick', () => playLibraryTrack(idx));
    row.addEventListener('contextmenu', e => {
      e.preventDefault();
      window.api.openFileLocation(track.path);
    });
    container.appendChild(row);
  });
}

function playLibraryTrack(idx) {
  playMode = 'library';
  currentTrackIdx = idx;
  const track = filteredTracks[idx];
  window.api.playFile(track.path);
  isPaused = false;
  setNowPlaying(`${track.artist} — ${track.title}`);
  updateCoverArt({ filePath: track.path, artist: track.artist, album: track.album });
  document.querySelectorAll('#library-tracks .track-row').forEach((r, i) => {
    r.classList.toggle('active', i === idx);
    r.classList.toggle('playing', i === idx);
  });
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function setupSettingsTab() {
  document.getElementById('btn-settings-lib-browse').onclick = async () => {
    const p = await window.api.chooseLibraryPath();
    if (p) document.getElementById('settings-lib-path').value = p;
  };
  document.getElementById('btn-save-settings').onclick = async () => {
    config.libraryPath = document.getElementById('settings-lib-path').value;
    config.mp3Quality = document.getElementById('settings-quality').value;
    config.skin = document.getElementById('settings-skin').value;
    await window.api.saveConfig(config);
    applySkin(config.skin);
    document.getElementById('skin-select').value = config.skin;
    document.getElementById('rip-output').value = config.libraryPath;
    document.getElementById('rip-quality').value = config.mp3Quality;
    const saved = document.getElementById('settings-saved');
    saved.style.display = '';
    setTimeout(() => saved.style.display = 'none', 2000);
    libraryTracks = []; // force rescan
  };
}

// ── Playback Controls ─────────────────────────────────────────────────────────
function setupPlayback() {
  document.getElementById('btn-play').onclick = togglePlay;
  document.getElementById('btn-stop').onclick = stopAll;
  document.getElementById('btn-prev').onclick = prevTrack;
  document.getElementById('btn-next').onclick = nextTrack;

  const seek = document.getElementById('seek');
  seek.addEventListener('input', () => {
    seeking = true;
    document.getElementById('np-time').textContent = fmtTime((seek.value / 1000) * seekDur);
  });
  seek.addEventListener('change', () => {
    window.api.seekPlayback((seek.value / 1000) * seekDur);
    seeking = false;
  });

  document.getElementById('volume').addEventListener('input', (e) => {
    window.api.setVolume(Number(e.target.value));
  });

  window.api.onPlaybackPosition(({ pos, dur }) => {
    seekDur = dur || 0;
    if (!seeking) {
      seek.value = seekDur > 0 ? Math.round((pos / seekDur) * 1000) : 0;
      document.getElementById('np-time').textContent = fmtTime(pos);
    }
    document.getElementById('np-dur').textContent = fmtTime(dur);
  });

  window.api.onPlaybackEnded(() => {
    stopTimer();
    isPlaying = false;
    isPaused = false;
    resetSeekUI();
    document.getElementById('btn-play').textContent = '▶';
    // Auto-advance
    if (playMode === 'cd' && currentTrackIdx < cdTracks.length - 1) playTrackByIdx(currentTrackIdx + 1);
    else if (playMode === 'library' && currentTrackIdx < filteredTracks.length - 1) playLibraryTrack(currentTrackIdx + 1);
  });
}

function fmtTime(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function resetSeekUI() {
  seekDur = 0;
  document.getElementById('seek').value = 0;
  document.getElementById('np-time').textContent = '0:00';
  document.getElementById('np-dur').textContent = '0:00';
}

async function togglePlay() {
  if (isPlaying || isPaused) {
    const paused = await window.api.togglePause();
    if (paused === null) return;
    isPaused = paused;
    isPlaying = !paused;
    document.getElementById('btn-play').textContent = paused ? '▶' : '⏸';
    if (paused) document.getElementById('cd-disc-art').classList.remove('spinning');
    else if (playMode === 'cd') document.getElementById('cd-disc-art').classList.add('spinning');
  } else if (currentTrackIdx >= 0) {
    if (playMode === 'cd') playTrackByIdx(currentTrackIdx);
    else playLibraryTrack(currentTrackIdx);
  }
}

function stopAll() {
  window.api.stopPlayback();
  stopTimer();
  isPlaying = false;
  isPaused = false;
  resetSeekUI();
  currentTrackIdx = -1;
  document.getElementById('btn-play').textContent = '▶';
  setNowPlaying('Nothing playing');
  hideNpCover();
  document.querySelectorAll('.track-row').forEach(r => r.classList.remove('active', 'playing'));
}

function prevTrack() {
  if (playMode === 'cd' && currentTrackIdx > 0) playTrackByIdx(currentTrackIdx - 1);
  else if (playMode === 'library' && currentTrackIdx > 0) playLibraryTrack(currentTrackIdx - 1);
}

function nextTrack() {
  if (playMode === 'cd' && currentTrackIdx < cdTracks.length - 1) playTrackByIdx(currentTrackIdx + 1);
  else if (playMode === 'library' && currentTrackIdx < filteredTracks.length - 1) playLibraryTrack(currentTrackIdx + 1);
}

function playTrackByIdx(idx) {
  playMode = 'cd';
  currentTrackIdx = idx;
  const track = cdTracks[idx];
  window.api.playCdTrack(track.number);
  isPaused = false;
  isPlaying = true;
  document.getElementById('btn-play').textContent = '⏸';
  const meta = cdMeta ? `${cdMeta.artist} — ` : '';
  setNowPlaying(`${meta}${track.title}`);
  updateCoverArt({ releaseId: cdMeta?.releaseId, artist: cdMeta?.artist, album: cdMeta?.title }, { np: true, cd: true });
  document.getElementById('cd-disc-art').classList.add('spinning');
  renderCdTracks();
}

function setNowPlaying(text) {
  document.getElementById('np-track').textContent = '♫ ' + text;
  isPlaying = true;
  document.getElementById('btn-play').textContent = '⏸';
}

// ── Cover art ─────────────────────────────────────────────────────────────────
const coverCache = new Map();
let coverSeq = 0;

async function updateCoverArt(args, { np = true, cd = false } = {}) {
  const seq = ++coverSeq;
  const key = args.filePath || args.releaseId || `${args.artist || ''}|${args.album || ''}`;
  let url = coverCache.get(key);
  if (url === undefined) {
    url = await window.api.getCoverArt(args);
    coverCache.set(key, url);
  }
  if (seq !== coverSeq) return; // a newer track took over
  if (np) {
    const img = document.getElementById('np-cover');
    if (url) { img.src = url; img.style.display = ''; }
    else { img.removeAttribute('src'); img.style.display = 'none'; }
  }
  if (cd) {
    const cdImg = document.getElementById('cd-cover-img');
    const spinner = document.getElementById('cd-disc-spinner');
    if (url) { cdImg.src = url; cdImg.style.display = ''; spinner.style.display = 'none'; }
    else { cdImg.removeAttribute('src'); cdImg.style.display = 'none'; spinner.style.display = ''; }
  }
}

function hideNpCover() {
  coverSeq++;
  const img = document.getElementById('np-cover');
  img.removeAttribute('src');
  img.style.display = 'none';
}



function stopTimer() {
  document.getElementById('cd-disc-art').classList.remove('spinning');
}

// ── Util ──────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
