@echo off
rem ETS2 Navigasyon - telefonu/tableti USB kablosuyla baglar.
rem Telefonda tarayicida http://localhost:62840 acilir; trafik kablodan gider.
rem Ilk calistirmada Google'in Android platform-tools aracini (adb) indirir.
chcp 65001 > nul
title ETS2 Navigasyon - USB baglantisi
cd /d "%~dp0"
set "ADB=%~dp0platform-tools\adb.exe"

if not exist "%ADB%" (
  echo Android platform-tools indiriliyor, bir kerelik - yaklasik 10 MB...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile 'platform-tools.zip'; Expand-Archive 'platform-tools.zip' -DestinationPath '.' -Force; Remove-Item 'platform-tools.zip'"
)
if not exist "%ADB%" (
  echo.
  echo HATA: platform-tools indirilemedi. Internet baglantisini kontrol edin.
  pause
  exit /b 1
)

"%ADB%" start-server > nul 2>&1

:dongu
echo.
echo ================================================================
echo  Telefonu USB kablosuyla PC'ye baglayin.
echo  Telefonda "USB hata ayiklamaya izin verilsin mi?" sorusu cikarsa
echo  "Bu bilgisayardan her zaman izin ver" isaretleyip Izin ver deyin.
echo ================================================================
"%ADB%" wait-for-device

set BAGLANDI=0
for /f "usebackq skip=1 tokens=1,2" %%a in (`"%ADB%" devices`) do (
  if "%%b"=="device" (
    "%ADB%" -s %%a reverse tcp:62840 tcp:62840 > nul && (
      echo Baglandi: %%a
      set BAGLANDI=1
    )
  )
  if "%%b"=="unauthorized" (
    echo %%a: telefonda izin bekleniyor, ekrana bakin.
  )
)

if "%BAGLANDI%"=="1" (
  echo.
  echo Hazir. Telefonda tarayicida su adresi acin:
  echo.
  echo     http://localhost:62840
  echo.
  echo Bu pencereyi acik birakin. Kablo cikarilip takilinca baglanti
  echo otomatik yenilenir.
  "%ADB%" wait-for-disconnect
  echo.
  echo Kablo cikarildi.
) else (
  timeout /t 3 > nul
)
goto dongu
