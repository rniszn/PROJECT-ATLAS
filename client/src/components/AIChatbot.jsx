import React, { useState, useRef, useEffect } from 'react';

// ============================================================
//  ATLAS AI CHATBOT — Powered by Google Gemini
//  Component by: Pranathi Udaya Kumar (241IT054)
// ============================================================

const GEMINI_API_KEY = import.meta?.env?.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '';

const SYSTEM_PROMPT = `You are ATLAS — an intelligent academic assistant built into a virtual study workspace. 
You help students with:
- Subject-specific academic doubts (Math, Physics, Chemistry, CS, etc.)
- Explaining complex concepts clearly and concisely
- Solving equations and problems step by step
- Study tips, time management, and productivity advice
- Code debugging and programming help

Keep responses focused, clear, and encouraging. Use formatting (bullet points, numbered steps) when it helps clarity.
Always be supportive and academic in tone.`;

const SUGGESTED_PROMPTS = [
  "Explain recursion with a simple example",
  "Help me understand Big O notation",
  "What is the difference between TCP and UDP?",
  "Solve: ∫x²dx",
  "Explain Dijkstra's algorithm",
];

// Typing indicator dots
const TypingIndicator = () => (
  <div className="atlas-typing">
    <span className="atlas-dot" style={{ animationDelay: '0ms' }} />
    <span className="atlas-dot" style={{ animationDelay: '180ms' }} />
    <span className="atlas-dot" style={{ animationDelay: '360ms' }} />
  </div>
);

// Formats markdown-like text from Gemini into readable HTML
const formatMessage = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(0,212,255,0.15);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br/>');
};

const AIChatbot = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm **ATLAS AI** — your academic companion. I'm powered by Gemini and ready to help with any subject doubts, problems, or concepts. What are you studying today?",
      id: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(GEMINI_API_KEY);
  const [showKeyInput, setShowKeyInput] = useState(!GEMINI_API_KEY);
  const [tempKey, setTempKey] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const callGemini = async (userMessage, history) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Build conversation history for Gemini (excluding first system message)
    const geminiHistory = history
      .filter((m) => m.role !== 'system')
      .slice(-10) // keep last 10 for context window
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.replace(/\*\*(.*?)\*\*/g, '$1') }],
      }));

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        ...geminiHistory,
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || 'Gemini API error');
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from ATLAS.';
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const userMsg = { role: 'user', content: userText, id: Date.now() };
    const updatedHistory = [...messages, userMsg];

    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await callGemini(userText, updatedHistory);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, id: Date.now() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error:** ${err.message}. Please check your Gemini API key.`,
          id: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveApiKey = () => {
    if (tempKey.trim()) {
      setApiKey(tempKey.trim());
      setShowKeyInput(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.orb} />
          <div>
            <div style={styles.title}>ATLAS AI</div>
            <div style={styles.subtitle}>Academic Assistant · Gemini Powered</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.iconBtn} onClick={() => setShowKeyInput(true)} title="Set API Key">🔑</button>
          <button style={styles.iconBtn} onClick={onClose} title="Close">✕</button>
        </div>
      </div>

      {/* ── API Key Modal ── */}
      {showKeyInput && (
        <div style={styles.keyModal}>
          <div style={styles.keyBox}>
            <div style={{ fontSize: 13, color: '#00d4ff', marginBottom: 8, fontWeight: 600 }}>
              🔑 Enter Gemini API Key
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
              Get your free key at{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#00d4ff' }}>
                aistudio.google.com
              </a>
            </div>
            <input
              style={styles.keyInput}
              type="password"
              placeholder="AIza..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button style={styles.saveBtn} onClick={saveApiKey}>Save & Connect</button>
              {apiKey && (
                <button style={{ ...styles.saveBtn, background: 'rgba(255,255,255,0.05)' }} onClick={() => setShowKeyInput(false)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}
          >
            {msg.role === 'assistant' && <div style={styles.aiLabel}>ATLAS</div>}
            <div
              dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              style={msg.role === 'user' ? styles.userText : styles.aiText}
            />
          </div>
        ))}

        {isLoading && (
          <div style={styles.aiBubble}>
            <div style={styles.aiLabel}>ATLAS</div>
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggestions ── */}
      {messages.length <= 1 && (
        <div style={styles.suggestions}>
          {SUGGESTED_PROMPTS.map((p) => (
            <button key={p} style={styles.chip} onClick={() => sendMessage(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div style={styles.inputRow}>
        <textarea
          ref={inputRef}
          style={styles.textarea}
          placeholder="Ask anything academic..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          style={{ ...styles.sendBtn, opacity: (!input.trim() || isLoading) ? 0.4 : 1 }}
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
        >
          ➤
        </button>
      </div>

      {/* CSS-in-JS keyframes */}
      <style>{`
        @keyframes atlasDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 0 12px #00d4ff88; }
          50% { box-shadow: 0 0 24px #00d4ffcc, 0 0 40px #00d4ff44; }
        }
        .atlas-typing { display: flex; align-items: center; gap: 5px; padding: 8px 4px; }
        .atlas-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #00d4ff;
          animation: atlasDot 1.2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: "'Rajdhani', 'Orbitron', monospace",
    color: '#e0f7ff',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 0 20px 0',
    borderBottom: '1px solid rgba(0,212,255,0.2)',
    marginBottom: 16,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  orb: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #00d4ff, #005f73)',
    animation: 'orbPulse 2s ease-in-out infinite',
    flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: 3, color: '#00d4ff' },
  subtitle: { fontSize: 10, color: '#4a8fa3', letterSpacing: 1, marginTop: 2 },
  iconBtn: {
    background: 'rgba(0,212,255,0.08)',
    border: '1px solid rgba(0,212,255,0.2)',
    color: '#00d4ff',
    width: 30,
    height: 30,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    paddingRight: 4,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,212,255,0.2) transparent',
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
  },
  aiLabel: {
    fontSize: 9,
    color: '#00d4ff',
    letterSpacing: 2,
    marginBottom: 5,
    fontWeight: 700,
  },
  userText: {
    background: 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(0,95,115,0.3))',
    border: '1px solid rgba(0,212,255,0.3)',
    padding: '10px 14px',
    borderRadius: '16px 4px 16px 16px',
    fontSize: 13,
    lineHeight: 1.6,
  },
  aiText: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 14px',
    borderRadius: '4px 16px 16px 16px',
    fontSize: 13,
    lineHeight: 1.7,
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '10px 0',
  },
  chip: {
    background: 'rgba(0,212,255,0.07)',
    border: '1px solid rgba(0,212,255,0.2)',
    color: '#7ecfdf',
    padding: '5px 10px',
    borderRadius: 20,
    fontSize: 10,
    cursor: 'pointer',
    letterSpacing: 0.5,
    transition: 'all 0.2s',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    borderTop: '1px solid rgba(0,212,255,0.15)',
    paddingTop: 12,
  },
  textarea: {
    flex: 1,
    background: 'rgba(0,212,255,0.05)',
    border: '1px solid rgba(0,212,255,0.25)',
    borderRadius: 10,
    padding: '10px 12px',
    color: '#e0f7ff',
    fontSize: 13,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #00d4ff, #0077a8)',
    border: 'none',
    color: 'white',
    width: 40,
    height: 40,
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 16,
    flexShrink: 0,
    transition: 'opacity 0.2s',
    alignSelf: 'flex-end',
  },
  keyModal: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    borderRadius: 8,
  },
  keyBox: {
    background: '#0d1117',
    border: '1px solid rgba(0,212,255,0.3)',
    borderRadius: 12,
    padding: 24,
    width: 300,
  },
  keyInput: {
    width: '100%',
    background: 'rgba(0,212,255,0.06)',
    border: '1px solid rgba(0,212,255,0.3)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#e0f7ff',
    fontSize: 13,
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
  },
  saveBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #00d4ff, #0077a8)',
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

export default AIChatbot;
