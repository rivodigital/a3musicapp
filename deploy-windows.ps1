# =====================================================
#  DEPLOY — Monitor Pessoal A3 (Windows)
#  Envia o app para a mesa Soundcraft Ui24R via SSH
# =====================================================
# PRÉ-REQUISITO: Estar conectado no Wi-Fi MESADESOM-A3
#
# COMO RODAR no PowerShell:
#   1. Abra o PowerShell (nao precisa ser Administrador)
#   2. Se aparecer erro de segurança, rode ANTES:
#      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   3. Navegue ate a pasta do projeto:
#      cd C:\caminho\para\a3musicapp
#   4. Execute:
#      .\deploy-windows.ps1
# =====================================================

$MIXER_IP   = "192.168.1.9"
$MIXER_USER = "root"
$REMOTE_DIR = "/www/monitor"
$LOCAL_DIST = Join-Path $PSScriptRoot "client\dist"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  DEPLOY - Monitor Pessoal A3" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# --- Verificar se a pasta dist existe ---
if (-not (Test-Path $LOCAL_DIST)) {
    Write-Host "[ERRO] Pasta 'client\dist' nao encontrada!" -ForegroundColor Red
    Write-Host "       Certifique-se de ter clonado o repositorio corretamente." -ForegroundColor Red
    Write-Host "       git clone https://github.com/rivodigital/a3musicapp.git" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Pasta dist encontrada: $LOCAL_DIST" -ForegroundColor Green

# --- Verificar conectividade com a mesa ---
Write-Host ""
Write-Host "[1/3] Verificando conexao com a mesa ($MIXER_IP)..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $MIXER_IP -Count 1 -Quiet
if (-not $ping) {
    Write-Host "[ERRO] Nao foi possivel alcançar $MIXER_IP" -ForegroundColor Red
    Write-Host "       Verifique se o notebook esta conectado ao Wi-Fi: MESADESOM-A3" -ForegroundColor Red
    exit 1
}
Write-Host "       Mesa encontrada! OK" -ForegroundColor Green

# --- Preparar pasta remota ---
# IMPORTANTE: Para o SCP funcionar corretamente no Windows, precisamos garantir
# que /www/monitor NAO existe antes de copiar, assim o SCP cria a pasta com os
# arquivos corretos diretamente (sem criar /www/monitor/dist/ por engano).
Write-Host ""
Write-Host "[2/3] Preparando pasta no servidor da mesa..." -ForegroundColor Yellow
Write-Host "      ATENCAO: quando pedir senha SSH, digite: root" -ForegroundColor Magenta
Write-Host ""

ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 `
    "${MIXER_USER}@${MIXER_IP}" `
    "rm -rf ${REMOTE_DIR} && mkdir -p /www"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao conectar via SSH." -ForegroundColor Red
    Write-Host "       Certifique-se que o notebook esta no Wi-Fi da mesa." -ForegroundColor Yellow
    Write-Host "       Senha SSH: root" -ForegroundColor Yellow
    exit 1
}
Write-Host "       Pasta preparada! OK" -ForegroundColor Green

# --- Enviar a pasta dist/ como "monitor" no servidor ---
# Usamos scp sem wildcard (que nao funciona no Windows).
# Como /www/monitor NAO existe ainda, SCP cria ela com o conteudo de dist/
# resultando em /www/monitor/ com todos os arquivos certos.
Write-Host ""
Write-Host "[3/3] Enviando arquivos para a mesa..." -ForegroundColor Yellow
Write-Host "      (pode pedir a senha SSH de novo: root)" -ForegroundColor Magenta
Write-Host ""

scp -o StrictHostKeyChecking=no -r "$LOCAL_DIST" "${MIXER_USER}@${MIXER_IP}:/www/monitor"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao enviar arquivos." -ForegroundColor Red
    Write-Host "       Verifique a conexao com a mesa e tente novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  PRONTO! App publicado na mesa com sucesso." -ForegroundColor Green
Write-Host ""
Write-Host "  Acesse no celular (Wi-Fi MESADESOM-A3):" -ForegroundColor White
Write-Host "  http://$MIXER_IP/monitor/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para instalar como app:" -ForegroundColor White
Write-Host "  Android: Menu Chrome > 'Adicionar a tela inicial'" -ForegroundColor Gray
Write-Host "  iPhone:  Botao Compartilhar > 'Adicionar a Tela de Inicio'" -ForegroundColor Gray
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
