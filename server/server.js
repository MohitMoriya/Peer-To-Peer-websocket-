const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// 1. Express Setup
const app = express();
app.use(cors()); // Allow React frontend to connect to this server

// 2. HTTP Server and Socket.io Setup
// We create an HTTP server using Express, and then pass it to Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for testing
        methods: ["GET", "POST"]
    }
});

// 3. Simple Route just to test if Express is running
app.get('/', (req, res) => {
    res.send('Signaling Server is running!');
});

// 4. Socket.io Logic (The Matchmaker)
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 4a. Room Management (User joins a specific link)
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
        
        // Notify others in the room that someone new has come
        socket.to(roomId).emit('user-joined', socket.id);
    });

    // 4b. Signaling (Passing the WebRTC handshake data)
    socket.on('signal', (data) => {
        // 'data' has the target user's ID and the WebRTC handshake info
        // Server's only job: Forward this to the target user!
        io.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    // If a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// 5. Start the server
const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
