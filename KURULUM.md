# ETS2 Navigasyon — Kurulum ve Kullanım

ETS2'deki kamyonunuzu telefon/tabletten, oyunun haritasıyla takip etmenizi sağlar.
Her şey kendi bilgisayarınızda çalışır. Telefon PC'ye yerel ağ (Wi-Fi veya hotspot)
üzerinden bağlanır ve mobil internet harcamaz.

Bu proje [truckermudgeon/maps](https://github.com/truckermudgeon/maps) (GPL v3)
üzerine kuruludur.

```
[ETS2] → telemetri eklentisi (DLL) → telemetri istemcisi (Windows, BASLAT.bat)
                                          │ localhost
                                          ▼
                       navigasyon sunucusu (Ubuntu/WSL, ./scripts/baslat.sh)
                                          │ Wi-Fi / hotspot, port 62840
                                          ▼
                                 telefon tarayıcısı
```

## Windows uygulaması (önerilen)

1. Kurulum dosyasını indirin, zip'ten çıkarıp `ETS2 Navigasyon-Setup.exe`'yi
   çalıştırın (Windows uyarı verirse **Ek bilgi → Yine de çalıştır**):
   https://github.com/memmyy61/ets2-navigasyon/releases/latest/download/stable-win-x64-ETS2Navigasyon-Setup.zip
2. İlk açılışta uygulama harita verisini ister: Ubuntu'da üretilmiş
   `~/ets2-navigasyon/out` klasörünü bulur, **Kopyala**'ya basın (bir kez).
3. Telefonu PC ile aynı ağa (telefon hotspot'u veya ev Wi-Fi'si) bağlayıp
   uygulamadaki QR kodu okutun. Windows güvenlik duvarı izin sorarsa verin.
4. Güncellemeler: uygulama açılışta GitHub'a bakar; yeni sürüm varsa altta
   **Güncellemeyi yükle** düğmesi çıkar.

Harita verisi `%LOCALAPPDATA%\ETS2Navigasyon\veri` klasöründedir. Oyun
güncellemesi veya yeni DLC sonrası Ubuntu'da `./scripts/veri-uret.sh`
çalıştırıp uygulamadaki veriyi yenilemek gerekir.

Aşağıdaki Ubuntu tabanlı kurulum, harita verisini üretmek ve geliştirme içindir.

## Gerekenler

- Windows 11, Steam'de ETS2
- WSL ile Ubuntu 24.04
- Telefon ve PC aynı ağda

## 1. Ubuntu tarafı (bir kez)

```bash
sudo apt update
sudo apt install -y build-essential python3 git zip tippecanoe
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24
cd ~
git clone --recurse-submodules -b gelistirme https://github.com/memmyy61/ets2-navigasyon.git
cd ets2-navigasyon
npm install
npm run build -w packages/clis/parser
```

## 2. Harita verisini üret (bir kez; oyun güncellemesi veya yeni DLC gelince tekrar)

```bash
cd ~/ets2-navigasyon
./scripts/veri-uret.sh
```

Oyun başka bir klasördeyse: `ETS2_DIR="/mnt/d/SteamLibrary/steamapps/common/Euro Truck Simulator 2" ./scripts/veri-uret.sh`

Oyun güncellemesinden sonra: `YENIDEN_OKU=1 ./scripts/veri-uret.sh`

## 3. Windows ağ ayarı (bir kez)

Telefonun Ubuntu içindeki sunucuya ulaşabilmesi için. **PowerShell'i yönetici olarak**
açın ve şunları çalıştırın:

```powershell
$f="$env:USERPROFILE\.wslconfig"; if (!(Test-Path $f) -or !(Select-String -Path $f -Pattern 'networkingMode' -Quiet)) { Add-Content $f "[wsl2]`nnetworkingMode=mirrored" }
New-NetFirewallHyperVRule -Name ETS2Nav -DisplayName "ETS2 Navigasyon" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 62840 -Action Allow
New-NetFirewallRule -DisplayName "ETS2 Navigasyon" -Direction Inbound -Protocol TCP -LocalPort 62840 -Action Allow
wsl --shutdown
```

Sonra Ubuntu penceresini yeniden açın.

## 4. Telemetri eklentisi (bir kez)

Daha önce TruckSim Navigator veya başka bir telemetri uygulaması kullandıysanız
büyük ihtimalle kuruludur. Kontrol etmek için oyun klasöründe
`bin\win_x64\plugins\scs-telemetry.dll` dosyasına bakın.

Kurulu değilse [RenCloud/scs-sdk-plugin](https://github.com/RenCloud/scs-sdk-plugin/releases)
sürümlerinden indirip `Win64\scs-telemetry.dll` dosyasını
`...\Euro Truck Simulator 2\bin\win_x64\plugins\` klasörüne kopyalayın
(`plugins` klasörü yoksa oluşturun). Oyun açılışta "SDK" uyarısı gösterir, OK deyin.

## 5. Telemetri istemcisini indir (Windows)

En son sürümü şu linkten indirip bir klasöre çıkarın (örneğin `C:\ETS2Navigasyon`):
https://github.com/memmyy61/ets2-navigasyon/releases/latest/download/ets2-navigasyon-istemci.zip

Tüm sürümler ve değişiklikler: https://github.com/memmyy61/ets2-navigasyon/releases

## Her oyun oturumunda

1. Ubuntu'da: `cd ~/ets2-navigasyon && ./scripts/baslat.sh` (pencere açık kalsın)
2. ETS2'yi açın.
3. Windows'ta `BASLAT.bat` dosyasını çalıştırın.
4. İlk seferde istemci bir QR kod gösterir. Telefonla okutun (veya gösterilen adresi
   açıp eşleştirme kodunu girin). Sonraki seferlerde telefon otomatik bağlanır.

## Güncelleme

Sunucu kapalıyken (Ctrl+C):

```bash
cd ~/ets2-navigasyon
./scripts/guncelle.sh
./scripts/baslat.sh
```

`guncelle.sh` gerekiyorsa telefon uygulamasını kendisi yeniden derler. Windows
istemcisi sadece kendi kodu değiştiğinde yenilenir; öyleyse script ekrana yazar.
