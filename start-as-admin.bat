@echo off
:: Batch script to launch vpntest node server with Administrator rights for Windows TUN Driver
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Executing with Administrator privileges.
    cd /d "%~dp0"
    node server.js
) else (
    echo [INFO] Requesting Administrator Privileges for Windows Wintun driver...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
)
