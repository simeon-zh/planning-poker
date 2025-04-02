// lib/socketServer.js
import { Server } from 'socket.io';

// Store active sessions in memory (in a production environment, use a database)
const sessions = new Map();

// Valid point values for voting
const validPoints = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Initialize Socket.IO server
export function initSocketServer(server) {
    const io = new Server(server);

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // Join session
        socket.on('joinSession', ({ sessionId, playerName, isAdmin }) => {
            console.log(`Player ${playerName} joining session ${sessionId} (Admin: ${isAdmin})`);

            // If session doesn't exist, create it
            if (!sessions.has(sessionId)) {
                console.log(`Creating new session ${sessionId}`);
                sessions.set(sessionId, {
                    id: sessionId,
                    players: [],
                    currentTask: '',
                    isVotingActive: false,
                });

                // Force isAdmin to true if they're the first player (session creator)
                isAdmin = true;
            }

            // Add player to socket room
            socket.join(sessionId);

            // Store session ID for this socket
            socket.sessionId = sessionId;
            socket.playerName = playerName;

            // Check if player exists already (rejoining)
            const session = sessions.get(sessionId);
            const existingPlayerIndex = session.players.findIndex(p => p.name === playerName);

            if (existingPlayerIndex >= 0) {
                // Player is rejoining - update their ID and maintain admin status
                const existingPlayer = session.players[existingPlayerIndex];
                session.players[existingPlayerIndex] = {
                    ...existingPlayer,
                    id: socket.id,
                    isAdmin: existingPlayer.isAdmin || isAdmin // Keep admin status if they already had it
                };
            } else {
                // Add new player to session
                session.players.push({
                    id: socket.id,
                    name: playerName,
                    isAdmin: isAdmin, // Use the provided admin flag
                    hasVoted: false,
                    vote: null
                });
            }

            // Send updated player list to all clients in this session
            io.to(sessionId).emit('playerList', {
                players: session.players
            });

            // Tell this player specifically if they're admin (in case they didn't know)
            const thisPlayer = session.players.find(p => p.id === socket.id);
            socket.emit('adminStatus', {
                isAdmin: thisPlayer?.isAdmin || false
            });

            // If there's an active task, send it to the new player
            if (session.isVotingActive) {
                socket.emit('taskUpdate', {
                    taskName: session.currentTask,
                    isActive: session.isVotingActive
                });
            }
        });

        // Start a new task for voting
        socket.on('startTask', ({ sessionId, taskName }) => {
            console.log(`Starting task "${taskName}" in session ${sessionId}`);

            const session = sessions.get(sessionId);
            if (!session) return;

            // Update session state
            session.currentTask = taskName;
            session.isVotingActive = true;

            // Reset all votes
            session.players = session.players.map(player => ({
                ...player,
                hasVoted: false,
                vote: null
            }));

            // Notify all clients in this session
            io.to(sessionId).emit('taskUpdate', {
                taskName,
                isActive: true
            });

            // Send updated player list
            io.to(sessionId).emit('playerList', {
                players: session.players
            });
        });

        // End the current task
        socket.on('endTask', ({ sessionId }) => {
            console.log(`Ending current task in session ${sessionId}`);

            const session = sessions.get(sessionId);
            if (!session) return;

            // Update session state
            session.currentTask = '';
            session.isVotingActive = false;

            // Notify all clients in this session
            io.to(sessionId).emit('taskUpdate', {
                taskName: '',
                isActive: false
            });
        });

        // Submit a vote
        socket.on('submitVote', ({ sessionId, playerName, points }) => {
            console.log(`Player ${playerName} voted ${points} in session ${sessionId}`);

            const session = sessions.get(sessionId);
            if (!session) return;

            // Update player's vote
            const playerIndex = session.players.findIndex(p => p.name === playerName);
            if (playerIndex >= 0) {
                session.players[playerIndex].hasVoted = true;
                session.players[playerIndex].vote = points;
            }

            // Notify all clients about voting update (don't reveal vote values yet)
            const playersWithHiddenVotes = session.players.map(player => ({
                ...player,
                vote: player.hasVoted ? '?' : null
            }));

            io.to(sessionId).emit('voteUpdate', {
                players: playersWithHiddenVotes
            });
        });

        // Spin the wheel
        socket.on('spinWheel', ({ sessionId }) => {
            console.log(`Spinning wheel in session ${sessionId}`);

            const session = sessions.get(sessionId);
            if (!session) return;

            // Notify clients that wheel is spinning
            io.to(sessionId).emit('wheelSpinning');

            // Calculate average of votes
            const votes = session.players
                .filter(player => player.hasVoted)
                .map(player => player.vote);

            if (votes.length === 0) return;

            const total = votes.reduce((sum, vote) => sum + vote, 0);
            const average = total / votes.length;

            // Round appropriately
            let finalResult;
            if (average - Math.floor(average) >= 0.5) {
                finalResult = Math.ceil(average);
            } else {
                finalResult = Math.floor(average);
            }

            // Wait a few seconds to simulate spinning
            setTimeout(() => {
                // Send result to all clients
                io.to(sessionId).emit('wheelResult', {
                    result: finalResult,
                    players: session.players
                });
            }, 5000);
        });

        // Handle disconnections
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            // Remove player from their session
            if (socket.sessionId) {
                const session = sessions.get(socket.sessionId);
                if (session) {
                    // Keep track of if this was an admin
                    const player = session.players.find(p => p.id === socket.id);
                    const wasAdmin = player?.isAdmin;

                    // Filter out the disconnected player
                    session.players = session.players.filter(p => p.id !== socket.id);

                    // If admin left and there are other players, assign a new admin
                    if (wasAdmin && session.players.length > 0) {
                        session.players[0].isAdmin = true;
                    }

                    // Update all clients with new player list
                    io.to(socket.sessionId).emit('playerList', {
                        players: session.players
                    });

                    // Clean up empty sessions
                    if (session.players.length === 0) {
                        sessions.delete(socket.sessionId);
                        console.log(`Session ${socket.sessionId} deleted (no players)`);
                    }
                }
            }
        });
    });

    return io;
}

// Export for use in API
export { sessions, validPoints };