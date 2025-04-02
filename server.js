const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const socketIo = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO with the HTTP server
    const io = socketIo(server);

    // Socket.IO events
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Join session
        socket.on('joinSession', ({ sessionId, playerName }) => {
            console.log(`Player ${playerName} joining session ${sessionId}`);

            // Join the room
            socket.join(sessionId);

            // Store session and player information
            socket.sessionId = sessionId;
            socket.playerName = playerName;

            // Check if this is the first player (admin)
            const roomSize = io.sockets.adapter.rooms.get(sessionId).size;
            const isAdmin = roomSize <= 1;

            // Tell the client if they're admin
            socket.emit('adminStatus', { isAdmin });

            // Add player to session
            const player = {
                id: socket.id,
                name: playerName,
                isAdmin,
                hasVoted: false,
                vote: null
            };

            // Broadcast to everyone in the room that a new player joined
            io.to(sessionId).emit('playerJoined', { player });
        });

        // Start task
        socket.on('startTask', ({ sessionId, taskName }) => {
            io.to(sessionId).emit('taskUpdate', {
                taskName,
                isActive: true
            });
        });

        // End task
        socket.on('endTask', ({ sessionId }) => {
            io.to(sessionId).emit('taskUpdate', {
                taskName: '',
                isActive: false
            });
        });

        // Submit vote
        socket.on('submitVote', ({ sessionId, points }) => {
            // Notify room that this player voted
            io.to(sessionId).emit('playerVoted', {
                playerId: socket.id,
                playerName: socket.playerName
            });
        });

        // Spin wheel
        socket.on('spinWheel', ({ sessionId, votes }) => {
            // Notify room that wheel is spinning
            io.to(sessionId).emit('wheelSpinning');

            // Calculate result (would be passed in from client in real app)
            setTimeout(() => {
                io.to(sessionId).emit('wheelResult', {
                    result: votes.result
                });
            }, 5000);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            if (socket.sessionId) {
                // Notify room that player left
                io.to(socket.sessionId).emit('playerLeft', {
                    playerId: socket.id,
                    playerName: socket.playerName
                });
            }
        });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});