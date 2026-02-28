import React, { useState, useEffect, useRef } from 'react';
import { Fader } from './Fader';
import { SoundcraftUI } from 'soundcraft-ui-connection';
import './index.css';

interface UserData {
  name: string;
  instrument: string;
  auxIndex: number;
  mixerIp: string;
}

const getChannelColor = (name: string, index: number) => {
  const n = name.toLowerCase();
  if (n.includes('bat') || n.includes('kick') || n.includes('snare') || n.includes('tom') || n.includes('over ') || n.includes('hat')) return 'var(--ch-drums)';
  if (n.includes('baix') || n.includes('bass')) return 'var(--ch-bass)';
  if (n.includes('guit')) return 'var(--ch-guitar)';
  if (n.includes('tecl') || n.includes('key')) return 'var(--ch-keys)';
  if (n.includes('voz') || n.includes('voc')) return 'var(--ch-vocal)';
  if (n.includes('click') || n.includes('metron')) return 'var(--ch-click)';
  if (n.includes('vs') || n.includes('play')) return 'var(--accent)';

  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];
  return colors[index % colors.length];
};

export function App() {
  const [userData, setUserData] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('userData');
    return saved ? JSON.parse(saved) : null;
  });

  const [isConnected, setIsConnected] = useState(false);
  const [masterVol, setMasterVol] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Connection Error States so we can show user-friendly messages
  const [setupError, setSetupError] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // 24 Channels from Ui24R
  const [channelsData, setChannelsData] = useState<{ vol: number, name: string }[]>(() => {
    return Array(24).fill(0).map((_, i) => ({ vol: 0, name: `CH ${i + 1}` }));
  });

  // Setup channels for the dropdown
  const [setupChannels, setSetupChannels] = useState<{ index: number, name: string }[]>([]);

  const suiRef = useRef<SoundcraftUI | null>(null);

  // Effect for Setup Screen
  useEffect(() => {
    if (userData) return;

    let unsubs: Array<() => void> = [];
    const sui = new SoundcraftUI('192.168.1.10');

    // Initialize with default values just in case
    setSetupChannels(Array(24).fill(0).map((_, i) => ({ index: i, name: `CH ${i + 1}` })));

    let connectTimeout: any;

    const fetchSetupChannels = async () => {
      try {
        connectTimeout = setTimeout(() => {
          setSetupError(true);
        }, 4000); // 4 seconds to timeout

        await sui.connect();

        // If it connected, clear the error
        clearTimeout(connectTimeout);
        setSetupError(false);

        for (let i = 0; i < 24; i++) {
          const input = sui.master.input(i + 1);
          const subName = input.name$.subscribe((name: string) => {
            setSetupChannels(prev => {
              const next = [...prev];
              next[i] = { index: i, name: name || `CH ${i + 1}` };
              return next;
            });
          });
          unsubs.push(() => subName.unsubscribe());
        }
      } catch (e) {
        console.error("Failed to connect for setup names", e);
        setSetupError(true);
      }
    };

    fetchSetupChannels();

    return () => {
      clearTimeout(connectTimeout);
      unsubs.forEach(u => u());
      sui.disconnect();
    };
  }, [userData]);


  // Effect for Musician View
  useEffect(() => {
    let unsubs: Array<() => void> = [];
    let connectTimeout: any;

    const connectMixer = async () => {
      if (!userData) return;

      const sui = new SoundcraftUI(userData.mixerIp);
      suiRef.current = sui;

      // Subscribe to connection status
      const subStatus = sui.status$.subscribe((status: any) => {
        const connected = status.type === 'OPEN';
        setIsConnected(connected);
        if (connected) {
          clearTimeout(connectTimeout);
          setSessionError(false);
        }
      });
      unsubs.push(() => subStatus.unsubscribe());

      try {
        connectTimeout = setTimeout(() => {
          if (!isConnected) {
            setSessionError(true);
          }
        }, 5000); // 5 sec timeout

        await sui.connect();

        // Listen to Master AUX Volume
        const auxBus = sui.master.aux(userData.auxIndex + 1);
        const subMaster = auxBus.faderLevel$.subscribe((val: number) => setMasterVol(val));
        unsubs.push(() => subMaster.unsubscribe());

        // Listen to Master AUX Mute
        const subMute = auxBus.mute$.subscribe((val: number) => setIsMuted(val === 1));
        unsubs.push(() => subMute.unsubscribe());

        // Listen to all 24 Input Channels for this AUX
        for (let i = 0; i < 24; i++) {
          const input = sui.aux(userData.auxIndex + 1).input(i + 1);

          const subVol = input.faderLevel$.subscribe((val: number) => {
            setChannelsData(prev => {
              const next = [...prev];
              next[i] = { ...next[i], vol: val };
              return next;
            });
          });
          unsubs.push(() => subVol.unsubscribe());

          const subName = input.name$.subscribe((name: string) => {
            setChannelsData(prev => {
              const next = [...prev];
              next[i] = { ...next[i], name: name || `CH ${i + 1}` };
              return next;
            });
          });
          unsubs.push(() => subName.unsubscribe());
        }

      } catch (err) {
        console.error("Connection error: ", err);
        setSessionError(true);
      }
    };

    if (userData) {
      connectMixer();
    }

    return () => {
      clearTimeout(connectTimeout);
      unsubs.forEach(unsub => unsub());
      if (suiRef.current) {
        suiRef.current.disconnect();
      }
    };
  }, [userData]);

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const data: UserData = {
      name: target.name.value,
      instrument: target.instrument.options[target.instrument.selectedIndex].text,
      auxIndex: parseInt(target.auxIndex.value, 10),
      mixerIp: target.mixerIp.value || '192.168.1.10'
    };

    setUserData(data);
    localStorage.setItem('userData', JSON.stringify(data));
  };

  const handleLogout = () => {
    setUserData(null);
    setIsConnected(false);
    setSessionError(false);
    localStorage.removeItem('userData');
    if (suiRef.current) {
      suiRef.current.disconnect();
      suiRef.current = null;
    }
  };

  const handleSetVol = (chIndex: number, vol: number) => {
    if (!suiRef.current || !userData) return;
    try {
      suiRef.current.aux(userData.auxIndex + 1).input(chIndex + 1).setFaderLevel(vol);
    } catch (e) { }
  };

  const handleSetMaster = (vol: number) => {
    if (!suiRef.current || !userData) return;
    try {
      suiRef.current.master.aux(userData.auxIndex + 1).setFaderLevel(vol);
    } catch (e) { }
  };

  const handleToggleMute = () => {
    if (!suiRef.current || !userData) return;
    try {
      if (isMuted) {
        suiRef.current.master.aux(userData.auxIndex + 1).unmute();
      } else {
        suiRef.current.master.aux(userData.auxIndex + 1).mute();
      }
    } catch (e) { }
  };

  if (!userData) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel" style={{ maxWidth: 400, margin: 'auto' }}>
          <div className="brand" style={{ marginBottom: '1.5rem' }}>
            <h1 className="brand-title">A3Mon</h1>
            <p className="text-small">Monitor Pessoal Offline</p>
          </div>

          {setupError && (
            <div style={{ padding: '0.8rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0 }}>
                <strong style={{ color: 'var(--danger)' }}>Sem conexão com a mesa!</strong><br />
                Por favor, conecte-se na rede <b>Wi-Fi da Igreja A3</b>.
              </p>
            </div>
          )}

          <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Seu Nome</label>
              <input name="name" type="text" className="input" placeholder="ex: João" required />
            </div>

            <div className="input-group">
              <label className="input-label">Qual é o seu canal / instrumento?</label>
              <select name="instrument" className="input" required>
                {setupChannels.map(ch => (
                  <option key={ch.index} value={ch.index}>{ch.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Qual é o seu AUX? (Pergunte ao técnico)</label>
              <select name="auxIndex" className="input" required defaultValue="0">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((auxNum, idx) => (
                  <option key={idx} value={idx}>AUX {auxNum}</option>
                ))}
              </select>
            </div>

            {/* Hidden by default, useful for local testing */}
            <div className="input-group" style={{ display: 'none' }}>
              <label className="input-label">Mixer IP</label>
              <input name="mixerIp" type="text" className="input" defaultValue="192.168.1.10" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Entrar na Mixagem</button>

            {setupError && (
              <button type="button" onClick={() => window.location.reload()} className="btn" style={{ padding: '0.8rem' }}>
                🔄 Tentar reconectar
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Musician View
  return (
    <div className="app-container">
      <header className="top-bar glass-panel" style={{ marginBottom: '0', borderRadius: '0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="connection-status">
          <div className={`status-dot ${isConnected ? 'connected' : 'offline'}`} />
          <span style={{ fontWeight: 600 }}>AUX {userData.auxIndex + 1} - {userData.instrument}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={isMuted ? "btn btn-danger" : "btn"}
            onClick={handleToggleMute}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            {isMuted ? '🔇 Mutado' : '🔊 Mute Geral'}
          </button>
          <button className="btn" onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>⚙️</button>
        </div>
      </header>

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isConnected ? (
          <div style={{ opacity: isMuted ? 0.3 : 1, transition: 'opacity 0.2s', pointerEvents: isMuted ? 'none' : 'auto' }}>
            <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <Fader
                label="MEU VOLUME"
                color="var(--accent)"
                value={masterVol}
                isMaster={true}
                onChange={(val) => handleSetMaster(val)}
              />
            </div>

            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Minha Mixagem</h3>
            <div className="mixer-grid">
              {channelsData.map((ch, i: number) => (
                <Fader
                  key={i}
                  label={ch.name}
                  color={getChannelColor(ch.name, i)}
                  value={ch.vol}
                  onChange={(val) => handleSetVol(i, val)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
            {!sessionError ? (
              <>
                <div className="status-dot connected" style={{ width: 16, height: 16, marginBottom: '1rem', animation: 'pulse 1.5s infinite' }} />
                <p style={{ fontSize: '1.1rem' }}>Conectando à mesa de som...</p>
                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem' }}>Aguardando rede 192.168.1.10</p>
              </>
            ) : (
              <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: 400 }}>
                <h2 style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '1.4rem' }}>Você está Offline</h2>
                <p style={{ color: '#fff', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Para usar o monitor pessoal, o seu dispositivo <strong>obrigatoriamente precisa estar conectado no Wi-Fi da Mesa (Igreja A3)</strong>.
                </p>

                <ol style={{ textAlign: 'left', color: '#ccc', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                  <li>Saia do aplicativo (mas não feche).</li>
                  <li>Vá nos <b>Ajustes de Wi-Fi</b> do celular.</li>
                  <li>Conecte-se na rede da <b>Mesa de Som (A3)</b>.</li>
                  <li>Volte aqui e clique no botão abaixo.</li>
                </ol>

                <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={() => window.location.reload()}>
                  Tentar Reconectar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
