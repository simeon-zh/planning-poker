// lib/socket.js
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Skip execution if on client side
if (typeof window !== 'undefined') {
    console.warn('Socket server code imported on client side - this should not happen');
}

// Store active sessions in memory
// In a production environment, you might want to use a database
// Export sessions map so it's accessible across API routes
export const sessions = new Map();

// Valid point values for voting
export const validPoints = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Initialize Socket.IO server - only runs on the server side
export function initSocket(res) {
    // Make sure we're on the server side
    if (typeof window !== 'undefined') {
        console.error('initSocket should only be called on the server side');
        return null;
    }

    if (res.socket.server.io) {
        console.log('Socket already initialized');
        return res.socket.server.io;
    }

    const io = new Server(res.socket.server, {
        path: '/api/socket',
        addTrailingSlash: false,
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // Join a session
        socket.on('joinSession', ({ sessionId, playerName, isAdmin }) => {
            const session = sessions.get(sessionId);

            if (!session) {
                console.error(`Socket: Session not found: ${sessionId}, available sessions: ${Array.from(sessions.keys())}`);
                socket.emit('error', { message: 'Session not found' });
                return;
            }

            const playerId = socket.id;

            // Determine if this player should be an admin
            // Either they're explicitly joining as an admin or their name matches the session creator
            const isPlayerAdmin = isAdmin || (session.creatorName === playerName);

            session.players.set(playerId, {
                id: playerId,
                name: playerName,
                isAdmin: isPlayerAdmin
            });

            // Add player to the socket room
            socket.join(sessionId);

            // Notify all clients in the room about the new player
            io.to(sessionId).emit('playerJoined', {
                id: playerId,
                name: playerName,
                isAdmin: isPlayerAdmin
            });

            // Send current session state to the new player
            socket.emit('sessionState', {
                id: session.id,
                creatorName: session.creatorName,
                players: Array.from(session.players.values()),
                tasks: session.tasks,
                currentTask: session.currentTask,
                votes: Array.from(session.votes.entries()).map(([pid, vote]) => ({
                    playerId: pid,
                    vote: session.currentTask?.revealed ? vote : '?'
                })),
                victories: Array.from(session.victories.entries()).map(([pid, count]) => ({
                    playerId: pid,
                    count
                }))
            });
        });

        // Rest of the socket events...
        // [code omitted for brevity]
    });

    res.socket.server.io = io;
    return io;
}

// Get a session by ID
export function getSession(sessionId) {
    // If we're on the client side, we can't access the sessions map directly
    if (typeof window !== 'undefined') {
        return null; // Let the API call handle this on client-side
    }

    console.log(`Getting session: ${sessionId}, available sessions: ${Array.from(sessions.keys())}`);
    return sessions.get(sessionId);
}

// Create a new session
export function createSession(creatorName) {
    // If we're on the client side, we can't modify the sessions map directly
    if (typeof window !== 'undefined') {
        return null; // Let the API call handle this on client-side
    }

    const sessionId = uuidv4().substring(0, 6).toUpperCase(); // Generate a short session ID

    console.log(`Creating server-side session: ${sessionId} for ${creatorName}`);

    sessions.set(sessionId, {
        id: sessionId,
        creatorName, // Store the name of the admin who created the session
        players: new Map(),
        tasks: [],
        currentTask: null,
        votes: new Map(),
        victories: new Map(), // Track victories per player
        isSpinning: false
    });

    console.log(`Session created, current sessions: ${Array.from(sessions.keys())}`);

    return sessionId;
}