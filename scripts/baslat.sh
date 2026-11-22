#!/usr/bin/env bash
# ETS2 Navigasyon - navigasyon sunucusunu başlatır.
#
# Kullanım (Ubuntu/WSL penceresinde, depo klasöründe):
#   ./scripts/baslat.sh
#
# Sunucu açıkken bu pencereyi kapatmayın. Durdurmak için Ctrl+C.

set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-62840}"

if [ ! -f out/europe-navigation.zip ] || [ ! -f out/web/index.html ]; then
  echo "Navigasyon verisi bulunamadı. Önce şunu çalıştırın: ./scripts/veri-uret.sh"
  exit 1
fi

MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
export NODE_OPTIONS="--max-old-space-size=$(( MEM_MB * 3 / 4 ))"

export NODE_ENV=production
export PORT
export WEB_DIR="$PWD/out/web"
export ALLOW_SAME_ORIGIN=true
export RATE_LIMIT_ENABLED=false
export LOG_LEVEL="${LOG_LEVEL:-warn}"

echo "Navigasyon sunucusu başlatılıyor (harita verisinin yüklenmesi 1-2 dakika sürebilir)..."
echo
echo "Hazır olunca:"
echo "  1. Windows'ta telemetri istemcisini (BASLAT.bat) çalıştırın."
echo "  2. Telefonla istemcinin gösterdiği QR kodu okutun."
echo
echo "Bu PC'nin ağ adresleri (telefon bunlardan birini kullanır):"
ip -4 -o addr show scope global 2>/dev/null | awk '{print "  http://" substr($4, 1, index($4, "/") - 1) ":'"$PORT"'"}' || true
echo

exec npx tsx packages/apis/navigation/index.ts "$PWD/out"
