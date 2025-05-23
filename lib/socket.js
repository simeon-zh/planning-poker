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
            // Check if we need to create a new session
            if (!activeSession || activeSession.id !== sessionId) {
                console.log(`Creating a new active session: ${sessionId}`);
                activeSession = {
                    id: sessionId,
                    creatorName: playerName, // First player is creator
                    players: new Map(),
                    tasks: [],
                    currentTask: null,
                    votes: new Map(),
                    victories: new Map(),
                    isSpinning: false
                };
            }

            const session = activeSession;
            const playerId = socket.id;

            // Determine if this player should be an admin
            // Either they're explicitly joining as an admin or their name matches the session creator
            const isPlayerAdmin = isAdmin || (session.creatorName === playerName);

            // Add player to the session's players Map
            session.players.set(playerId, {
                id: playerId,
                name: playerName,
                isAdmin: isPlayerAdmin,
                hasVoted: session.votes.has(playerId)
            });

            // Debug
            console.log(`Player ${playerName} (ID: ${playerId}) joined. Players in session: ${session.players.size}`);
            console.log('Current players:', Array.from(session.players.entries()));

            // Add player to the socket room
            socket.join(sessionId);

            // Send admin status to the player
            socket.emit('adminStatus', {
                isAdmin: isPlayerAdmin
            });

            // Create an array of all players to send to clients
            const allPlayers = Array.from(session.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                isAdmin: player.isAdmin,
                hasVoted: session.votes.has(player.id)
            }));

            // Send all players to the newly joined player
            socket.emit('playerList', { players: allPlayers });

            // Notify all clients in the room about all players (including the new one)
            io.to(sessionId).emit('playerList', { players: allPlayers });

            // If there's a current task, update the newly joined player
            if (session.currentTask) {
                socket.emit('taskUpdate', {
                    taskName: session.currentTask.name,
                    isActive: true
                });
            }

            // If there's been a wheel spin with results, send that to the new player
            if (session.currentTask && session.currentTask.revealed) {
                // Create player data with votes for the response
                const playersWithVotes = [];
                session.players.forEach((player, pid) => {
                    const vote = session.votes.get(pid);
                    playersWithVotes.push({
                        ...player,
                        vote: vote !== undefined ? Number(vote) : null,
                        hasVoted: session.votes.has(pid)
                    });
                });

                // Calculate average for this player
                if (session.votes.size > 0) {
                    const voteValues = [];
                    session.votes.forEach((vote) => {
                        const numVote = Number(vote);
                        if (!isNaN(numVote)) {
                            voteValues.push(numVote);
                        }
                    });

                    if (voteValues.length > 0) {
                        const sum = voteValues.reduce((a, b) => a + b, 0);
                        const average = sum / voteValues.length;

                        socket.emit('wheelResult', {
                            result: average,
                            players: playersWithVotes,
                            task: session.currentTask
                        });
                    }
                }
            }
        });

        socket.on('startTask', ({ sessionId, taskName }) => {
            console.log(`Starting task: ${taskName} for session ${sessionId}`);

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

            // Reset hasVoted for all players
            session.players.forEach((player, playerId) => {
                player.hasVoted = false;
            });

            // Send updated player list after resetting votes
            const allPlayers = Array.from(session.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                isAdmin: player.isAdmin,
                hasVoted: false
            }));

            io.to(sessionId).emit('playerList', { players: allPlayers });
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
            session.votes = new Map();

            // Reset hasVoted for all players
            session.players.forEach((player, playerId) => {
                player.hasVoted = false;
            });

            // Send updated player list after ending task
            const allPlayers = Array.from(session.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                isAdmin: player.isAdmin,
                hasVoted: false
            }));

            io.to(sessionId).emit('playerList', { players: allPlayers });
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

            // Update player's hasVoted status
            const player = session.players.get(socket.id);
            if (player) {
                player.hasVoted = true;
            }

            // Create updated player list
            const allPlayers = Array.from(session.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                isAdmin: player.isAdmin,
                hasVoted: session.votes.has(player.id)
            }));

            // Notify all clients about updated player list
            io.to(sessionId).emit('playerList', { players: allPlayers });

            // Notify all clients that this player has voted
            io.to(sessionId).emit('playerVoted', {
                playerId: socket.id,
                playerName
            });
        });

        socket.on('spinWheel', ({ sessionId }) => {
            // Debug info
            console.log('=== DEBUGGING SPIN WHEEL ===');
            console.log(`SessionId: ${sessionId}`);
            console.log(`Active session exists? ${!!activeSession}`);

            if (activeSession) {
                console.log(`Active session ID: ${activeSession.id}`);
                console.log(`Session IDs match? ${activeSession.id === sessionId}`);
            }

            const session = activeSession && activeSession.id === sessionId ? activeSession : null;

            if (!session) {
                console.error(`Socket: Session not found: ${sessionId}, active session: ${activeSession ? activeSession.id : 'none'}`);
                socket.emit('error', { message: 'Session not found' });
                return;
            }

            console.log(`Spinning wheel for session ${sessionId}`);
            console.log(`Players in session: ${session.players.size}`);
            console.log(`Votes in session: ${session.votes.size}`);
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
                const playerVotes = new Map();

                session.votes.forEach((vote, playerId) => {
                    const numVote = Number(vote);
                    if (!isNaN(numVote)) {
                        voteValues.push(numVote);
                        playerVotes.set(playerId, numVote);
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

                // Find closest valid point value to the average
                const findClosestValidPoint = (avg) => {
                    // If the average is exactly a valid point, use it
                    if (validPoints.includes(Math.round(avg))) return Math.round(avg);

                    // Otherwise find the closest valid point
                    return validPoints.reduce((prev, curr) =>
                        Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
                    );
                };

                // Round to the nearest valid point
                const roundedResult = findClosestValidPoint(average);
                console.log(`Average: ${average}, rounded to nearest valid point: ${roundedResult}`);

                // Create a well-formed result object with both the exact average and the rounded result
                const resultData = {
                    result: roundedResult, // Use the rounded result as the final value
                    exactAverage: average, // Include the exact average for information
                    players: playersWithVotes,
                    task: session.currentTask
                };

                console.log('RESULT DATA BEING SENT:', JSON.stringify(resultData));

                // Add artificial delay for visual effect
                setTimeout(() => {
                    session.isSpinning = false;
                    console.log(`Sending wheel result:`, JSON.stringify(resultData));

                    // Broadcast to the whole room to ensure everyone gets it
                    io.to(sessionId).emit('wheelResult', resultData);
                }, 1500);

            } catch (error) {
                console.error('Error during wheel spin:', error);
                session.isSpinning = false;
                io.to(sessionId).emit('error', { message: 'Error calculating results' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            // Check if player was in the active session
            if (activeSession && activeSession.players.has(socket.id)) {
                const player = activeSession.players.get(socket.id);

                // Notify room that player left
                io.to(activeSession.id).emit('playerLeft', {
                    playerId: socket.id,
                    playerName: player.name
                });

                // Remove player from session
                activeSession.players.delete(socket.id);

                // Also remove their vote if they had one
                if (activeSession.votes.has(socket.id)) {
                    activeSession.votes.delete(socket.id);
                }

                // Send updated player list
                const allPlayers = Array.from(activeSession.players.values()).map(player => ({
                    id: player.id,
                    name: player.name,
                    isAdmin: player.isAdmin,
                    hasVoted: activeSession.votes.has(player.id)
                }));

                io.to(activeSession.id).emit('playerList', { players: allPlayers });
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