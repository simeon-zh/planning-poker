// lib/socket.js
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Skip execution if on client side
if (typeof window !== 'undefined') {
    console.warn('Socket server code imported on client side - this should not happen');
}

// Store a single active session instead of a Map
export let activeSession = null;

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
            const session = activeSession && activeSession.id === sessionId ? activeSession : null;

            if (!session) {
                console.error(`Socket: Session not found: ${sessionId}, active session: ${activeSession ? activeSession.id : 'none'}`);
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

        socket.on('startTask', ({ sessionId, taskName }) => {
            const session = activeSession && activeSession.id === sessionId ? activeSession : null;

            if (!session) {
                console.error(`Socket: Session not found: ${sessionId}, active session: ${activeSession ? activeSession.id : 'none'}`);
                socket.emit('error', { message: 'Session not found' });
                return;
            }

            // Clear previous votes when starting a new task
            session.votes = new Map();

            session.currentTask = {
                name: taskName,
                revealed: false
            };

            console.log(`Starting new task: ${taskName} for session ${sessionId}`);

            io.to(sessionId).emit('taskUpdate', {
                taskName,
                isActive: true
            });
        });

        socket.on('endTask', ({ sessionId }) => {
            const session = activeSession && activeSession.id === sessionId ? activeSession : null;

            if (!session) {
                console.error(`Socket: Session not found: ${sessionId}, active session: ${activeSession ? activeSession.id : 'none'}`);
                socket.emit('error', { message: 'Session not found' });
                return;
            }

            session.currentTask = null;

            io.to(sessionId).emit('taskUpdate', {
                taskName: '',
                isActive: false
            });
        });

        socket.on('submitVote', ({ sessionId, playerName, points }) => {
            const session = activeSession && activeSession.id === sessionId ? activeSession : null;

            if (!session) {
                console.error(`Socket: Session not found: ${sessionId}, active session: ${activeSession ? activeSession.id : 'none'}`);
                socket.emit('error', { message: 'Session not found' });
                return;
            }

            // Ensure points is a valid number
            const numericPoints = Number(points);
            if (isNaN(numericPoints) || !validPoints.includes(numericPoints)) {
                console.error(`Socket: Invalid vote: ${points}`);
                socket.emit('error', { message: 'Invalid vote' });
                return;
            }

            // Store the vote with the socket ID
            session.votes.set(socket.id, numericPoints);
            console.log(`Vote registered for ${playerName}: ${numericPoints} (total votes: ${session.votes.size})`);

            // Notify all clients that this player has voted
            io.to(sessionId).emit('playerVoted', {
                playerId: socket.id,
                playerName: session.players.get(socket.id)?.name
            });
        });

        socket.on('spinWheel', ({ sessionId }) => {
            const session = activeSession && activeSession.id === sessionId ? activeSession : null;

            if (!session) {
                console.error(`Socket: Session not found: ${sessionId}, active session: ${activeSession ? activeSession.id : 'none'}`);
                socket.emit('error', { message: 'Session not found' });
                return;
            }

            console.log(`Spinning wheel for session ${sessionId}`);
            console.log(`Current votes:`, Array.from(session.votes.entries()));

            session.isSpinning = true;
            io.to(sessionId).emit('wheelSpinning');

            try {
                // Double-check if we have votes
                if (!session.votes || session.votes.size === 0) {
                    console.error('No votes found in session');
                    io.to(sessionId).emit('error', { message: 'No votes submitted' });
                    session.isSpinning = false;
                    return;
                }

                // Extract votes with explicit validation
                const voteValues = [];
                session.votes.forEach((vote, playerId) => {
                    const numVote = Number(vote);
                    if (!isNaN(numVote)) {
                        voteValues.push(numVote);
                        console.log(`Valid vote from ${playerId}: ${numVote}`);
                    } else {
                        console.error(`Invalid vote from ${playerId}: ${vote}`);
                    }
                });

                if (voteValues.length === 0) {
                    console.error('No valid votes to process');
                    io.to(sessionId).emit('error', { message: 'No valid votes to process' });
                    session.isSpinning = false;
                    return;
                }

                // Calculate average
                const sum = voteValues.reduce((a, b) => a + b, 0);
                const average = sum / voteValues.length;
                console.log(`Calculated average: ${sum} / ${voteValues.length} = ${average}`);

                // Mark the task as revealed
                if (session.currentTask) {
                    session.currentTask.revealed = true;
                }

                // Create player data with votes for the response
                const playersWithVotes = [];
                session.players.forEach((player, playerId) => {
                    const vote = session.votes.get(playerId);
                    playersWithVotes.push({
                        ...player,
                        vote: vote !== undefined ? Number(vote) : null,
                        hasVoted: session.votes.has(playerId)
                    });
                });

                // Create a well-formed result object
                const resultData = {
                    result: average,
                    players: playersWithVotes,
                    task: session.currentTask
                };

                // Add artificial delay for visual effect
                setTimeout(() => {
                    session.isSpinning = false;
                    console.log(`Sending wheel result:`, JSON.stringify(resultData));
                    io.to(sessionId).emit('wheelResult', resultData);
                }, 1500);

            } catch (error) {
                console.error('Error during wheel spin:', error);
                session.isSpinning = false;
                io.to(sessionId).emit('error', { message: 'Error calculating results' });
            }
        });

        // Handle player voting
        socket.on('playerVoted', ({ sessionId, playerId }) => {
            // Notify all clients about a player's vote
            if (activeSession && activeSession.id === sessionId) {
                io.to(sessionId).emit('playerVoted', { playerId });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            // Check if player was in the active session
            if (activeSession && activeSession.players.has(socket.id)) {
                // Notify room that player left
                io.to(activeSession.id).emit('playerLeft', {
                    playerId: socket.id
                });

                // Remove player from session
                activeSession.players.delete(socket.id);
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    res.socket.server.io = io;
    return io;
}

// Get a session by ID
export function getSession(sessionId) {
    // If we're on the client side, we can't access the session directly
    if (typeof window !== 'undefined') {
        return null; // Let the API call handle this on client-side
    }

    // Only return the session if it matches the requested ID
    if (activeSession && activeSession.id === sessionId) {
        console.log(`Found active session: ${sessionId}`);
        return activeSession;
    }

    console.log(`Session not found: ${sessionId}, active session: ${activeSession ? activeSession.id : 'none'}`);
    return null;
}

// Create a new session
export function createSession(creatorName) {
    // If we're on the client side, we can't modify the session directly
    if (typeof window !== 'undefined') {
        return null; // Let the API call handle this on client-side
    }

    const sessionId = uuidv4().substring(0, 6).toUpperCase(); // Generate a short session ID

    console.log(`Creating server-side session: ${sessionId} for ${creatorName}`);

    // Replace any existing session with a new one
    activeSession = {
        id: sessionId,
        creatorName,
        players: new Map(),
        tasks: [],
        currentTask: null,
        votes: new Map(),
        victories: new Map(),
        isSpinning: false
    };

    console.log(`New active session created with ID: ${sessionId}`);
    return sessionId;
}