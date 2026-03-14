#!/bin/bash
# =============================================================
#  DEPLOY — Envia o app para a mesa Soundcraft Ui24R via SSH
# =============================================================
# Uso:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Pré-requisitos:
#   - Estar conectado no Wi-Fi da mesa (MESADESOM-A3)
#   - Node.js instalado neste computador
#   - scp / ssh disponíveis (vêm no macOS/Linux; no Windows use WSL ou Git Bash)
# =============================================================

set -e

MIXER_IP="192.168.1.9"
MIXER_USER="root"
MIXER_PASS="root"           # Senha padrão — altere se a sua mesa for diferente
REMOTE_DIR="/www/monitor"   # Pasta dentro do web server da mesa

echo ""
echo "=============================================="
echo "  DEPLOY — Monitor Pessoal A3"
echo "=============================================="
echo ""

# 1. Build do app
echo "[1/3] Gerando build do app..."
cd "$(dirname "$0")/client"
npm install --silent
npm run build
cd ..

echo ""
echo "[2/3] Criando pasta no servidor da mesa..."
sshpass -p "$MIXER_PASS" ssh -o StrictHostKeyChecking=no "${MIXER_USER}@${MIXER_IP}" \
  "mkdir -p ${REMOTE_DIR}"

echo ""
echo "[3/3] Enviando arquivos para a mesa..."
sshpass -p "$MIXER_PASS" scp -o StrictHostKeyChecking=no -r \
  client/dist/* "${MIXER_USER}@${MIXER_IP}:${REMOTE_DIR}/"

echo ""
echo "=============================================="
echo "  PRONTO!"
echo ""
echo "  Acesse no celular (conectado ao Wi-Fi da mesa):"
echo "  http://${MIXER_IP}/monitor/"
echo ""
echo "  Para instalar como app:"
echo "  Android: Menu do Chrome > 'Adicionar à tela inicial'"
echo "  iPhone:  Botão Compartilhar > 'Adicionar à Tela de Início'"
echo "=============================================="
echo ""
