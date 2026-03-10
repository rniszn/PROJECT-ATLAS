import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Experience from './components/canvas/Experience';
import AIChatbot from './components/AIChatbot';
import SpotifyPlayer from './components/SpotifyPlayer';
import './App.css';

const NavHint = ({ icon, label, onClick, active, color }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
      color: active ? color : '#888',
      padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
      fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
      letterSpacing: 1, transition: 'all 0.2s', fontFamily: 'inherit',
    }}
  >
    {icon} {label}
  </button>
);

function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeModule === 'study') {
      setLoading(true);
      fetch('http://localhost:5000/api/tasks')
        .then((res) => { 
          if (!res.ok) throw new Error("Network response was not ok"); 
          return res.json(); 
        })
        .then((data) => { 
          setTasks(data); 
          setLoading(false); 
        })
        .catch((err) => {
          console.error("API Fetch Error:", err);
          setTasks([{ id: 99, title: '❌ Cannot connect to backend server', priority: 'High', status: 'Error' }]);
          setLoading(false);
        });
    }
  }, [activeModule]);

  const drawerBorderColor = activeModule === 'music' ? 'rgba(29,185,84,0.3)' : 
                           activeModule === 'ai' ? 'rgba(0,212,255,0.3)' : 'rgba(255,159,67,0.3)';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative' }}>

      <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <Experience setActiveModule={setActiveModule} />
        </Suspense>
      </Canvas>

      <div style={{ position: 'absolute', top: 20, left: 24, color: 'white', pointerEvents: 'none', fontFamily: "'Orbitron', monospace" }}>
        <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 6, textShadow: '0 0 20px rgba(0,212,255,0.6)' }}>ATLAS</h1>
        <p style={{ opacity: 0.5, fontSize: 10, letterSpacing: 3, margin: '4px 0 0' }}>ACADEMIC VIRTUAL WORKSPACE</p>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, fontFamily: "'Rajdhani', monospace" }}>
        <NavHint icon="🤖" label="AI"    onClick={() => setActiveModule(activeModule === 'ai'    ? null : 'ai')}    active={activeModule === 'ai'}    color="#00d4ff" />
        <NavHint icon="🎵" label="Music" onClick={() => setActiveModule(activeModule === 'music'  ? null : 'music')} active={activeModule === 'music'} color="#1db954" />
        <NavHint icon="📚" label="Study" onClick={() => setActiveModule(activeModule === 'study'  ? null : 'study')} active={activeModule === 'study'} color="#ff9f43" />
      </div>

      {activeModule && (
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 400, height: '100vh',
          background: 'rgba(8, 10, 14, 0.92)', backdropFilter: 'blur(24px)',
          borderLeft: `1px solid ${drawerBorderColor}`,
          padding: '32px 28px', 
          overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
          zIndex: 100
        }}>

          {activeModule === 'ai' && <AIChatbot onClose={() => setActiveModule(null)} />}

          {activeModule === 'music' && <SpotifyPlayer onClose={() => setActiveModule(null)} />}

          {activeModule === 'study' && (
            <div style={{ color: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottom: '1px solid rgba(255,153,67,0.3)', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: '#ff9f43' }}>STUDY WORKSPACE</div>
                  <div style={{ fontSize: 10, color: '#7a5c35', letterSpacing: 1, marginTop: 2 }}>Tasks & Syllabus Tracker</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: '#ff9f43', fontSize: 20, cursor: 'pointer' }} onClick={() => setActiveModule(null)}>✕</button>
              </div>
              
              {loading ? (
                <div style={{ color: '#ff9f43', fontSize: 13, textAlign: 'center', padding: 30 }}>⏳ Syncing with Atlas server...</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
                  {tasks.map((task) => (
                    <li key={task.id} style={{
                      background: 'rgba(255,255,255,0.04)', padding: '14px 16px', marginBottom: 10, borderRadius: 8,
                      borderLeft: task.priority === 'High' ? '4px solid #ff4757' : task.priority === 'Medium' ? '4px solid #ff9f43' : '4px solid #2ed573',
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 5, fontSize: 13 }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ fontSize: 10, color: '#888' }}>Priority: {task.priority}</span>
                        <span style={{ fontSize: 10, color: task.status === 'Error' ? '#ff4757' : '#2ed573' }}>● {task.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;