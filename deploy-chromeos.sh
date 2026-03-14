#!/bin/bash
# =====================================================
#  DEPLOY — Monitor Pessoal A3 (Chrome OS / Linux)
#  Envia o app para a mesa Soundcraft Ui24R via SSH
# =====================================================
# PRÉ-REQUISITOS:
#   1. Ter o Linux ativado no Chrome OS
#      (Configurações > Avançado > Desenvolvedores > Linux)
#   2. Estar conectado ao Wi-Fi MESADESOM-A3
#
# COMO RODAR:
#   chmod +x deploy-chromeos.sh
#   ./deploy-chromeos.sh
# =====================================================

set -e

MIXER_IP="192.168.1.10"
MIXER_USER="root"
REMOTE_DIR="/www/monitor"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_DIST="$SCRIPT_DIR/client/dist"

echo ""
echo "=============================================="
echo "  DEPLOY — Monitor Pessoal A3"
echo "=============================================="
echo ""

# Verificar se dist existe
if [ ! -d "$LOCAL_DIST" ]; then
  echo "[ERRO] Pasta 'client/dist' não encontrada!"
  echo "       Clone o repositório corretamente:"
  echo "       git clone https://github.com/rivodigital/a3musicapp.git"
  exit 1
fi
echo "[OK] Pasta dist encontrada."

# Verificar ping
echo ""
echo "[1/3] Verificando conexão com a mesa ($MIXER_IP)..."
if ! ping -c 1 -W 2 "$MIXER_IP" > /dev/null 2>&1; then
  echo "[ERRO] Mesa não encontrada em $MIXER_IP"
  echo "       Verifique se está no Wi-Fi: MESADESOM-A3"
  exit 1
fi
echo "       Mesa encontrada! OK"

# Preparar pasta remota: apagar para evitar arquivos aninhados
echo ""
echo "[2/3] Preparando pasta no servidor da mesa..."
echo "      >> Senha SSH: root <<"
echo ""
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
  "${MIXER_USER}@${MIXER_IP}" \
  "rm -rf ${REMOTE_DIR} && mkdir -p /www"

echo "       Pasta preparada! OK"

# Copiar dist/ como "monitor" (sem wildcard, sem problemas)
echo ""
echo "[3/3] Enviando arquivos para a mesa..."
echo "      >> Senha SSH: root <<"
echo ""
scp -o StrictHostKeyChecking=no -r "$LOCAL_DIST" "${MIXER_USER}@${MIXER_IP}:/www/monitor"

echo ""
echo "=============================================="
echo "  PRONTO! App publicado."
echo ""
echo "  Acesse no celular (Wi-Fi MESADESOM-A3):"
echo "  http://$MIXER_IP/monitor/"
echo "=============================================="
echo ""
