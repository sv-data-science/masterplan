# CD Player

A desktop CD player, ripper, and MP3 library browser — built with Electron.

## Features

- **CD Playback** — Play any track on an inserted CD via mpv
- **Metadata Lookup** — Automatically queries MusicBrainz for album/artist/track info
- **CD Ripping** — Rip tracks to MP3 at 128 / 192 / 256 / 320 kbps using cdparanoia + lame
- **MP3 Library** — Scan your local music folder; browse by artist, search by any field
- **3 Skins** — WinAmp Classic, Windows Media Player, Spotify Dark (switchable live)

## System Requirements (Linux)

```bash
bash scripts/install-deps.sh
```

This installs: `cdparanoia`, `lame`, `mpv`, `libcdio-utils`

## Install & Run

```bash
cd cdplayer
npm install
npm start
```

## Usage

1. **CD tab** — Insert a CD, click "Detect CD". Metadata loads automatically.
   Double-click or click ▶ on a track to play.
2. **Rip tab** — Select tracks and quality, choose output folder, click "Start Ripping".
3. **Library tab** — Shows your MP3 library. Search by typing, filter by artist in sidebar.
   Right-click a track to reveal it in file manager.
4. **Settings** — Set library folder, default rip quality, and skin.

## CD Device

By default uses `/dev/cdrom`. If your drive is at a different path (e.g. `/dev/sr0`),
edit the `--cdrom-device` argument in `main.js` line ~70.
