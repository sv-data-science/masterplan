# music-app

Portable, local-only MP3 player + CD ripper — a spiritual successor to Mp3FE.
No cloud, no account, no streaming. Copy the single `.exe` to a USB stick and
run it on any Windows machine; settings live next to the executable.

Adopted from the earlier `cdplayer` Electron app (sv-data-science/masterplan,
branch `claude/cd-player-mp3-rip-xnauvf`) and ported to Windows.

## Features

- CD playback (via mpv) with MusicBrainz metadata lookup
- CD ripping to MP3 with selectable bitrate (128/192/256/320 kbps), ID3 tags,
  output to `<Music>/<Artist>/<Album>/NN <Title>.mp3`
- MP3 library browser (recursive scan, tag reading)
- Skinnable UI (Winamp Classic, Windows Media Player, Spotify Dark)
- Portable: config stored next to the `.exe` in portable builds

## Run / build (Windows)

Prerequisites: Node.js LTS.

```powershell
npm install
npm run fetch-win-deps   # downloads lame.exe + mpv.exe into resources/bin/win
npm start                # dev run
npm run dist:win         # portable single-file build -> dist/music-app.exe
```

`cdparanoia.exe` / `cd-info.exe` need one manual step — see
`resources/bin/win/README.md`.

## Linux

```bash
npm run install-deps     # cdparanoia, lame, mpv, libcdio-utils (apt/dnf/pacman)
npm start
npm run dist:linux       # AppImage
```

## Roadmap (from SPEC.md)

- Lyrics panel (fetched, cached locally)
- 10-band equalizer + visualizer
- In-app tag editor
- Winamp `.wsz` bitmap skins + original manga-inspired default skin
- Album cover display

Full spec: `../mp3-player/SPEC.md`
