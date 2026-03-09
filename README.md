# Monitor Pessoal A3 — Soundcraft Ui24R

App web mobile-first para músicos controlarem seu próprio retorno de fone (AUX) em tempo real, conectando diretamente à mesa Soundcraft Ui24R via Wi-Fi.

## Como funciona

- O músico conecta o celular no Wi-Fi da mesa (`MESADESOM-A3`)
- Abre o browser e acessa `http://192.168.1.10/monitor/`
- Escolhe seu instrumento e AUX
- Controla os volumes do retorno em tempo real
- Pode instalar como app na tela inicial (PWA — funciona no Android e iPhone)

Se o celular não estiver no Wi-Fi correto, o app exibe uma tela de aviso com as instruções para conectar.

## Arquitetura

```
Celular do músico (browser)
        ↓  WebSocket direto (ws://192.168.1.10/)
Soundcraft Ui24R (192.168.1.10)
```

O app conecta diretamente à mesa — sem servidor intermediário, sem notebook, sem backend.

## Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Conexão com a mesa**: `soundcraft-ui-connection` (WebSocket)
- **PWA**: manifest para instalação como app no celular

## Estrutura

```
a3musicapp/
├── client/           → App React
│   ├── src/
│   │   ├── App.tsx   → Tela de setup + tela de mixer
│   │   └── Fader.tsx → Componente de fader
│   └── public/       → Assets estáticos
└── deploy.sh         → Script para enviar o app para a mesa via SSH
```

## Deploy na mesa (Soundcraft Ui24R)

Com o computador conectado no Wi-Fi da mesa, rode na raiz do projeto:

```bash
./deploy.sh
```

O script faz o build e envia os arquivos para `/www/monitor/` na mesa automaticamente.

**Credenciais SSH padrão da mesa:**
- Host: `192.168.1.10`
- Usuário: `root`
- Senha: `root`

Após o deploy, os músicos acessam `http://192.168.1.10/monitor/` e podem instalar como app.

## Desenvolvimento local

```bash
cd client
npm install
npm run dev
```

Acesse `http://localhost:5173`. Para testar sem a mesa, use o botão **Modo Teste (Offline)** na tela de setup.
