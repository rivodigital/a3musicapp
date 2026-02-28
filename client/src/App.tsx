import React, { useState, useEffect, useRef } from 'react';
import { Fader } from './Fader';
import { SoundcraftUI } from 'soundcraft-ui-connection';
import './index.css';

interface UserData {
  instrument: string;
  instrumentIndex: number;
  additionalInstruments?: number[];
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
  const [myInstrumentVol, setMyInstrumentVol] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Connection Error States so we can show user-friendly messages
  const [setupError, setSetupError] = useState(false);
  const [isSetupConnected, setIsSetupConnected] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // 24 Channels from Ui24R
  const [channelsData, setChannelsData] = useState<{ vol: number, name: string }[]>(() => {
    return Array(24).fill(0).map((_, i) => ({ vol: 0, name: `CH ${i + 1}` }));
  });

  // Setup channels for the dropdown
  const [setupChannels, setSetupChannels] = useState<{ index: number, name: string }[]>([]);
  const [setupAuxes, setSetupAuxes] = useState<{ index: number, name: string }[]>([]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detect if already installed (standalone mode)
    const isStand = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStand);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const suiRef = useRef<SoundcraftUI | null>(null);

  // Effect for Setup Screen
  useEffect(() => {
    if (userData) return;

    let unsubs: Array<() => void> = [];
    const sui = new SoundcraftUI('192.168.1.10');

    // Initialize with default values just in case
    setSetupChannels(Array(24).fill(0).map((_, i) => ({ index: i, name: `CH ${i + 1}` })));
    setSetupAuxes(Array(10).fill(0).map((_, i) => ({ index: i, name: `AUX ${i + 1}` })));

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
        setIsSetupConnected(true);

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

        for (let i = 0; i < 10; i++) {
          const aux = sui.master.aux(i + 1);
          const subAuxName = aux.name$.subscribe((name: string) => {
            setSetupAuxes(prev => {
              const next = [...prev];
              next[i] = { index: i, name: name || `AUX ${i + 1}` };
              return next;
            });
          });
          unsubs.push(() => subAuxName.unsubscribe());
        }
      } catch (e) {
        console.error("Failed to connect for setup names", e);
        setSetupError(true);
      }
    };

    fetchSetupChannels();

    return () => {
      clearTimeout(connectTimeout);
      setIsSetupConnected(false);
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

      if (userData.mixerIp === 'DEMO') {
        setIsConnected(true);
        setSessionError(false);
        setChannelsData(Array(24).fill(0).map((_, i) => ({ vol: 0.5, name: `Canal Teste ${i + 1}` })));
        return; // Don't actually connect to the mixer in demo mode
      }

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

        // Listen to User's specific instrument volume
        const myChannel = sui.aux(userData.auxIndex + 1).input(userData.instrumentIndex + 1);
        const subMyVol = myChannel.faderLevel$.subscribe((val: number) => setMyInstrumentVol(val));
        unsubs.push(() => subMyVol.unsubscribe());

        const auxBus = sui.master.aux(userData.auxIndex + 1);

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
      instrument: target.instrument.options[target.instrument.selectedIndex].text,
      instrumentIndex: parseInt(target.instrument.value, 10),
      additionalInstruments: [],
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
    if (userData?.mixerIp === 'DEMO') {
      setChannelsData(prev => {
        const next = [...prev];
        next[chIndex] = { ...next[chIndex], vol };
        return next;
      });
      return;
    }
    if (!suiRef.current || !userData) return;
    try {
      suiRef.current.aux(userData.auxIndex + 1).input(chIndex + 1).setFaderLevel(vol);
    } catch (e) { }
  };

  const handleSetMyInstrumentVol = (vol: number) => {
    if (userData?.mixerIp === 'DEMO') {
      setMyInstrumentVol(vol);
      return;
    }
    if (!suiRef.current || !userData) return;
    try {
      suiRef.current.aux(userData.auxIndex + 1).input(userData.instrumentIndex + 1).setFaderLevel(vol);
    } catch (e) { }
  };

  const handleToggleMute = () => {
    if (userData?.mixerIp === 'DEMO') {
      setIsMuted(!isMuted);
      return;
    }
    if (!suiRef.current || !userData) return;
    try {
      if (isMuted) {
        suiRef.current.master.aux(userData.auxIndex + 1).unmute();
      } else {
        suiRef.current.master.aux(userData.auxIndex + 1).mute();
      }
    } catch (e) { }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText("A3123456");
    alert("Senha A3123456 copiada!");
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };

  if (!userData) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel" style={{ maxWidth: 400, margin: 'auto' }}>
          <div className="brand" style={{ marginBottom: '1.5rem' }}>
            <h1 className="brand-title">A3 Music Mixer</h1>
            <p className="text-small">Monitor Pessoal Offline</p>
          </div>

          {setupError && (
            <div style={{ padding: '0.8rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'left' }}>
              <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--danger)' }}>Sem conexão com a mesa!</strong><br />
                Por favor, conecte-se na rede Wi-Fi:<br />
                <b>Rede:</b> MESADESOM-A3<br />
                <b>Senha:</b> A3123456{' '}
                <button type="button" onClick={handleCopyPassword} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '5px' }}>Copiar Senha</button>
              </p>
            </div>
          )}

          {!isSetupConnected && !setupError ? (
            <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--text-secondary)' }}>
              <div className="status-dot connected" style={{ width: 16, height: 16, marginBottom: '1rem', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />
              <p>Conectando e buscando canais...</p>
            </div>
          ) : isSetupConnected ? (
            <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  {setupAuxes.map(aux => (
                    <option key={aux.index} value={aux.index}>{aux.name}</option>
                  ))}
                </select>
              </div>

              {/* Hidden by default, useful for local testing */}
              <div className="input-group" style={{ display: 'none' }}>
                <label className="input-label">Mixer IP</label>
                <input id="mixer-ip-input" name="mixerIp" type="text" className="input" defaultValue="192.168.1.10" />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Entrar na Mixagem</button>
            </form>
          ) : (
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button type="button" onClick={() => window.location.reload()} className="btn" style={{ padding: '0.8rem' }}>
                🔄 Tentar reconectar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupChannels(Array(24).fill(0).map((_, i) => ({ index: i, name: `Canal Teste ${i + 1}` })));
                  setSetupAuxes(Array(10).fill(0).map((_, i) => ({ index: i, name: `AUX Teste ${i + 1}` })));
                  setSetupError(false);
                  setIsSetupConnected(true);
                  setTimeout(() => {
                    const ipInput = document.getElementById('mixer-ip-input') as HTMLInputElement;
                    if (ipInput) ipInput.value = 'DEMO';
                  }, 100);
                }}
                className="btn"
                style={{ padding: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                🎮 Entrar no Modo Teste (Offline)
              </button>
            </form>
          )}

          {/* PWA Install Area */}
          {!isStandalone && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {deferredPrompt && (
                <button type="button" onClick={handleInstallClick} className="btn" style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  ⬇️ Instalar Aplicativo
                </button>
              )}
              {isIOS && !deferredPrompt && (
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <p>Para instalar no <b>iPhone</b>:</p>
                  <p>Toque em <span style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>⍐</span> <b>Compartilhar</b> e depois <b>Adicionar à Tela de Início</b></p>
                </div>
              )}
            </div>
          )}
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
            <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Fader
                label={`VOLUME: ${userData.instrument.toUpperCase()}`}
                color="var(--accent)"
                value={myInstrumentVol}
                isMaster={true}
                onChange={(val) => handleSetMyInstrumentVol(val)}
              />

              {(userData.additionalInstruments || []).map(chIdx => (
                <div key={`add-${chIdx}`} style={{ position: 'relative' }}>
                  <Fader
                    label={`VOLUME: ${channelsData[chIdx].name.toUpperCase()}`}
                    color="var(--accent)"
                    value={channelsData[chIdx].vol}
                    isMaster={true}
                    onChange={(val) => handleSetVol(chIdx, val)}
                  />
                  <button
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                    onClick={() => {
                      const nextAdd = (userData.additionalInstruments || []).filter(id => id !== chIdx);
                      const updated = { ...userData, additionalInstruments: nextAdd };
                      setUserData(updated);
                      localStorage.setItem('userData', JSON.stringify(updated));
                    }}
                  >✕</button>
                </div>
              ))}

              {/* Minimalist Add Button placed in the flex row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '80px' }}>
                {isAddingChannel ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--surface)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <select
                      className="input"
                      style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                      value=""
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          const nextAdd = [...(userData.additionalInstruments || []), val];
                          const updated = { ...userData, additionalInstruments: nextAdd };
                          setUserData(updated);
                          localStorage.setItem('userData', JSON.stringify(updated));
                          setIsAddingChannel(false);
                        }
                      }}
                    >
                      <option value="" disabled>Qual?</option>
                      {channelsData.map((ch, i) => {
                        if (i === userData.instrumentIndex || (userData.additionalInstruments || []).includes(i)) return null;
                        return <option key={i} value={i}>{ch.name}</option>;
                      })}
                    </select>
                    <button className="btn" style={{ padding: '0.3rem', fontSize: '0.8rem' }} onClick={() => setIsAddingChannel(false)}>Cancelar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingChannel(true)}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    title="Adicionar Canal"
                  >
                    +
                  </button>
                )}
              </div>
            </div>


            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>OUTROS INSTRUMENTOS DA BANDA</h3>
            <div className="mixer-grid">
              {channelsData.map((ch, i: number) => {
                if (i === userData.instrumentIndex || (userData.additionalInstruments || []).includes(i)) return null;
                return (
                  <Fader
                    key={i}
                    label={ch.name}
                    color={getChannelColor(ch.name, i)}
                    value={ch.vol}
                    onChange={(val) => handleSetVol(i, val)}
                  />
                );
              })}
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
                  Para usar o monitor pessoal, o seu dispositivo <strong>obrigatoriamente precisa estar conectado no Wi-Fi da Mesa</strong>.
                </p>

                <ol style={{ textAlign: 'left', color: '#ccc', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                  <li>Vá nos <b>Ajustes de Wi-Fi</b> do celular.</li>
                  <li>Conecte-se na rede <b>MESADESOM-A3</b>.</li>
                  <li>Senha: <b>A3123456</b>
                    <button type="button" onClick={handleCopyPassword} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '10px' }}>Copiar Senha</button>
                  </li>
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
