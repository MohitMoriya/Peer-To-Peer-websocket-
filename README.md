# DropDirect 🚀

DropDirect is a premium, serverless Peer-to-Peer (P2P) file sharing and secure chat application. Built with modern web technologies, it allows users to connect directly browser-to-browser to share files of any size with no limits, zero server storage, and end-to-end encryption.

## ✨ Features

- **Direct P2P Transfer:** Uses WebRTC Data Channels (`simple-peer`) to establish a direct connection between browsers.
- **No File Size Limits:** Since files never touch a centralized server, you can send huge files effortlessly.
- **End-to-End Encrypted Chat:** Along with files, send text messages securely using an integrated macOS-style chat bubble UI.
- **Premium Apple-like UI/UX:** Built with a glassmorphic, modern design aesthetic including smooth transitions, pill buttons, and dynamic themes.
- **Dark/Light Mode:** First-class support for both themes with a sleek toggle.
- **Circular Progress Ring:** View real-time upload/download progress, speed (e.g., MB/s), and ETA with a beautiful animated SVG ring.
- **Subtle Sound Effects:** Programmatic Web Audio API synthesizes satisfying "Pop" and "Ding" notifications without loading external audio assets.
- **Persistent History:** Automatically saves a history of your recently joined and created rooms.

## 🛠️ Technologies Used

- **Frontend:** React, Vite, Vanilla CSS
- **Signaling Server:** Node.js, Socket.IO
- **P2P Communication:** WebRTC (`simple-peer`)
- **Icons:** `lucide-react`
- **Polyfills:** `vite-plugin-node-polyfills` (required for Buffer support in WebRTC)

## 📦 Project Structure

```text
p2p-file-share/
├── client/          # React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx  # Main App Component (UI & WebRTC Logic)
│   │   ├── index.css # Premium Glassmorphism styling
│   │   ├── audio.js # Web Audio synthesizer for SFX
│   │   └── main.jsx
│   └── vite.config.js
└── server/          # Signaling Server
    ├── server.js    # Node.js + Socket.IO handshake server
    └── package.json
```

## 🚀 Getting Started

### 1. Start the Signaling Server
The signaling server is only used for the initial handshake to exchange WebRTC offer/answer signals.

```bash
cd server
npm install
npm start
```
*Server runs on port 5005.*

### 2. Start the Client

```bash
cd client
npm install
npm run dev
```
*Client runs on port 5173.*

### 3. Connect!
- Open `http://localhost:5173`
- Click **Create Secure Room**.
- Share the 6-digit code (or URL) with another device.
- The other device clicks **Join a Room** and enters the code.
- Start chatting and sharing files instantly!

## 🔐 Security
Your files and messages are transferred directly between peers via WebRTC. The signaling server merely facilitates the initial connection and does not log, intercept, or store any of your data.

## 📄 License
MIT License
