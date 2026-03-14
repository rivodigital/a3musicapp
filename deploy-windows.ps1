# =====================================================
#  DEPLOY — Monitor Pessoal A3 (Windows)
#  Envia o app para a mesa Soundcraft Ui24R via SSH
# =====================================================
# PRÉ-REQUISITO: Estar conectado no Wi-Fi MESADESOM-A3
#
# COMO RODAR no PowerShell:
#   1. Abra o PowerShell como Administrador
#   2. Se aparecer erro de segurança, rode antes:
#      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   3. cd para a pasta do projeto
#   4. .\deploy-windows.ps1
# =====================================================

$MIXER_IP   = "192.168.1.10"
$MIXER_USER = "root"
$MIXER_PASS = "root"
$REMOTE_DIR = "/www/monitor"
$LOCAL_DIST = Join-Path $PSScriptRoot "client\dist"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  DEPLOY — Monitor Pessoal A3" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# --- Verificar se a pasta dist existe ---
if (-not (Test-Path $LOCAL_DIST)) {
    Write-Host "[ERRO] Pasta 'client\dist' nao encontrada!" -ForegroundColor Red
    Write-Host "       O build do app nao esta presente." -ForegroundColor Red
    Write-Host "       Certifique-se de ter clonado o repositorio corretamente." -ForegroundColor Red
    exit 1
}

# --- Verificar conectividade com a mesa ---
Write-Host "[1/3] Verificando conexao com a mesa ($MIXER_IP)..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $MIXER_IP -Count 1 -Quiet
if (-not $ping) {
    Write-Host "[ERRO] Nao foi possivel alcançar $MIXER_IP" -ForegroundColor Red
    Write-Host "       Verifique se o notebook esta conectado ao Wi-Fi: MESADESOM-A3" -ForegroundColor Red
    exit 1
}
Write-Host "       Mesa encontrada! OK" -ForegroundColor Green

# --- Criar pasta remota e enviar arquivos via SCP nativo do Windows ---
Write-Host ""
Write-Host "[2/3] Criando pasta no servidor da mesa..." -ForegroundColor Yellow

# Usar ssh nativo do Windows 10/11 (OpenSSH)
# A senha sera solicitada uma vez — digite: root
$env:SSHPASS = $MIXER_PASS
Write-Host "       ATENCAO: quando pedir senha SSH, digite: root" -ForegroundColor Magenta
Write-Host ""

# Criar diretório remoto
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${MIXER_USER}@${MIXER_IP}" "mkdir -p ${REMOTE_DIR}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao conectar via SSH." -ForegroundColor Red
    Write-Host "       Senha padrao da mesa: root" -ForegroundColor Yellow
    exit 1
}

# --- Enviar arquivos ---
Write-Host ""
Write-Host "[3/3] Enviando arquivos para a mesa..." -ForegroundColor Yellow
Write-Host "       (pode pedir a senha SSH de novo: root)" -ForegroundColor Magenta
Write-Host ""

scp -o StrictHostKeyChecking=no -r "${LOCAL_DIST}\*" "${MIXER_USER}@${MIXER_IP}:${REMOTE_DIR}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao enviar arquivos." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  PRONTO! App publicado na mesa." -ForegroundColor Green
Write-Host ""
Write-Host "  Acesse no celular (Wi-Fi MESADESOM-A3):" -ForegroundColor White
Write-Host "  http://$MIXER_IP/monitor/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para instalar como app:" -ForegroundColor White
Write-Host "  Android: Menu Chrome > 'Adicionar a tela inicial'" -ForegroundColor Gray
Write-Host "  iPhone:  Botao Compartilhar > 'Adicionar a Tela de Inicio'" -ForegroundColor Gray
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
