import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, FileOutput, Moon, Sun, History, LogIn, UserX, Smartphone } from 'lucide-react';
import { useSeo } from './seo';
import './index.css';

// Code-split: the heavy WebRTC / socket.io / QR code bundle only loads when a room is opened
const Room = lazy(() => import('./pages/Room'));

// NOTE: Keep these in sync with the FAQPage / HowTo JSON-LD in index.html (Google requires visible content to match)
const FAQS = [
  { q: 'Is DropDirect free?', a: 'Yes. DropDirect is completely free to use. There is no sign-up, no account and no subscription.' },
  { q: 'Is there a file size limit?', a: "No. Because files are sent directly between browsers, you are only limited by your own device's memory and network speed." },
  { q: 'Are my files saved on a server?', a: "Absolutely not. Files travel directly from your device to the receiver's device. The signaling server is only used for the initial connection handshake and never sees your files." },
  { q: 'Is DropDirect secure?', a: 'Yes. All data sent through WebRTC Data Channels is encrypted end-to-end using DTLS (Datagram Transport Layer Security).' },
  { q: 'How do I send a large file with DropDirect?', a: 'Click "Create Secure Room", share the 6-digit code, link or QR code with the receiver, and once they join, select your file and press Send. The file streams directly to their device.' },
  { q: 'Does DropDirect work on mobile phones?', a: 'Yes. DropDirect works in any modern browser on Android, iPhone, Windows, macOS and Linux. No app installation is needed, and you can scan the QR code to join instantly.' },
  { q: 'Do both people need to stay online during the transfer?', a: 'Yes. Since there is no cloud storage, both the sender and the receiver must keep the room open until the transfer completes.' },
];

const STEPS = [
  { title: 'Create a secure room', text: 'Click "Create Secure Room" to get a private 6-digit room code.' },
  { title: 'Share the code', text: 'Send the code, link or QR code to the receiver. They join from any browser.' },
  { title: 'Send directly', text: 'Select your file and press Send. It streams straight to the other device, end-to-end encrypted.' },
];

function Navbar() {
  return (
    <header style={{ padding: '1.5rem 2.5rem', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 50, pointerEvents: 'none' }}>
      <Link to="/" id="brand-home-link" aria-label="DropDirect home" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none', pointerEvents: 'auto' }}>
        <span aria-hidden="true" style={{
          background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          fontSize: '1.2rem',
          letterSpacing: '-0.02em',
          boxShadow: '0 0 15px rgba(0, 198, 255, 0.6), 0 0 30px rgba(0, 114, 255, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          textShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}>
          DD
        </span>
        <span style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.03em', color: 'var(--apple-text-main)' }}>DropDirect.</span>
      </Link>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <nav aria-label="Footer">
        <ul className="footer-links">
          <li><Link to="/">Home</Link></li>
          <li><a href="/#how-it-works">How it works</a></li>
          <li><a href="/#about">About</a></li>
          <li><a href="/#faq">FAQ</a></li>
          <li><a href="https://github.com/MohitMoriya/Peer-To-Peer-websocket-" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        </ul>
      </nav>
      <p>&copy; {new Date().getFullYear()} DropDirect. Free, private peer-to-peer file sharing.</p>
    </footer>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button 
      type="button"
      id="theme-toggle"
      onClick={() => setIsDark(!isDark)}
      className="btn-secondary"
      style={{
        position: 'absolute', top: '2rem', right: '2rem',
        background: 'var(--apple-card-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 100
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
      {isDark ? "Dark" : "Light"}
    </button>
  );
}

function Home() {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useSeo({ path: '/' });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('peerHistory') || '[]');
    setHistoryItems(saved);
  }, []);

  const createRoom = () => {
    // Generate a 6-digit numeric code
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    
    const saved = JSON.parse(localStorage.getItem('peerHistory') || '[]');
    const newItem = { id: roomId, date: new Date().toISOString() };
    const newSaved = [newItem, ...saved.filter(item => item.id !== roomId)].slice(0, 10);
    localStorage.setItem('peerHistory', JSON.stringify(newSaved));
    
    navigate(`/room/${roomId}`, { state: { isCreator: true } });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      navigate(`/room/${joinCode.trim()}`, { state: { isCreator: false } });
    }
  };

  const recentRooms = [];
  const olderRooms = [];
  const now = new Date();
  
  historyItems.forEach(item => {
    const itemDate = new Date(item.date);
    const diffHours = Math.abs(now - itemDate) / 36e5;
    if (diffHours < 24) recentRooms.push(item);
    else olderRooms.push(item);
  });

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' • ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <main id="main-content" className="container animate-fade-in">
      <button 
        type="button"
        id="history-btn"
        className="btn-secondary"
        onClick={() => setShowHistory(true)}
        aria-label="Open room history"
        style={{
          position: 'absolute', top: '2rem', right: '8.5rem',
          background: 'var(--apple-card-bg)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 100
        }}
      >
        <History size={18} aria-hidden="true" /> History
      </button>

      <h1 className="header-title">
        <span className="hero-eyebrow">Free P2P File Sharing</span>
        DropDirect.
      </h1>
      <p className="header-subtitle">
        Send large files directly between devices. End-to-end encrypted, no uploads, no sign-up, no size limits.
      </p>
      
      <section className="card" aria-labelledby="direct-transfer-heading">
        <div className="icon-wrapper" aria-hidden="true">
          <Zap size={36} color="var(--apple-blue)" strokeWidth={1.5} />
        </div>
        <h2 id="direct-transfer-heading" style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: '0.75rem', color: 'var(--apple-text-main)' }}>
          Direct Transfer
        </h2>
        <p style={{ color: 'var(--apple-text-muted)', marginBottom: '2.5rem', lineHeight: '1.5', fontSize: '1.05rem' }}>
          Connect directly to another browser. Your files are end-to-end encrypted and never touch our servers.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" id="create-room-btn" className="btn" onClick={createRoom}>
            Create Secure Room
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          
          <button type="button" id="join-room-btn" className="btn-secondary" onClick={() => setShowJoinModal(true)}>
            <LogIn size={18} aria-hidden="true" /> Join a Room
          </button>
        </div>
      </section>

      <ul className="feature-list" aria-label="Key features">
        <li><Shield size={18} aria-hidden="true" /> End-to-end encrypted</li>
        <li><FileOutput size={18} aria-hidden="true" /> No file size limits</li>
        <li><UserX size={18} aria-hidden="true" /> No sign-up needed</li>
        <li><Smartphone size={18} aria-hidden="true" /> Works on any device</li>
      </ul>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }} onClick={() => setShowJoinModal(false)}>
          <div className="card animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="join-dialog-title" style={{ maxWidth: '400px', width: '90%', padding: '3rem 2rem', margin: '1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h2 id="join-dialog-title" style={{ fontSize: '1.5rem', fontWeight: '500', color: 'var(--apple-text-main)', marginBottom: '0.5rem' }}>Join a Room</h2>
            <p style={{ color: 'var(--apple-text-main)', marginBottom: '0.2rem' }}>Enter the code to join the room</p>
            <p style={{ color: 'var(--apple-text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>(ask the sender for code)</p>
            
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <input 
                type="text" 
                id="join-code-input"
                className="input-field" 
                aria-label="Room code"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 123456" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                autoFocus
                maxLength={10}
              />
              <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowJoinModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={!joinCode.trim()}>Join Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }} onClick={() => setShowHistory(false)}>
          <div className="card animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="history-dialog-title" style={{ maxWidth: '500px', width: '90%', padding: '2.5rem 2rem', maxHeight: '80vh', overflowY: 'auto', margin: '1rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 id="history-dialog-title" style={{ fontSize: '1.5rem', fontWeight: '500', color: 'var(--apple-text-main)' }}>History</h2>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px' }} onClick={() => setShowHistory(false)}>Close</button>
            </div>
            
            {historyItems.length === 0 ? (
              <p style={{ color: 'var(--apple-text-muted)' }}>No history available yet.</p>
            ) : (
              <div style={{ textAlign: 'left' }}>
                {recentRooms.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--apple-text-muted)', marginBottom: '1rem' }}>
                      Recent (Last 24h)
                    </h3>
                    {recentRooms.map(item => (
                      <Link key={item.id} to={`/room/${item.id}`} className="history-pill" style={{ width: '100%', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>Code: <span style={{color:'var(--apple-blue)'}}>{item.id}</span></span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-muted)' }}>{formatDate(item.date)}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {olderRooms.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--apple-text-muted)', marginBottom: '1rem' }}>
                      Older
                    </h3>
                    {olderRooms.map(item => (
                      <Link key={item.id} to={`/room/${item.id}`} className="history-pill" style={{ width: '100%', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>Code: <span style={{color:'var(--apple-blue)'}}>{item.id}</span></span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-muted)' }}>{formatDate(item.date)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* How it works */}
      <section id="how-it-works" className="info-section animate-fade-in" aria-labelledby="how-heading">
        <h2 id="how-heading" className="section-title">How to send large files with DropDirect</h2>
        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="step-card">
              <span className="step-number" aria-hidden="true">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* About */}
      <section id="about" className="info-section animate-fade-in" aria-labelledby="about-heading">
        <h2 id="about-heading" className="section-title">About DropDirect</h2>
        <p className="section-text">
          DropDirect is a free peer-to-peer file sharing app designed to eliminate the middleman. Using WebRTC technology, your files travel directly from your device to the receiver's device, with no cloud uploads, no file size limits and no storage tracking. It's a fast, private alternative to cloud transfer services for sending photos, videos, documents and large files over any network.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="info-section animate-fade-in" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQS.map((item, i) => (
            <details key={item.q} className="faq-item" name="faq" open={i === 0}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

function NotFound() {
  useSeo({ title: 'Page not found – DropDirect', path: '/404', noindex: true });
  return (
    <main id="main-content" className="container animate-fade-in" style={{ minHeight: '70vh', justifyContent: 'center', textAlign: 'center' }}>
      <h1 className="header-title">404</h1>
      <p className="header-subtitle">This page doesn't exist. But your files can still go direct.</p>
      <Link to="/" className="btn" id="not-found-home-link" style={{ textDecoration: 'none' }}>
        Go to DropDirect <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </main>
  );
}

function RouteFallback() {
  return (
    <div className="container" style={{ minHeight: '70vh', justifyContent: 'center' }} role="status" aria-live="polite">
      <p style={{ color: 'var(--apple-text-muted)' }}>Loading secure room…</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Navbar />
        <ThemeToggle />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:id" element={<Room />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
