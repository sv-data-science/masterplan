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
let playTimer = null;
let playSeconds = 0;

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
    populateRipTracks();
  } else {
    cdMeta = { artist: 'Unknown Artist', title: 'Unknown Album', year: '', tracks: cdTracks };
    setStatus(`${cdTracks.length} tracks loaded (no metadata found)`);
    populateRipTracks();
  }
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
  const container = document.getElementById('rip-track-checkboxes');
  container.innerHTML = '';
  cdTracks.forEach(t => {
    const label = document.createElement('label');
    label.className = 'rip-check-label';
    label.innerHTML = `<input type="checkbox" class="rip-track-cb" value="${t.number}" checked/> ${t.number}. ${esc(t.title)}`;
    container.appendChild(label);
  });
}

async function startRip() {
  const selectedNums = [...document.querySelectorAll('.rip-track-cb:checked')].map(c => parseInt(c.value));
  if (selectedNums.length === 0) { alert('Select at least one track to rip.'); return; }

  const outputDir = document.getElementById('rip-output').value;
  if (!outputDir) { alert('Select an output folder.'); return; }
  if (cdTracks.length === 0) { alert('No CD loaded. Detect a CD first.'); return; }

  const quality = document.getElementById('rip-quality').value;
  const tracks = cdTracks.filter(t => selectedNums.includes(t.number));
  const meta = cdMeta || { artist: 'Unknown', title: 'Unknown', year: '' };

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
  setNowPlaying(`${track.artist} — ${track.title}`);
  startTimer();
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

  window.api.onPlaybackEnded(() => {
    stopTimer();
    isPlaying = false;
    document.getElementById('btn-play').textContent = '▶';
    // Auto-advance
    if (playMode === 'cd' && currentTrackIdx < cdTracks.length - 1) playTrackByIdx(currentTrackIdx + 1);
    else if (playMode === 'library' && currentTrackIdx < filteredTracks.length - 1) playLibraryTrack(currentTrackIdx + 1);
  });
}

function togglePlay() {
  if (isPlaying) {
    window.api.stopPlayback();
    stopTimer();
    isPlaying = false;
    document.getElementById('btn-play').textContent = '▶';
  } else if (currentTrackIdx >= 0) {
    if (playMode === 'cd') playTrackByIdx(currentTrackIdx);
    else playLibraryTrack(currentTrackIdx);
  }
}

function stopAll() {
  window.api.stopPlayback();
  stopTimer();
  isPlaying = false;
  currentTrackIdx = -1;
  document.getElementById('btn-play').textContent = '▶';
  setNowPlaying('Nothing playing');
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
  isPlaying = true;
  document.getElementById('btn-play').textContent = '⏸';
  const meta = cdMeta ? `${cdMeta.artist} — ` : '';
  setNowPlaying(`${meta}${track.title}`);
  startTimer();
  document.getElementById('cd-disc-art').classList.add('spinning');
  renderCdTracks();
}

function setNowPlaying(text) {
  document.getElementById('np-track').textContent = '♫ ' + text;
  isPlaying = true;
  document.getElementById('btn-play').textContent = '⏸';
}

function startTimer() {
  stopTimer();
  playSeconds = 0;
  playTimer = setInterval(() => {
    playSeconds++;
    const m = Math.floor(playSeconds / 60);
    const s = String(playSeconds % 60).padStart(2, '0');
    document.getElementById('np-time').textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
  document.getElementById('cd-disc-art').classList.remove('spinning');
}

// ── Util ──────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
