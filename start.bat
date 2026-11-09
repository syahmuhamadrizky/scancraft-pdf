@echo off
title ScanCraft PDF - Launcher
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js tidak ditemukan di PATH.
  echo Silakan install Node.js terlebih dahulu dari https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Menginstall dependensi pertama kali...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Gagal menginstall dependensi.
    pause
    exit /b 1
  )
)

if not exist "dist" (
  echo Membangun aplikasi...
  call npm run build
  if errorlevel 1 (
    echo [ERROR] Gagal melakukan build aplikasi.
    pause
    exit /b 1
  )
)

echo.
echo ========================================================
echo   ScanCraft PDF sedang berjalan secara lokal!
echo   Browser akan terbuka otomatis di http://127.0.0.1:4173
echo   Jangan tutup jendela ini selama menggunakan aplikasi.
echo ========================================================
echo.

call npx vite preview --host 127.0.0.1 --port 4173 --open
pause

