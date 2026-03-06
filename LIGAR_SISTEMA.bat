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

echo [1/3] Verificando dependencias do Servidor...
if not exist "server\node_modules\" (
    echo Instalando bibliotecas do servidor (isso pode levar 1-2 min)...
    cmd /c "cd server && npm install"
)

echo [2/3] Verificando dependencias do Aplicativo...
if not exist "client\node_modules\" (
    echo Instalando bibliotecas do aplicativo (isso pode levar 2-3 min)...
    cmd /c "cd client && npm install"
)

echo [3/3] Iniciando o Sistema...
echo.
echo ==============================================
echo    ATENCAO MUSICO:
echo    Aguarde carregar e procure a linha:
echo    "Network: http://..."
echo ==============================================
echo.

:: Inicia o servidor em uma janela separada para nao travar o terminal
start "A3-Server" cmd /c "cd server && npm run dev"

:: Inicia o client nesta janela
cd client && npm run dev

pause
