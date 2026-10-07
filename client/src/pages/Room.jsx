import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Copy, Share, History, Smartphone, MessageSquare, Send, UploadCloud, FileOutput, Shield } from 'lucide-react';
import QRCode from 'react-qr-code';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { playPopSound, playSuccessSound } from '../audio';
import { useSeo } from '../seo';

function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? 'show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCreator = location.state?.isCreator === true;
  const [toastMsg, setToastMsg] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [transferProgress, setTransferProgress] = useState(0); 
  const [transferSpeed, setTransferSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferHistory, setTransferHistory] = useState([]);
  
  const receivingMetaRef = useRef(null);
  const fileInputRef = useRef(null);
  const receiveBufferRef = useRef([]);
  const receiveSizeRef = useRef(0);
  const roomUrl = window.location.href;

  // Private transfer rooms must never be indexed by search engines
  useSeo({
    title: `Room ${id} – DropDirect Secure Transfer`,
    description: 'A private, end-to-end encrypted DropDirect transfer room.',
    path: `/room/${id}`,
    noindex: true,
  });

  const socketRef = useRef();
  const peerRef = useRef();

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      showToast('Link Copied to Clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my DropDirect Room: ${id}`,
          text: `Use this code to securely share files with me: ${id}`,
          url: roomUrl
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      copyLink();
    }
  };

  const handleData = (data) => {
    let isJson = false;
    let msg = null;

    try {
      if (typeof data === 'string') {
        msg = JSON.parse(data);
        isJson = true;
      } else {
        // Data might be Uint8Array, Buffer, or ArrayBuffer.
        const text = new TextDecoder().decode(data);
        msg = JSON.parse(text);
        isJson = true;
      }
    } catch (e) {
      // If it throws, it's a binary chunk for the file transfer
      isJson = false;
    }

    if (isJson && msg) {
      if (msg.type === 'chat') {
        setMessages(prev => [...prev, { text: msg.text, sender: 'peer' }]);
        playPopSound();
      } else if (msg.type === 'file-start') {
        setIsTransferring(true);
        receivingMetaRef.current = msg;
        receiveBufferRef.current = [];
        receiveSizeRef.current = 0;
        setTransferProgress(0);
        setTransferSpeed('');
        setEta('Receiving...');
      } else if (msg.type === 'file-end') {
        const blob = new Blob(receiveBufferRef.current, { type: receivingMetaRef.current.fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = receivingMetaRef.current.name;
        a.click();
        // Removed URL.revokeObjectURL(url) to keep the URL active for history
        
        const newHistory = {
          id: Date.now(),
          name: receivingMetaRef.current.name,
          size: receivingMetaRef.current.size,
          type: 'received',
          time: new Date(),
          url: url
        };
        setTransferHistory(prev => [newHistory, ...prev]);
        
        setIsTransferring(false);
        setTransferProgress(100);
        showToast('File Received!');
        playSuccessSound();
      }
    } else {
      receiveBufferRef.current.push(data);
      receiveSizeRef.current += data.byteLength || data.length || 0;
      const meta = receivingMetaRef.current;
      if (meta && meta.size) {
        setTransferProgress(Math.floor((receiveSizeRef.current / meta.size) * 100));
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !peerRef.current) return;
    
    const msg = { type: 'chat', text: chatInput.trim() };
    peerRef.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, { text: chatInput.trim(), sender: 'mine' }]);
    setChatInput('');
  };

  const CHUNK_SIZE = 256 * 1024; // 256KB for higher throughput
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const startFileTransfer = (file) => {
    if (!peerRef.current) return;
    setIsTransferring(true);
    setTransferProgress(0);
    
    peerRef.current.send(JSON.stringify({
        type: 'file-start',
        name: file.name,
        size: file.size,
        fileType: file.type
    }));

    let offset = 0;
    const reader = new FileReader();
    let lastTime = Date.now();
    let lastOffset = 0;

    const readNextChunk = () => {
      if (peerRef.current && peerRef.current._channel && peerRef.current._channel.bufferedAmount > 1024 * 1024 * 16) {
          setTimeout(readNextChunk, 10);
          return;
      }
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
        if (!peerRef.current) return;
        peerRef.current.send(e.target.result);
        offset += e.target.result.byteLength;
        
        const now = Date.now();
        if (now - lastTime > 500) {
            const speedBytes = ((offset - lastOffset) / (now - lastTime)) * 1000;
            setTransferSpeed((speedBytes / (1024 * 1024)).toFixed(2) + ' MB/s');
            const remaining = file.size - offset;
            setEta(Math.ceil(remaining / speedBytes) + 's left');
            lastTime = now;
            lastOffset = offset;
        }
        
        setTransferProgress(Math.floor((offset / file.size) * 100));

        if (offset < file.size) {
            readNextChunk();
        } else {
            setTransferProgress(100);
            setIsTransferring(false);
            peerRef.current.send(JSON.stringify({ type: 'file-end' }));
            
            const url = URL.createObjectURL(file);
            const newHistory = {
              id: Date.now(),
              name: file.name,
              size: file.size,
              type: 'sent',
              time: new Date(),
              url: url
            };
            setTransferHistory(prev => [newHistory, ...prev]);

            showToast('Transfer Complete!');
            playSuccessSound();
            setSelectedFile(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    readNextChunk();
  };

  useEffect(() => {
    console.log('Connecting to Signaling Server...');
    // In production set VITE_SIGNALING_URL (e.g. https://signal.dropdirect.com); falls back to local dev server
    const socketUrl = import.meta.env.VITE_SIGNALING_URL || `http://${window.location.hostname}:5005`;
    const socket = io(socketUrl);
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to socket server with ID:', socket.id);
      console.log('Emitting join-room for id:', id);
      socket.emit('join-room', id);
      console.log('Emitted join-room successfully');
    });

    socket.on('user-joined', (userId) => {
      console.log('Another user joined! Initiating WebRTC...');
      
      const peer = new Peer({
        initiator: true,
        trickle: true, 
      });
      console.log('Peer object created for initiator');

      peer.on('signal', (data) => {
        console.log('Generated Offer signal, sending...');
        socket.emit('signal', { to: userId, signal: data });
      });

      peer.on('connect', () => {
        setIsConnected(true);
        console.log('WebRTC Connected as Initiator!');
        showToast('Securely Connected!');
        playSuccessSound();
      });

      peer.on('data', handleData);
      peer.on('error', (err) => {
        console.error('Peer Error (Initiator):', err);
      });

      peerRef.current = peer;
    });

    socket.on('signal', (data) => {
      console.log('Received signal from server');
      if (!peerRef.current) {
        console.log('Received Offer, creating Receiver Peer...');
        const peer = new Peer({
          initiator: false,
          trickle: true,
        });

        peer.on('signal', (signalData) => {
          console.log('Generated Answer signal, sending...');
          socket.emit('signal', { to: data.from, signal: signalData });
        });

        peer.on('connect', () => {
          setIsConnected(true);
          console.log('WebRTC Connected as Receiver!');
          showToast('Securely Connected!');
          playSuccessSound();
        });

        peer.on('data', handleData);
        peer.on('error', (err) => {
          console.error('Peer Error (Receiver):', err);
        });

        peerRef.current = peer;
      }
      
      peerRef.current.signal(data.signal);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [id]);

  return (
    <main id="main-content" className="container animate-fade-in" style={{ padding: '2rem 1rem', position: 'relative' }}>
      
      {/* Dynamic Header */}
      {!isConnected && isCreator && (
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.2rem', color: 'var(--apple-text-muted)', fontWeight: '400', marginBottom: '0.5rem' }}>Share this Code to connect</h1>
          <div style={{ 
            fontSize: '3.5rem', 
            fontWeight: '700', 
            letterSpacing: '0.2em', 
            color: 'var(--apple-text-main)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {id}
          </div>
        </div>
      )}

      {(!isConnected && !isCreator) && (
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.2rem', color: 'var(--apple-text-muted)', fontWeight: '400', marginBottom: '0.5rem' }}>Joining Room</h1>
          <div style={{ 
            fontSize: '3.5rem', 
            fontWeight: '700', 
            letterSpacing: '0.2em', 
            color: 'var(--apple-text-main)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {id}
          </div>
        </div>
      )}

      {isConnected && (
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 className="header-title" style={{ fontSize: '2.5rem' }}>Room <span style={{color: 'var(--apple-blue)'}}>#{id}</span></h1>
        </div>
      )}

      {/* Dynamic Card based on Connection Status */}
      {isConnected ? (
        <div className="workspace-grid animate-fade-in">
          
          {/* Transfer History Sidebar */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--apple-text-main)' }}>
              <History size={16} color="var(--apple-blue)" /> Transfer History
            </h2>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px' }}>
              {transferHistory.length === 0 && (
                 <p style={{ color: 'var(--apple-text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>No files transferred yet</p>
              )}
              {transferHistory.map(item => (
                 <a key={item.id} href={item.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}>
                   <div style={{ background: 'var(--apple-surface)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--apple-border)', textAlign: 'left', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--apple-blue)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--apple-border)'}>
                     <div style={{ fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--apple-text-main)' }}>
                       <span style={{ color: item.type === 'sent' ? 'var(--apple-blue)' : '#34c759', marginRight: '4px' }}>
                         {item.type === 'sent' ? '↗' : '↙'}
                       </span> 
                       {item.name}
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--apple-text-muted)' }}>
                       <span>{(item.size / (1024*1024)).toFixed(2)} MB</span>
                       <span>{item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                   </div>
                 </a>
              ))}
            </div>
          </div>

          {/* File Transfer Section */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <FileOutput size={20} color="var(--apple-blue)" /> File Transfer
            </h2>
            
            {!isTransferring ? (
              selectedFile ? (
                <div className="file-dropzone" style={{ padding: '2rem', borderStyle: 'solid', borderColor: 'var(--apple-blue)', backgroundColor: 'var(--apple-surface)' }}>
                   <FileOutput size={48} color="var(--apple-blue)" style={{ margin: '0 auto 1rem' }} />
                   <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.2rem', wordBreak: 'break-all', color: 'var(--apple-text-main)' }}>{selectedFile.name}</p>
                   <p style={{ fontSize: '0.9rem', color: 'var(--apple-text-muted)', marginBottom: '1.5rem' }}>{(selectedFile.size / (1024*1024)).toFixed(2)} MB</p>
                   <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                     <button className="btn-secondary" onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}>Cancel</button>
                     <button className="btn" onClick={() => startFileTransfer(selectedFile)}>Send File</button>
                   </div>
                </div>
              ) : (
                <div
                  className="file-dropzone"
                  role="button"
                  tabIndex={0}
                  aria-label="Select a file to send"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                >
                   <UploadCloud size={48} color="var(--apple-text-muted)" style={{ margin: '0 auto 1rem' }} />
                   <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Click to select a file</p>
                   <p style={{ fontSize: '0.9rem', color: 'var(--apple-text-muted)' }}>Secure P2P transfer. No limits.</p>
                   <input type="file" id="file-input" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} aria-label="File to send" tabIndex={-1} />
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                 <div className="progress-ring-wrapper">
                    <svg className="progress-ring" width="150" height="150">
                      <circle className="progress-ring-circle-bg" strokeWidth="8" fill="transparent" r="70" cx="75" cy="75" />
                      <circle className="progress-ring-circle" strokeWidth="8" fill="transparent" r="70" cx="75" cy="75" 
                         style={{ strokeDashoffset: 440 - (440 * transferProgress) / 100 }} />
                    </svg>
                    <div className="progress-text">
                       <div className="progress-percentage">{transferProgress}%</div>
                    </div>
                 </div>
                 <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{receivingMetaRef.current ? receivingMetaRef.current.name : selectedFile?.name}</div>
                    <div className="progress-stats">
                       {transferSpeed && <span>{transferSpeed} • </span>}
                       {eta && <span>{eta}</span>}
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* Chat Section */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} color="var(--apple-blue)" /> Secure Chat
             </h2>
             
             <div className="chat-messages">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--apple-text-muted)', margin: 'auto', fontSize: '0.9rem' }}>
                     End-to-End Encrypted.<br/>Messages are not saved.
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.sender}`}>
                     {msg.text}
                  </div>
                ))}
             </div>

             <form className="chat-input-row" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  className="input-field" 
                  id="chat-input"
                  aria-label="Chat message"
                  autoComplete="off"
                  placeholder="Type a message..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" id="chat-send-btn" className="btn-primary" style={{ padding: '0 1.25rem' }} aria-label="Send message">
                   <Send size={18} />
                </button>
             </form>
          </div>

        </div>
      ) : (
        <div className="card" style={{ padding: '3.5rem 2rem', margin: '0 auto', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <div className="icon-wrapper" style={{ animation: 'pulse-ring 2s infinite', margin: '0 auto 1.5rem' }}>
             <Shield size={36} color="var(--apple-blue)" strokeWidth={1.5} />
           </div>
           <h2 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '0.5rem' }}>
             {isCreator ? "Waiting for Peer..." : "Connecting to Peer..."}
           </h2>
           <p style={{ color: 'var(--apple-text-muted)', fontSize: '0.95rem' }}>
             {isCreator ? "Both users must keep this page open to connect." : "Establishing secure WebRTC connection..."}
           </p>

           {isCreator && (
             <div className="action-row" style={{ marginTop: '2.5rem' }}>
               <button className="btn-secondary" onClick={() => setShowQR(true)}>
                 <Smartphone size={16} /> Show QR
               </button>
               <button className="btn-secondary" onClick={copyLink}>
                 <Copy size={16} /> Copy Link
               </button>
               <button className="btn-secondary" onClick={shareLink}>
                 <Share size={16} /> Share
               </button>
             </div>
           )}
        </div>
      )}

      {/* Beautiful QR Modal/Overlay */}
      {!isConnected && showQR && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }} onClick={() => setShowQR(false)}>
          <div className="card animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title" style={{ maxWidth: '400px', padding: '3rem 2rem', textAlign: 'center', margin: '1rem' }} onClick={e => e.stopPropagation()}>
            <h2 id="qr-dialog-title" style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: '1rem', color: 'var(--apple-text-main)' }}>Scan to Join</h2>
            <div className="qr-wrapper" style={{ marginBottom: '1.5rem' }}>
              <QRCode value={roomUrl} size={180} fgColor="#000000" bgColor="#ffffff" level="M" />
            </div>
            <p style={{ color: 'var(--apple-text-muted)', marginBottom: '2rem' }}>Point your mobile camera at this code to join the room instantly.</p>
            <button className="btn-secondary" onClick={() => setShowQR(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Pop-up Toast Notification */}
      <Toast message={toastMsg} visible={!!toastMsg} />
    </main>
  );
}

export default Room;
