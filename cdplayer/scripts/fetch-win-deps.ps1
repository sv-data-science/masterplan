# Downloads the Windows CLI tools music-app bundles (lame, mpv) into
# resources/bin/win. cdparanoia/cd-info need a manual step (see the end).
#
# Run from the project root:  npm run fetch-win-deps
# Requires: PowerShell 5.1+ (ships with Windows 10/11). 7-Zip for mpv.

$ErrorActionPreference = 'Stop'
$bin = Join-Path $PSScriptRoot '..\resources\bin\win'
New-Item -ItemType Directory -Force -Path $bin | Out-Null
$tmp = Join-Path $env:TEMP 'music-app-deps'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# ── LAME (MP3 encoder) — RareWares bundle ───────────────────────────────────
$lameZip = Join-Path $tmp 'lame.zip'
Write-Host 'Downloading LAME from RareWares...'
Invoke-WebRequest 'https://www.rarewares.org/files/mp3/lame3.100.1-win32.zip' -OutFile $lameZip
Expand-Archive -Force $lameZip (Join-Path $tmp 'lame')
Copy-Item (Get-ChildItem -Recurse (Join-Path $tmp 'lame') -Filter 'lame.exe' | Select-Object -First 1).FullName $bin
Write-Host '  lame.exe -> resources/bin/win'

# ── mpv (playback) — shinchiro Windows build ────────────────────────────────
Write-Host 'Downloading mpv (shinchiro build)...'
$rel = Invoke-RestMethod 'https://api.github.com/repos/shinchiro/mpv-winbuild-cmake/releases/latest' -Headers @{ 'User-Agent' = 'music-app-fetch' }
$asset = $rel.assets | Where-Object { $_.name -match '^mpv-x86_64-\d+.*\.7z$' } | Select-Object -First 1
if (-not $asset) { throw 'Could not find an mpv-x86_64-*.7z asset in the latest shinchiro release.' }
$mpv7z = Join-Path $tmp $asset.name
Invoke-WebRequest $asset.browser_download_url -OutFile $mpv7z
$sevenZip = Get-Command 7z.exe -ErrorAction SilentlyContinue
if (-not $sevenZip) { $sevenZip = Get-Command 'C:\Program Files\7-Zip\7z.exe' -ErrorAction SilentlyContinue }
if (-not $sevenZip) {
  Write-Warning "7-Zip not found. Install it (winget install 7zip.7zip), then extract $mpv7z into $bin manually."
} else {
  & $sevenZip.Source x -y "-o$bin" $mpv7z | Out-Null
  Write-Host '  mpv.exe (+ dlls) -> resources/bin/win'
}

# ── cdparanoia + cd-info (CD extraction / TOC) — manual ─────────────────────
Write-Host ''
Write-Host 'MANUAL STEP — CD tools:'
Write-Host '  music-app expects cdparanoia.exe and cd-info.exe in resources/bin/win.'
Write-Host '  Easiest source: MSYS2 packages mingw-w64-x86_64-libcdio (cd-info.exe)'
Write-Host '  and mingw-w64-x86_64-libcdio-paranoia (cd-paranoia.exe — rename to'
Write-Host '  cdparanoia.exe, and copy its libcdio*.dll dependencies alongside),'
Write-Host '  or take them from a fre:ac Windows install.'
Write-Host '  See resources/bin/win/README.md for details.'
Write-Host ''
Write-Host 'Done. Verify with:  resources\bin\win\lame.exe --version'
