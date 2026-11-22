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

Telefonun sunucuya ağ üzerinden ulaşabilmesini telemetri istemcisi (BASLAT.bat)
sağlar: PC'nin tüm ağ adreslerinde 62840'ı dinleyip Ubuntu'daki sunucuya aktarır.
WSL normal (NAT) modda kalmalı. **PowerShell'i yönetici olarak** açıp bir kez:

```powershell
Set-Content "$env:USERPROFILE\.wslconfig" "[wsl2]`nnetworkingMode=nat"
New-NetFirewallRule -DisplayName "ETS2 Navigasyon" -Direction Inbound -Protocol TCP -LocalPort 62840 -Action Allow
wsl --shutdown
```

BASLAT.bat ilk açılışta Windows güvenlik duvarı izni sorarsa "İzin ver" deyin.

Yurt / kamu Wi-Fi'lerinde (ör. GSBWifi) cihazlar birbirini göremez. O zaman ya
PC'nin **Mobil etkin nokta**'sını açıp telefonu ona bağlayın (adres
`http://192.168.137.1:62840`), ya da aşağıdaki USB yöntemini kullanın.

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

## Ağ cihazları birbirine bağlamıyorsa: USB kablosu

Yurt / kamu Wi-Fi'leri (ör. GSBWifi) aynı ağdaki cihazların birbirini görmesini
engeller. O zaman telefonu kabloyla bağlayın:

1. Telefonda bir kez: **Ayarlar → Telefon hakkında → Yazılım bilgileri → Yapım
   numarası**'na 7 kez dokunun (geliştirici seçenekleri açılır). Sonra
   **Ayarlar → Geliştirici seçenekleri → USB hata ayıklama**'yı açın.
2. Telefonu USB kablosuyla PC'ye takın (veri aktarabilen bir kablo olmalı).
3. `C:\ETS2Navigasyon\TELEFON-USB.bat` dosyasını çalıştırın (ilk seferde gerekli
   aracı kendisi indirir). Telefonda çıkan izin sorusuna "her zaman izin ver" deyin.
4. Telefonda tarayıcıda `http://localhost:62840` adresini açın. İlk seferde
   BASLAT.bat penceresindeki eşleştirme kodunu girin.

USB hata ayıklama hakkında: Geliştirici seçenekleri kapatılırsa USB hata ayıklama
da kapanır. Açık kalması güvenlik açısından sorun değildir (yalnızca izin verilen
bilgisayarlar bağlanabilir; tanımadığınız bir bilgisayarda çıkan izin sorusunu
reddedin). Bazı banka uygulamaları geliştirici seçenekleri açıkken çalışmayabilir:
oyun bitince USB hata ayıklamayı kapatmak yeterli.

## Güncelleme

Sunucu kapalıyken (Ctrl+C):

```bash
cd ~/ets2-navigasyon
./scripts/guncelle.sh
./scripts/baslat.sh
```

`guncelle.sh` gerekiyorsa telefon uygulamasını kendisi yeniden derler. Windows
istemcisi sadece kendi kodu değiştiğinde yenilenir; öyleyse script ekrana yazar.
