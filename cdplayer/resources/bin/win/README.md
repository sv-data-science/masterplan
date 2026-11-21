# Bundled Windows binaries

music-app shells out to these CLI tools on Windows. They are **not committed
to git** (see `.gitignore`); fetch them with `npm run fetch-win-deps` or place
them here manually. In the packaged app they ship via electron-builder
`extraResources` to `<resourcesPath>/bin/win/`.

| File | Purpose | Source | License |
|---|---|---|---|
| `lame.exe` | MP3 encoding | RareWares LAME bundle — https://www.rarewares.org/mp3-lame-bundle.php | LGPL |
| `mpv.exe` (+ DLLs) | CD/file playback | shinchiro Windows builds — https://github.com/shinchiro/mpv-winbuild-cmake/releases (also `winget install shinchiro.mpv`) | GPL |
| `cdparanoia.exe` | CD audio extraction + TOC query (`-Q`) | libcdio port (`cd-paranoia.exe`, rename it) from MSYS2 package `mingw-w64-x86_64-libcdio-paranoia`, or from a fre:ac Windows install. Also copy its DLLs (`libcdio_cdda-2.dll`, `libcdio_paranoia-2.dll`, `libcdio-*.dll`, `libiso9660-*.dll`, `libcddb-*.dll`, `libiconv-*.dll`, `libintl-*.dll`, `libgcc_s_*.dll`, `libwinpthread-*.dll`) from the same MSYS2 `bin` folder — the exe fails silently (no output at all) if any are missing | GPL |
| `cd-info.exe` | CD detection (Linux probe; optional on Windows) | MSYS2 package `mingw-w64-x86_64-libcdio` | GPL |

Notes:

- Windows CD drive detection does **not** need cd-info — the app asks
  PowerShell (`Win32_CDROMDrive`) for the drive letter with media loaded.
- The `cdparanoia -Q` TOC output format is assumed to match the Linux build
  (true for the libcdio port). Verify on real hardware; if the table format
  differs, adjust the parser in `main.js` (`get-cd-toc` handler).
- If a bundled binary is missing, the app falls back to the same tool name
  on the system `PATH` (see `tools.js`).
