#!/usr/bin/env bash
# ETS2 Navigasyon - en son kodu indirir ve gerekiyorsa telefon uygulamasını
# yeniden derler. Sonra sunucuyu ./scripts/baslat.sh ile başlatın.
#
# Kullanım (Ubuntu/WSL penceresinde, sunucu kapalıyken):
#   ./scripts/guncelle.sh

set -euo pipefail
cd "$(dirname "$0")/.."

once=$(git rev-parse HEAD)
git pull --ff-only
sonra=$(git rev-parse HEAD)

if [ "$once" = "$sonra" ]; then
  echo "Zaten güncel."
  exit 0
fi

echo
echo "Değişiklikler:"
git log --oneline "$once..$sonra"
echo

degisen=$(git diff --name-only "$once" "$sonra")

if echo "$degisen" | grep -q '^package-lock.json$'; then
  echo "==> Bağımlılıklar güncelleniyor"
  npm install
fi

if echo "$degisen" | grep -qE '^packages/(apps/navigator|libs)/'; then
  echo "==> Telefon uygulaması yeniden derleniyor"
  SADECE_WEB=1 ./scripts/veri-uret.sh
fi

if echo "$degisen" | grep -q '^packages/clis/navigator/'; then
  echo
  echo "NOT: Windows telemetri istemcisi de değişti. Yeni sürümü indirin:"
  echo "  https://github.com/memmyy61/ets2-navigasyon/releases/latest/download/ets2-navigasyon-istemci.zip"
fi

echo
echo "Güncelleme tamam. Sunucuyu başlatın: ./scripts/baslat.sh"
