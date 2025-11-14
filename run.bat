@echo off
cd /d "%~dp0"
echo Instalando dependencias (puede demoraruns minutos)...
call "C:\Program Files\nodejs\npm.cmd" install
echo Inicializando o aplicativo...
call "C:\Program Files\nodejs\npm.cmd" start
pause