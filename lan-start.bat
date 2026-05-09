@echo off
setlocal enabledelayedexpansion

echo.
echo Detecting LAN IP...

:: Get LAN IP via PowerShell
for /f "tokens=*" %%i in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -eq 'Dhcp' } | Select-Object -First 1).IPAddress"') do (
  set LAN_IP=%%i
)

if "!LAN_IP!"=="" (
  set /p LAN_IP="Could not auto-detect LAN IP. Enter it manually (e.g. 192.168.1.42): "
)

set FRONTEND_URL=http://!LAN_IP!:3000
set BACKEND_URL=http://!LAN_IP!:8000

echo.
echo +-----------------------------------------------+
echo ^|        BrickVault - LAN Dev Mode              ^|
echo +-----------------------------------------------+
echo ^|  LAN IP   : !LAN_IP!
echo ^|  Frontend : !FRONTEND_URL!
echo ^|  API Docs : !BACKEND_URL!/docs
echo +-----------------------------------------------+
echo.

:: Write .env.lan
(
  echo NEXT_PUBLIC_API_URL=!BACKEND_URL!
  echo CORS_ORIGINS=["http://localhost:3000","!FRONTEND_URL!"]
  echo LAN_IP=!LAN_IP!
) > .env.lan

echo .env.lan written.
echo.
echo Open on your phone: !FRONTEND_URL!
echo.

set NEXT_PUBLIC_API_URL=!BACKEND_URL!
set CORS_ORIGINS=["http://localhost:3000","!FRONTEND_URL!"]

docker compose --env-file .env.lan up --build %*
