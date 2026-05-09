#!/usr/bin/env bash
set -e

# ─── Detect LAN IP ───────────────────────────────────────────────────────────
get_lan_ip() {
  # Try ip route first (Linux), fall back to ifconfig (Mac)
  if command -v ip &>/dev/null; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1
  elif command -v ipconfig &>/dev/null; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null
  else
    ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | awk '{print $2}' | head -1
  fi
}

LAN_IP=$(get_lan_ip)

if [ -z "$LAN_IP" ]; then
  echo "⚠️  Could not auto-detect LAN IP."
  read -rp "Enter your LAN IP manually (e.g. 192.168.1.42): " LAN_IP
fi

FRONTEND_URL="http://${LAN_IP}:3000"
BACKEND_URL="http://${LAN_IP}:8000"

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│        BrickVault – LAN Dev Mode             │"
echo "├─────────────────────────────────────────────┤"
printf "│  LAN IP   : %-31s │\n" "$LAN_IP"
printf "│  Frontend : %-31s │\n" "$FRONTEND_URL"
printf "│  API      : %-31s │\n" "$BACKEND_URL"
echo "└─────────────────────────────────────────────┘"
echo ""

# ─── Write .env.lan ───────────────────────────────────────────────────────────
cat > .env.lan <<EOF
NEXT_PUBLIC_API_URL=${BACKEND_URL}
CORS_ORIGINS=["http://localhost:3000","${FRONTEND_URL}"]
LAN_IP=${LAN_IP}
EOF

echo "✅  .env.lan written"

# ─── QR code in terminal ──────────────────────────────────────────────────────
print_qr() {
  local url="$1"
  # Try Python qrcode package
  if python3 -c "import qrcode" 2>/dev/null; then
    python3 - <<PYEOF
import qrcode, sys
qr = qrcode.QRCode(border=1)
qr.add_data("$url")
qr.make(fit=True)
qr.print_ascii(invert=True)
PYEOF
    return 0
  fi
  # Fallback: use a terminal-friendly URL for a web QR generator
  echo "📱 Open on your phone: $url"
  echo "   (Install 'pip install qrcode' to display a QR code here)"
}

echo ""
echo "📱 Scan to open on your phone:"
echo "   $FRONTEND_URL"
echo ""
print_qr "$FRONTEND_URL"
echo ""

# ─── Start docker compose ─────────────────────────────────────────────────────
echo "🚀 Starting BrickVault..."
echo ""

export NEXT_PUBLIC_API_URL="${BACKEND_URL}"
export CORS_ORIGINS='["http://localhost:3000","'"${FRONTEND_URL}"'"]'

docker compose --env-file .env.lan up --build "$@"
