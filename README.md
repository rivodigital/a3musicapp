# A3Mon - Controle Pessoal para Soundcraft Ui24R

A3Mon é um sistema de monitor pessoal focado no músico, que roda no navegador (mobile-first). O objetivo principal é garantir segurança na mixagem ao vivo, onde o músico tem permissão de ajustar apenas o seu próprio retorno de fone (AUX), limitado em ±6dB do ponto base (Base Mix) definido pelo técnico de som.

## Arquitetura

1. `client/`: Um SPA React (Vite, TypeScript, CSS customizado e de alta fidelidade).
2. `server/`: Backend em Node.js / Express / WebSockets, que atua como barreira de segurança, e ponte de comunicação entre os músicos e a Soundcraft Ui24R.

### Tecnologias

- **Backend**: Node.js, Express, WebSocket (ws), typescript.
- **Integração Ui24R**: Usa a biblioteca `soundcraft-ui-connection`.
- **Frontend**: React.ts com Vite, design zero-dependências externas de CSS (somente UI super-premium escrita do zero).

## Funcionalidades

- **Regras de Segurança / Limite**: Os ajustes do frontend chegam ao backend, que verifica se o usuário não excedeu as limitações criadas (apenas ±6dB do mix base e acesso restrito ao próprio Aux).
- **Sem Fakes ou Hooks diretos**: O frontend NUNCA fala diretamente com a mesa e os músicos não enxergam as configurações L/R ou Gain.
- **Mixers Mock Opcional**: Ao rodar testes sem mesa, pode-se usar variável de ambiente no server `MOCK_UI24R=true`.

## Pré-requisitos & Executando

Necessário Node.js 18+.

### Inicializando o Servidor (Backend)
Va até a pasta `/server`, renomeie `.env.example` caso exista ou altere o `.env` gerado.

```bash
cd server
npm install
npm run dev
```

*Nota para uso na mesa*: Use a porta `80` no `.env` (UI24R_PORT=80) e o IP da mesa adequadamente (ex `192.168.1.10` dependendo do uso). Você pode desligar o modo mockup alterando `MOCK_UI24R=false`.

### Inicializando o Cliente (Frontend)

Abra outro terminal:

```bash
cd client
npm install
npm run dev
```
Acesse `http://localhost:5173`.

### Como Testar

Os usuários Mock padrão para testar via Login:

- **Músico de Teste 1**: 
  - Usuário: `musico1`
  - Senha: `123`
  - Acesso ao AUX1 (Índice interno `0`)
- **Músico de Teste 2**: 
  - Usuário: `musico2`
  - Senha: `123`
  - Acesso ao AUX2 (Índice interno `1`)
- **Admin**:
  - Usuário: `admin`
  - Senha: `123`

## Camada de Comunicação com Ui24R

Toda a lógica para modificar na mesa real encontra-se em `server/src/mixerService.ts`. Devido a termos inserido o projeto `soundcraft-ui-connection`, as transações ocorrem usando os objetos próprios e os WebSockets diretamente mantidos pela mesma. 

Se quiser inspecionar ou estender, modifique `setChannelVolume` e `setMasterVolume` no serviço, onde controlamos a checagem com o `presetBase`.
