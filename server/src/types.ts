export interface User {
    id: string;
    username: string;
    role: 'admin' | 'musician';
    auxIndex?: number; // 0 for AUX 1, 1 for AUX 2, etc. (0-indexed)
}

export interface MixState {
    master: number; // 0.0 to 1.0
    channels: number[]; // channel volumes, 0.0 to 1.0
}

export interface MixerState {
    auxes: MixState[];
    presetBase: Record<number, MixState>; // auxIndex -> baseline limits
    isConnected: boolean;
}
