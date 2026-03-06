@echo off
title A3 Mixer - Ligar Sistema
echo ==============================================
echo    LIGANDO A3 MIXER - CONTROLE DE MONITOR
echo ==============================================
echo.

:: Tenta encontrar o Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js v18 ou superior no notebook.
    echo Baixe aqui: https://nodejs.org/
    pause
    exit
)

echo [1/2] Iniciando Servidor de Comunicacao...
start /b cmd /c "cd server && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Aplicativo para Celulares...
echo.
echo ==============================================
echo    ATENCAO MUSICO:
echo    Procure a linha que diz "Network: http://..."
echo    Esse e o link que voce deve digitar no celular!
echo ==============================================
echo.
cd client && npm run dev

pause
