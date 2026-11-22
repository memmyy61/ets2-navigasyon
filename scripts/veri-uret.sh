#!/usr/bin/env bash
# ETS2 Navigasyon - harita ve navigasyon verisini üretir, web uygulamasını derler.
#
# Kullanım (Ubuntu/WSL penceresinde, depo klasöründe):
#   ./scripts/veri-uret.sh
#
# Seçenekler (ortam değişkeni olarak):
#   ETS2_DIR=...      Oyun klasörü (varsayılan: Steam'in C: sürücüsündeki yeri)
#   YENIDEN_OKU=1     Oyun dosyalarını baştan oku (oyun güncellemesi / yeni DLC sonrası)
#   SADECE_WEB=1      Harita verisine dokunma, sadece web uygulamasını yeniden derle
#   HEPSINI_YENIDEN=1 Tamamlanmış adımları da baştan yap
#
# Yarıda kalırsa (çökme vb.) tekrar çalıştırın: biten adımlar atlanır.
# Tüm çıktı out/veri-uret.log dosyasına da yazılır.
#
# Çıktılar:
#   out/europe-navigation.zip  -> navigasyon sunucusunun verisi
#   out/web/                   -> telefonun açtığı uygulama + harita dosyaları

set -euo pipefail
cd "$(dirname "$0")/.."

ETS2_DIR="${ETS2_DIR:-/mnt/c/Program Files (x86)/Steam/steamapps/common/Euro Truck Simulator 2}"
P=out/parser
O=out
W=out/web
R=packages/clis/generator/resources

mkdir -p "$P" "$W"
exec > >(tee -a out/veri-uret.log) 2>&1
echo
echo "######## $(date '+%F %T') veri-uret.sh başladı ########"

# Bellek: Node'a Ubuntu'ya ayrılan RAM'in %60'ı kadar izin ver. Geri kalanı
# harita parçalarını yazan tippecanoe ve sistem için bırakılır.
MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
HEAP_MB=$(( MEM_MB * 6 / 10 ))
export NODE_OPTIONS="--max-old-space-size=${HEAP_MB}"
echo "Ubuntu'ya ayrılan bellek: ${MEM_MB} MB, swap: ${SWAP_MB} MB (Node sınırı: ${HEAP_MB} MB)"

adim() { echo; echo "==> $(date '+%T') $*"; }

# Bir adımı çalıştırır ve başarılı olursa işaretler; işaretli adımlar atlanır.
#   calistir <ad> <açıklama> <komut...>
calistir() {
  local ad="$1" aciklama="$2"
  shift 2
  local isaret="$O/.tamam-$ad"
  if [ -f "$isaret" ] && [ "${HEPSINI_YENIDEN:-0}" != "1" ]; then
    echo "(atlandı, zaten tamam: $aciklama)"
    return
  fi
  adim "$aciklama"
  rm -f "$isaret"
  "$@"
  touch "$isaret"
}

if [ "${SADECE_WEB:-0}" != "1" ]; then
  if [ "${YENIDEN_OKU:-0}" = "1" ] || [ ! -f "$P/europe-roads.json" ]; then
    adim "Oyun dosyaları okunuyor (birkaç dakika sürebilir)"
    if [ ! -d "$ETS2_DIR" ]; then
      echo "HATA: Oyun klasörü bulunamadı: $ETS2_DIR"
      echo "Doğru klasörü şöyle verin: ETS2_DIR=\"/mnt/c/...\" ./scripts/veri-uret.sh"
      exit 1
    fi
    npx parser -i "$ETS2_DIR" -o "$P"
    # oyun verisi değişti: sonraki adımlar yeniden yapılmalı
    rm -f "$O"/.tamam-*
  else
    echo "Oyun verisi zaten okunmuş ($P). Baştan okumak için: YENIDEN_OKU=1 ./scripts/veri-uret.sh"
  fi

  calistir dunya "Dünya altlık haritası" \
    tippecanoe -q -f -Z4 -z8 -y name -b 10 -X -o "$O/world.pmtiles" \
      "$R/water.geojson" "$R/countries.geojson" "$R/states.geojson"

  calistir harita "ETS2 harita parçaları (en uzun adım)" \
    npx generator map -h -m europe -i "$P" -o "$O" --dataOverridesPath "$R/trucksim-overrides.json"

  calistir binalar "Bina izleri" \
    npx generator footprints -m europe -i "$P" -o "$O"

  calistir simgeler "Simgeler" \
    npx generator spritesheet -m europe -i "$P" -o "$O"

  calistir koyler "Köy etiketleri" \
    npx generator ets2-villages -i "$P" -o "$O"

  calistir arama "Arama verisi" \
    npx generator search -m europe -i "$P" -o "$O"

  calistir yolagi "Yol ağı (rota hesaplama için)" \
    npx generator graph -m europe -i "$P" -o "$O"

  calistir donerkavsak "Döner kavşaklar" \
    npx generator roundabouts -m europe -i "$P" -g "$O" -o "$O"

  adim "Navigasyon veri paketi"
  # ATS'ye özel ek etiketler ETS2'de yok; sunucu için boş dosya yeterli.
  echo '{"type":"FeatureCollection","features":[]}' > "$O/extra-labels.geojson"
  rm -f "$O/europe-navigation.zip"
  zip -j -q "$O/europe-navigation.zip" \
    "$P"/europe-*.json \
    "$O/extra-labels.geojson" \
    "$O/ets2-search.geojson" \
    "$O/europe-graph.json" \
    "$O/europe-roundabouts.json"
  ls -lh "$O/europe-navigation.zip"
fi

adim "Telefon uygulaması derleniyor"
npm run build -w packages/apps/navigator

adim "Web klasörü hazırlanıyor ($W)"
# fonts/ klasörü korunur (sunucunun indirip sakladığı yazı tipleri).
find "$W" -mindepth 1 -maxdepth 1 ! -name fonts -exec rm -rf {} +
cp -R packages/apps/navigator/build/. "$W/"
cp "$O/world.pmtiles" "$O/ets2.pmtiles" "$O/ets2-footprints.pmtiles" \
  "$O"/sprites*.png "$O"/sprites*.json "$O/ets2-villages.geojson" "$W/"

echo
echo "######## $(date '+%F %T') Tamamlandı ########"
echo "Sunucuyu başlatmak için: ./scripts/baslat.sh"
