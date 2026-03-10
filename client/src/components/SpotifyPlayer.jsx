import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
//  ATLAS SPOTIFY PLAYER
//  Component by: Pranathi Udaya Kumar (241IT054)
//
//  Setup:
//  1. Go to https://developer.spotify.com/dashboard
//  2. Create an app → set Redirect URI to: http://localhost:3000
//  3. Copy Client ID → paste below or in .env as REACT_APP_SPOTIFY_CLIENT_ID
// ============================================================

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = window.location.origin;
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
].join(' ');

// ── Study mood playlists (Spotify public playlist IDs) ──────
const STUDY_PLAYLISTS = [
  { id: '37i9dQZF1DX8NTLI2TtZa6', name: 'Deep Focus', icon: '🧠', color: '#4158D0' },
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Coding', icon: '💻', color: '#0093E9' },
  { id: '37i9dQZF1DX9sIqqvKsjEp', name: 'Lo-Fi Beats', icon: '🎧', color: '#8EC5FC' },
  { id: '37i9dQZF1DWWQRwui0ExPn', name: 'Night Owl', icon: '🦉', color: '#0F2027' },
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', icon: '🎹', color: '#2D3561' },
];

// Spotify OAuth PKCE flow helpers
const generateCodeVerifier = () => {
  const array = new Uint32Array(56);
  crypto.getRandomValues(array);
  return Array.from(array, (d) => ('0' + d.toString(16)).slice(-2)).join('');
};

const generateCodeChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const loginWithSpotify = async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem('spotify_verifier', verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
};

const fetchToken = async (code) => {
  const verifier = localStorage.getItem('spotify_verifier');
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('spotify_token', data.access_token);
    localStorage.setItem('spotify_refresh', data.refresh_token);
    localStorage.setItem('spotify_expiry', Date.now() + data.expires_in * 1000);
    return data.access_token;
  }
  throw new Error(data.error_description || 'Token fetch failed');
};

const refreshToken = async () => {
  const refresh = localStorage.getItem('spotify_refresh');
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refresh,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('spotify_token', data.access_token);
    localStorage.setItem('spotify_expiry', Date.now() + data.expires_in * 1000);
    return data.access_token;
  }
  return null;
};

const getValidToken = async () => {
  const expiry = localStorage.getItem('spotify_expiry');
  const token = localStorage.getItem('spotify_token');
  if (!token) return null;
  if (Date.now() > Number(expiry) - 60000) return await refreshToken();
  return token;
};

// Spotify API helpers
const spotifyFetch = async (endpoint, options = {}) => {
  const token = await getValidToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return {};
  if (!res.ok) throw new Error(`Spotify API ${res.status}`);
  return res.json();
};

// ── Progress Bar ─────────────────────────────────────────────
const ProgressBar = ({ progress, duration, onSeek }) => {
  const pct = duration ? (progress / duration) * 100 : 0;
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  return (
    <div style={{ padding: '4px 0 8px' }}>
      <div
        style={styles.progressTrack}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek(Math.round(((e.clientX - rect.left) / rect.width) * duration));
        }}
      >
        <div style={{ ...styles.progressFill, width: `${pct}%` }} />
        <div style={{ ...styles.progressThumb, left: `${pct}%` }} />
      </div>
      <div style={styles.timeRow}>
        <span>{fmt(progress)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────
const SpotifyPlayer = ({ onClose }) => {
  const [token, setToken] = useState(null);
  const [clientId, setClientId] = useState(CLIENT_ID);
  const [showIdInput, setShowIdInput] = useState(!CLIENT_ID);
  const [tempId, setTempId] = useState('');
  const [playback, setPlayback] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [view, setView] = useState('player'); // 'player' | 'playlists'
  const [error, setError] = useState('');
  const [volume, setVolume] = useState(50);
  const pollRef = useRef(null);

  // ── Handle OAuth redirect code ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && clientId) {
      fetchToken(code)
        .then((t) => {
          setToken(t);
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch((e) => setError(e.message));
    } else {
      getValidToken().then(setToken);
    }
  }, [clientId]);

  // ── Poll playback state every 3s ──
  const pollPlayback = useCallback(async () => {
    try {
      const data = await spotifyFetch('/me/player');
      if (data) setPlayback(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!token) return;
    pollPlayback();
    pollRef.current = setInterval(pollPlayback, 3000);
    return () => clearInterval(pollRef.current);
  }, [token, pollPlayback]);

  // ── Fetch user playlists ──
  useEffect(() => {
    if (!token) return;
    spotifyFetch('/me/playlists?limit=20')
      .then((d) => setPlaylists(d?.items || []))
      .catch(() => {});
  }, [token]);

  // ── Playback controls ──
  const play = () => spotifyFetch('/me/player/play', { method: 'PUT' }).then(pollPlayback);
  const pause = () => spotifyFetch('/me/player/pause', { method: 'PUT' }).then(pollPlayback);
  const next = () => spotifyFetch('/me/player/next', { method: 'POST' }).then(pollPlayback);
  const prev = () => spotifyFetch('/me/player/previous', { method: 'POST' }).then(pollPlayback);

  const seek = (ms) =>
    spotifyFetch(`/me/player/seek?position_ms=${ms}`, { method: 'PUT' }).then(pollPlayback);

  const setVol = async (v) => {
    setVolume(v);
    spotifyFetch(`/me/player/volume?volume_percent=${v}`, { method: 'PUT' });
  };

  const playPlaylist = async (uri) => {
    await spotifyFetch('/me/player/play', {
      method: 'PUT',
      body: JSON.stringify({ context_uri: uri }),
    });
    setTimeout(pollPlayback, 800);
  };

  const toggleShuffle = () =>
    spotifyFetch(`/me/player/shuffle?state=${!playback?.shuffle_state}`, { method: 'PUT' }).then(pollPlayback);

  const toggleRepeat = () => {
    const modes = ['off', 'context', 'track'];
    const next = modes[(modes.indexOf(playback?.repeat_state || 'off') + 1) % 3];
    spotifyFetch(`/me/player/repeat?state=${next}`, { method: 'PUT' }).then(pollPlayback);
  };

  const track = playback?.item;
  const isPlaying = playback?.is_playing;

  if (showIdInput || !clientId) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>🎵 SPOTIFY</div>
          <button style={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={styles.keyBox}>
            <div style={{ fontSize: 13, color: '#1db954', marginBottom: 6, fontWeight: 700 }}>
              🔑 Spotify Client ID
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
              Get it from{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" style={{ color: '#1db954' }}>
                developer.spotify.com
              </a>
              {' '}→ Create App → set Redirect URI to{' '}
              <code style={{ color: '#aaa' }}>{REDIRECT_URI}</code>
            </div>
            <input
              style={{ ...styles.keyInput, borderColor: 'rgba(29,185,84,0.4)' }}
              placeholder="Paste Client ID..."
              value={tempId}
              onChange={(e) => setTempId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setClientId(tempId) && setShowIdInput(false)}
              autoFocus
            />
            <button
              style={{ ...styles.saveBtn, background: '#1db954', marginTop: 10, width: '100%' }}
              onClick={() => { setClientId(tempId); setShowIdInput(false); }}
            >
              Connect Spotify
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>🎵 SPOTIFY</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.iconBtn} onClick={() => setShowIdInput(true)}>🔑</button>
            <button style={styles.iconBtn} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={styles.spotifyOrb}>♫</div>
          <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
            Connect your Spotify account<br />to play music in your study workspace
          </div>
          {error && <div style={{ color: '#ff4757', fontSize: 11 }}>{error}</div>}
          <button style={styles.connectBtn} onClick={loginWithSpotify}>
            Connect Spotify
          </button>
          <div style={{ color: '#555', fontSize: 10, textAlign: 'center' }}>
            Requires Spotify Premium for playback control
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ ...styles.tabBtn, ...(view === 'player' ? styles.tabActive : {}) }}
            onClick={() => setView('player')}
          >
            Now Playing
          </button>
          <button
            style={{ ...styles.tabBtn, ...(view === 'playlists' ? styles.tabActive : {}) }}
            onClick={() => setView('playlists')}
          >
            Playlists
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={styles.iconBtn} onClick={() => setShowIdInput(true)} title="Settings">⚙️</button>
          <button style={styles.iconBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── Player View ── */}
      {view === 'player' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {track ? (
            <>
              {/* Album Art */}
              <div style={styles.albumArtWrapper}>
                {track.album?.images?.[0]?.url ? (
                  <img
                    src={track.album.images[0].url}
                    alt="album"
                    style={styles.albumArt}
                  />
                ) : (
                  <div style={{ ...styles.albumArt, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                    🎵
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={styles.trackName}>{track.name}</div>
                <div style={styles.artistName}>
                  {track.artists?.map((a) => a.name).join(', ')}
                </div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{track.album?.name}</div>
              </div>

              {/* Progress */}
              <ProgressBar
                progress={playback.progress_ms || 0}
                duration={track.duration_ms || 1}
                onSeek={seek}
              />

              {/* Controls */}
              <div style={styles.controls}>
                <button
                  style={{ ...styles.ctrlBtn, color: playback?.shuffle_state ? '#1db954' : '#666' }}
                  onClick={toggleShuffle} title="Shuffle"
                >⇄</button>
                <button style={styles.ctrlBtn} onClick={prev}>⏮</button>
                <button style={styles.playBtn} onClick={isPlaying ? pause : play}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button style={styles.ctrlBtn} onClick={next}>⏭</button>
                <button
                  style={{ ...styles.ctrlBtn, color: playback?.repeat_state !== 'off' ? '#1db954' : '#666' }}
                  onClick={toggleRepeat} title="Repeat"
                >⟲</button>
              </div>

              {/* Volume */}
              <div style={styles.volRow}>
                <span style={{ fontSize: 12 }}>🔈</span>
                <input
                  type="range" min={0} max={100} value={volume}
                  onChange={(e) => setVol(Number(e.target.value))}
                  style={styles.volSlider}
                />
                <span style={{ fontSize: 12 }}>🔊</span>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={styles.spotifyOrb}>♫</div>
              <div style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
                No track playing.<br />Open Spotify and start a track,<br />or pick a study playlist →
              </div>
              <button style={{ ...styles.connectBtn, fontSize: 12, padding: '8px 20px' }} onClick={() => setView('playlists')}>
                Browse Study Playlists
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Playlists View ── */}
      {view === 'playlists' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 6 }}>STUDY MOODS</div>
          {STUDY_PLAYLISTS.map((p) => (
            <button
              key={p.id}
              style={{ ...styles.playlistItem, background: activePlaylist === p.id ? `${p.color}33` : 'rgba(255,255,255,0.03)' }}
              onClick={() => {
                setActivePlaylist(p.id);
                playPlaylist(`spotify:playlist:${p.id}`);
              }}
            >
              <span style={{ fontSize: 22 }}>{p.icon}</span>
              <span style={{ fontSize: 13 }}>{p.name}</span>
              {activePlaylist === p.id && isPlaying && <span style={{ marginLeft: 'auto', color: '#1db954', fontSize: 12 }}>▶ Playing</span>}
            </button>
          ))}

          {playlists.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>YOUR PLAYLISTS</div>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  style={{ ...styles.playlistItem, background: activePlaylist === p.id ? 'rgba(29,185,84,0.15)' : 'rgba(255,255,255,0.03)' }}
                  onClick={() => {
                    setActivePlaylist(p.id);
                    playPlaylist(p.uri);
                  }}
                >
                  {p.images?.[0]?.url
                    ? <img src={p.images[0].url} alt="" style={{ width: 32, height: 32, borderRadius: 4 }} />
                    : <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>🎵</span>
                  }
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#555' }}>{p.tracks?.total} tracks</div>
                  </div>
                  {activePlaylist === p.id && isPlaying && <span style={{ marginLeft: 'auto', color: '#1db954', fontSize: 12 }}>▶</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: "'Rajdhani', monospace",
    color: '#e0f0e0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottom: '1px solid rgba(29,185,84,0.2)',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: 3, color: '#1db954' },
  iconBtn: {
    background: 'rgba(29,185,84,0.08)',
    border: '1px solid rgba(29,185,84,0.2)',
    color: '#1db954',
    width: 30,
    height: 30,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  tabBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#666',
    padding: '5px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tabActive: { borderColor: '#1db954', color: '#1db954', background: 'rgba(29,185,84,0.1)' },
  spotifyOrb: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #1db954, #0a7a38)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    boxShadow: '0 0 30px rgba(29,185,84,0.3)',
  },
  connectBtn: {
    background: '#1db954',
    border: 'none',
    color: 'white',
    padding: '12px 28px',
    borderRadius: 30,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 1,
  },
  albumArtWrapper: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  albumArt: { width: 160, height: 160, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' },
  trackName: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: 0.5 },
  artistName: { fontSize: 12, color: '#1db954' },
  progressTrack: {
    height: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    cursor: 'pointer',
    position: 'relative',
    marginBottom: 4,
  },
  progressFill: { height: '100%', background: '#1db954', borderRadius: 2, transition: 'width 1s linear' },
  progressThumb: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#fff',
  },
  timeRow: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  ctrlBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: 18,
    cursor: 'pointer',
    padding: 4,
    transition: 'color 0.2s',
  },
  playBtn: {
    background: '#1db954',
    border: 'none',
    color: 'white',
    width: 46,
    height: 46,
    borderRadius: '50%',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(29,185,84,0.4)',
  },
  volRow: { display: 'flex', alignItems: 'center', gap: 8 },
  volSlider: { flex: 1, accentColor: '#1db954', cursor: 'pointer' },
  playlistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
    color: '#ccc',
    textAlign: 'left',
    transition: 'all 0.2s',
    width: '100%',
  },
  keyBox: {
    background: '#0d1117',
    border: '1px solid rgba(29,185,84,0.3)',
    borderRadius: 12,
    padding: 24,
    width: '100%',
  },
  keyInput: {
    width: '100%',
    background: 'rgba(29,185,84,0.06)',
    border: '1px solid rgba(29,185,84,0.3)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#e0f0e0',
    fontSize: 13,
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
  },
  saveBtn: {
    border: 'none',
    color: 'white',
    padding: '9px 0',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
  },
};

export default SpotifyPlayer;
