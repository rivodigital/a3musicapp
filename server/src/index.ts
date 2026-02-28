import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { config } from './config';
import { mixer } from './mixerService';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Connect to the mixer
mixer.connect();

// WebSocket Setup
wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const name = url.searchParams.get('name') || 'Desconhecido';
    const auxIndexParam = url.searchParams.get('auxIndex');
    const role = url.searchParams.get('role') || 'musician';

    const auxIndex = auxIndexParam ? parseInt(auxIndexParam, 10) : -1;

    const user = { username: name, role, auxIndex };

    console.log(`[WS] ${user.username} connected (Aux: ${user.auxIndex + 1})`);

    // Send initial state specific to user roles
    const sendState = () => {
        let stateToSend;
        if (user.role === 'admin') {
            stateToSend = { type: 'STATE', payload: mixer.state };
        } else {
            stateToSend = {
                type: 'STATE',
                payload: {
                    isConnected: mixer.state.isConnected,
                    myAux: mixer.state.auxes[auxIndex],
                    presetBase: mixer.state.presetBase[auxIndex]
                }
            };
        }
        ws.send(JSON.stringify(stateToSend));
    };

    // Subscribe to changes
    const unsubscribe = mixer.subscribe(() => {
        sendState();
    });

    // Handle incoming commands
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'SET_CHANNEL_VOL') {
                // Validate permission
                let targetAux = user.auxIndex;
                if (user.role === 'admin' && data.auxIndex !== undefined) {
                    targetAux = data.auxIndex;
                }

                if (targetAux !== undefined && targetAux !== -1) {
                    mixer.setChannelVolume(targetAux, data.chIndex, data.vol);
                }
            } else if (data.type === 'SET_MASTER_VOL') {
                let targetAux = user.auxIndex;
                if (user.role === 'admin' && data.auxIndex !== undefined) targetAux = data.auxIndex;

                if (targetAux !== undefined && targetAux !== -1) {
                    mixer.setMasterVolume(targetAux, data.vol);
                }
            } else if (data.type === 'RESET_BASE') {
                let targetAux = user.auxIndex;
                if (user.role === 'admin' && data.auxIndex !== undefined) targetAux = data.auxIndex;

                if (targetAux !== undefined && targetAux !== -1) {
                    mixer.resetToBase(targetAux);
                }
            } else if (data.type === 'SET_AS_BASE' && user.role === 'admin') {
                if (data.auxIndex !== undefined) {
                    mixer.setBaseMix(data.auxIndex);
                }
            }
        } catch (e) {
            console.error('[WS] Error parsing message', e);
        }
    });

    ws.on('close', () => {
        console.log(`[WS] ${user.username} disconnected`);
        unsubscribe();
    });
});

server.listen(config.port, () => {
    console.log(`[Server] Running on port ${config.port}`);
});
