@echo off
title ScanCraft PDF - Local Server
cd /d "%~dp0"

if not exist "node_modules" (
  echo Menginstall dependensi pertama kali...
  call npm install
)

if not exist "dist" (
  echo Membangun aplikasi...
  call npm run build
)

echo.
echo ========================================================
echo   ScanCraft PDF sedang berjalan secara lokal!
echo   Browser akan terbuka otomatis di http://localhost:4173
echo   Jangan tutup jendela ini selama menggunakan aplikasi.
echo ========================================================
echo.

call npx vite preview --port 4173 --open
pause

