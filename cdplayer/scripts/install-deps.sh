#!/bin/bash
echo "Installing system dependencies..."

if command -v apt-get &>/dev/null; then
  sudo apt-get install -y cdparanoia lame mpv libcdio-utils
elif command -v dnf &>/dev/null; then
  sudo dnf install -y cdparanoia lame mpv libcdio
elif command -v pacman &>/dev/null; then
  sudo pacman -S --noconfirm cdparanoia lame mpv libcdio
else
  echo "Please manually install: cdparanoia, lame, mpv, libcdio-utils"
fi

echo "Done. Run 'npm install' to install Node dependencies."
