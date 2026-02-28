import { SoundcraftUI } from 'soundcraft-ui-connection';
import { config } from './config';
import { MixerState, MixState } from './types';

export class MixerService {
    state: MixerState = {
        auxes: [],
        presetBase: {},
        isConnected: false,
    };

    private listeners: Set<(state: MixerState) => void> = new Set();
    public static readonly MAX_OFFSET = 0.15; // +/- 6dB linearly approx for 0-1 scale

    private sui?: SoundcraftUI;

    constructor() {
        this.initMockState(); // Always init state structure
    }

    private initMockState() {
        for (let i = 0; i < 8; i++) {
            const initialMix: MixState = {
                master: 0.5,
                channels: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] // 8 channels
            };
            this.state.auxes.push(JSON.parse(JSON.stringify(initialMix)));
            this.state.presetBase[i] = JSON.parse(JSON.stringify(initialMix));
        }
    }

    public async connect() {
        console.log(`[Mixer] Connecting to Ui24R... Mock Mode: ${config.useMock}`);

        if (config.useMock) {
            setTimeout(() => {
                console.log('[Mixer] Connected (Mock)');
                this.state.isConnected = true;
                this.notify();
            }, 1000);
            return;
        }

        try {
            this.sui = new SoundcraftUI(config.ui24rIp);
            await this.sui.connect();
            console.log('[Mixer] Connected to physical Soundcraft Ui24R');
            this.state.isConnected = true;

            // We should ideally sync the physical mixer state to our internal state here.
            // For now, we will update our internal tracking state to match what we send.
            this.notify();
        } catch (error) {
            console.error('[Mixer] Connection failed', error);
        }
    }

    public setChannelVolume(auxIndex: number, chIndex: number, vol: number) {
        if (auxIndex < 0 || auxIndex >= this.state.auxes.length) return;
        if (chIndex < 0 || chIndex >= this.state.auxes[auxIndex].channels.length) return;

        let newVol = Math.max(0, Math.min(1, vol));

        this.state.auxes[auxIndex].channels[chIndex] = newVol;

        // Send to physical mixer
        if (this.sui && !config.useMock) {
            // auxIndex is 0-indexed, UI24R aux are 1-indexed
            // chIndex is 0-indexed, UI24R inputs are 1-indexed
            const auxNum = auxIndex + 1;
            const chNum = chIndex + 1;
            try {
                this.sui.aux(auxNum).input(chNum).faderLevel = newVol;
            } catch (e) {
                console.error('Error setting physical channel volume', e);
            }
        }

        this.notify();
    }

    public setMasterVolume(auxIndex: number, vol: number) {
        if (auxIndex < 0 || auxIndex >= this.state.auxes.length) return;

        let newVol = Math.max(0, Math.min(1, vol));

        this.state.auxes[auxIndex].master = newVol;

        if (this.sui && !config.useMock) {
            const auxNum = auxIndex + 1;
            try {
                // According to soundcraft-ui-connection docs the aux bus itself has a fader
                this.sui.aux(auxNum).faderLevel = newVol;
            } catch (e) {
                console.error('Error setting physical aux master volume', e);
            }
        }

        this.notify();
    }

    public resetToBase(auxIndex: number) {
        if (auxIndex < 0 || auxIndex >= this.state.auxes.length) return;

        // Copy base mix back to current
        const baseState = this.state.presetBase[auxIndex];
        this.state.auxes[auxIndex] = JSON.parse(JSON.stringify(baseState));

        // Update physical mixer to new levels
        if (this.sui && !config.useMock) {
            const auxNum = auxIndex + 1;
            try {
                this.sui.aux(auxNum).faderLevel = baseState.master;
                for (let i = 0; i < baseState.channels.length; i++) {
                    this.sui.aux(auxNum).input(i + 1).faderLevel = baseState.channels[i];
                }
            } catch (e) {
                console.error('Error resetting to base on physical mixer', e);
            }
        }

        this.notify();
    }

    public setBaseMix(auxIndex: number) {
        if (auxIndex < 0 || auxIndex >= this.state.auxes.length) return;
        this.state.presetBase[auxIndex] = JSON.parse(JSON.stringify(this.state.auxes[auxIndex]));
        this.notify();
    }

    public subscribe(listener: (state: MixerState) => void) {
        this.listeners.add(listener);
        listener(this.state); // send initial state
        return () => this.listeners.delete(listener);
    }

    private notify() {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }
}

export const mixer = new MixerService();
