// contexts/SessionContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

// Define valid points
const validPoints = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Create the context
const SessionContext = createContext();

// Export the provider component
export function SessionProvider({ children }) {
    const router = useRouter();
    const [socket, setSocket] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [playerName, setPlayerName] = useState('');
    const [selectedPoints, setSelectedPoints] = useState(null);
    const [hasSpun, setHasSpun] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [players, setPlayers] = useState([]);
    const [currentTask, setCurrentTask] = useState('');
    const [newTaskName, setNewTaskName] = useState('');
    const [isVotingActive, setIsVotingActive] = useState(false);
    const [playerHasVoted, setPlayerHasVoted] = useState(false);

    // Effect to initialize socket connection
    useEffect(() => {
        // Create socket connection only on client-side
        if (typeof window === 'undefined') return;

        const socketIo = io();
        setSocket(socketIo);

        // Clean up on unmount
        return () => {
            socketIo.disconnect();
        };
    }, []);

    // Load session data from sessionStorage on initial load
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            // Get current session ID from URL
            const sessionId = router.query.sessionId;
            if (!sessionId) return;

            // Try to restore previous session state if it exists
            const sessionStorageKey = `planningRoulette_${sessionId}`;
            const savedSessionData = sessionStorage.getItem(sessionStorageKey);

            if (savedSessionData) {
                const parsedData = JSON.parse(savedSessionData);
                console.log('Restored session data from storage:', parsedData);

                // Restore state from session storage
                if (parsedData.result !== undefined) setResult(parsedData.result);
                if (parsedData.selectedPoints !== undefined) setSelectedPoints(parsedData.selectedPoints);
                if (parsedData.hasSpun !== undefined) setHasSpun(parsedData.hasSpun);
                if (parsedData.isVotingActive !== undefined) setIsVotingActive(parsedData.isVotingActive);
                if (parsedData.currentTask !== undefined) setCurrentTask(parsedData.currentTask);
                if (parsedData.players) setPlayers(parsedData.players);
                if (parsedData.playerHasVoted !== undefined) setPlayerHasVoted(parsedData.playerHasVoted);
            }
        } catch (error) {
            console.error('Error loading session data from storage:', error);
        }
    }, [router.query.sessionId]);

    // Effect to save session data to sessionStorage when it changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const sessionId = router.query.sessionId;
        if (!sessionId) return;

        try {
            const sessionStorageKey = `planningRoulette_${sessionId}`;
            const sessionData = {
                result,
                selectedPoints,
                hasSpun,
                isVotingActive,
                currentTask,
                players,
                playerHasVoted
            };

            sessionStorage.setItem(sessionStorageKey, JSON.stringify(sessionData));
        } catch (error) {
            console.error('Error saving session data to storage:', error);
        }
    }, [result, selectedPoints, hasSpun, isVotingActive, currentTask, players, playerHasVoted, router.query.sessionId]);

    // Effect to handle initial loading and name check
    useEffect(() => {
        const sessionId = router.query.sessionId;
        if (sessionId && socket) {
            console.log(`Session page loaded with ID: ${sessionId}`);

            // Check if player has a name (could be stored in localStorage or sessionStorage)
            const storedName = localStorage.getItem('playerName');

            if (!storedName) {
                // If no name exists, redirect to home page with sessionId as query parameter
                console.log('No player name found, redirecting to home page');
                router.push(`/?sessionId=${sessionId}`);
            } else {
                // Set the player name from storage
                setPlayerName(storedName);

                // Determine if this user should be admin (based on being first or creating the session)
                const isCreator = localStorage.getItem('isSessionCreator') === sessionId;
                console.log(`Checking if creator: ${isCreator} for session ${sessionId}`);

                // Join session with socket
                socket.emit('joinSession', {
                    sessionId,
                    playerName: storedName,
                    isAdmin: isCreator // Pass the admin flag
                });

                if (isCreator) {
                    // If this user created the session, they are the admin
                    setIsAdmin(true);

                    // Add the admin to the players list immediately
                    const adminPlayer = {
                        id: socket.id,
                        name: storedName,
                        isAdmin: true,
                        hasVoted: false
                    };

                    setPlayers(prev => {
                        // Check if this player is already in the list
                        const exists = prev.some(p => p.name === storedName);
                        if (!exists) {
                            return [...prev, adminPlayer];
                        }
                        return prev;
                    });
                }
            }
        }
    }, [router.query.sessionId, socket, router]);

    // Effect to handle socket events related to session errors
    useEffect(() => {
        if (!socket) return;

        socket.on('error', (data) => {
            if (data.message === 'Session not found') {
                alert('This session no longer exists or has been replaced by a new session.');
                router.push('/');
            }
        });

        return () => {
            socket.off('error');
        };
    }, [socket, router]);

    // Set up socket event listeners
    useEffect(() => {
        if (!socket) return;

        const handleWheelResult = (data) => {
            console.log('Received wheel result data:', JSON.stringify(data));

            setIsSpinning(false);
            setHasSpun(true);

            if (!data) {
                console.error('No wheel result data received');
                return;
            }

            if (typeof data !== 'object') {
                console.error(`Invalid wheel result data type: ${typeof data}`);
                return;
            }

            if (Object.keys(data).length === 0) {
                console.error('Received empty wheel result data');
                return;
            }

            try {
                // Properly handle the result field which could be a number or string
                if (data.result !== undefined) {
                    // Ensure result is a number
                    const numericResult = parseFloat(data.result);
                    if (!isNaN(numericResult)) {
                        console.log(`Setting numeric result: ${numericResult}`);
                        setResult(numericResult);
                    } else {
                        console.error(`Non-numeric result received:`, data.result);
                        // Try to use a fallback if available
                        if (data.exactAverage && !isNaN(parseFloat(data.exactAverage))) {
                            console.log(`Using exactAverage as fallback: ${data.exactAverage}`);
                            setResult(parseFloat(data.exactAverage));
                        }
                    }
                } else {
                    console.error('No result field in wheel data');

                    // Attempt to derive a result from players' votes if no result is provided
                    if (Array.isArray(data.players) && data.players.length > 0) {
                        const votes = data.players
                            .filter(p => p.vote !== null && p.vote !== undefined && !isNaN(Number(p.vote)))
                            .map(p => Number(p.vote));

                        if (votes.length > 0) {
                            const average = votes.reduce((sum, vote) => sum + vote, 0) / votes.length;
                            console.log(`Calculated fallback average from player votes: ${average}`);
                            setResult(average);
                        }
                    }
                }

                // Update players with their votes if provided
                if (Array.isArray(data.players) && data.players.length > 0) {
                    console.log(`Updating players with votes. Players count: ${data.players.length}`);

                    // Process player data, ensuring all properties are correctly handled
                    const processedPlayers = data.players.map(player => ({
                        id: player.id || '',
                        name: player.name || '',
                        isAdmin: !!player.isAdmin,
                        hasVoted: !!player.hasVoted,
                        vote: player.vote !== undefined ? player.vote : null
                    }));

                    setPlayers(processedPlayers);
                    console.log('Players updated with votes:', processedPlayers);
                } else {
                    console.error('No valid players array in wheel result data');
                }

                // Update task information if provided
                if (data.task && data.task.name) {
                    setCurrentTask(data.task.name);
                }
            } catch (error) {
                console.error('Error processing wheel result:', error);
            }
        };

        // Register event handlers
        socket.on('adminStatus', (data) => {
            console.log('Received admin status:', data.isAdmin);
            setIsAdmin(data.isAdmin);
        });

        socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            setPlayers(prevPlayers => {
                // If player already exists, update their data
                const existingPlayerIndex = prevPlayers.findIndex(p => p.id === data.id);
                if (existingPlayerIndex >= 0) {
                    const updatedPlayers = [...prevPlayers];
                    updatedPlayers[existingPlayerIndex] = {
                        ...updatedPlayers[existingPlayerIndex],
                        ...data
                    };
                    return updatedPlayers;
                } else {
                    // Otherwise add the new player
                    return [...prevPlayers, data];
                }
            });
        });

        socket.on('playerList', (data) => {
            console.log('Received player list:', data);
            if (data.players && Array.isArray(data.players)) {
                setPlayers(data.players);
            }
        });

        socket.on('playerVoted', (data) => {
            console.log('Player voted:', data);
            setPlayers(prevPlayers => prevPlayers.map(player =>
                player.id === data.playerId
                    ? { ...player, hasVoted: true }
                    : player
            ));
        });

        socket.on('taskUpdate', (data) => {
            console.log('Task update received:', data);
            setCurrentTask(data.taskName);
            setIsVotingActive(data.isActive);
            setHasSpun(false);
            setResult(null);
            setSelectedPoints(null);
            setPlayerHasVoted(false);
        });

        socket.on('wheelSpinning', () => {
            console.log('Wheel spinning event received');
            setIsSpinning(true);
            setHasSpun(false);
        });

        socket.on('wheelResult', handleWheelResult);

        socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== data.playerId));
        });

        // Clean up listeners when component unmounts
        return () => {
            socket.off('adminStatus');
            socket.off('playerJoined');
            socket.off('playerList');
            socket.off('playerVoted');
            socket.off('taskUpdate');
            socket.off('wheelSpinning');
            socket.off('wheelResult');
            socket.off('playerLeft');
        };
    }, [socket]);

    // Start a new voting round with a task
    const handleStartVoting = (e) => {
        e.preventDefault();

        const sessionId = router.query.sessionId;
        if (!newTaskName.trim() || !socket || !sessionId) return;

        // Emit task start event to server
        socket.emit('startTask', {
            sessionId,
            taskName: newTaskName
        });

        setNewTaskName('');
    };

    // Start a new task after voting is complete
    const handleNewTask = () => {
        const sessionId = router.query.sessionId;
        if (!socket || !sessionId) return;

        // Emit end task event to server
        socket.emit('endTask', { sessionId });
    };

    // Handle selection of points
    const handleSelectPoints = (points) => {
        const sessionId = router.query.sessionId;
        if (!isVotingActive || !socket || !sessionId) return;

        // Ensure points is a number
        const numericPoints = Number(points);
        console.log(`Selected points: ${numericPoints}`);

        if (isNaN(numericPoints)) {
            console.error('Invalid points selected');
            return;
        }

        setSelectedPoints(numericPoints);
        setPlayerHasVoted(true);

        // Update players array to mark this player as voted
        setPlayers(prev =>
            prev.map(p => p.name === playerName ? { ...p, hasVoted: true } : p)
        );

        // Emit vote to server
        socket.emit('submitVote', {
            sessionId,
            playerName,
            points: numericPoints
        });
    };

    // Handle spinning the wheel
    const handleSpin = () => {
        const sessionId = router.query.sessionId;

        // Check if spinning is already in progress
        if (isSpinning) {
            console.log("Already spinning, can't spin again");
            return;
        }

        // Check if we have an active voting session
        if (!isVotingActive) {
            console.log("No active voting session");
            return;
        }

        // Check if we have the socket and session ID
        if (!socket || !sessionId) {
            console.log("Missing socket or session ID");
            return;
        }

        // Check if any players have voted
        const hasVotes = players.some(player => player.hasVoted);
        if (!hasVotes) {
            console.log("No votes submitted yet");
            return;
        }

        console.log("Spinning the wheel...");

        // Emit spin event to server
        socket.emit('spinWheel', {
            sessionId,
            votes: players.map(p => p.vote)
        });
    };

    // Join an existing session
    const joinSession = (sessionId, name) => {
        localStorage.setItem('playerName', name);
        router.push(`/session/${sessionId}`);
    };

    // Create a new session (replaces any existing session)
    const createNewSession = (name) => {
        const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem('playerName', name);
        localStorage.setItem('isSessionCreator', newSessionId);
        router.push(`/session/${newSessionId}`);
    };

    // The context value object
    const contextValue = {
        socket,
        isSpinning,
        result,
        playerName,
        selectedPoints,
        hasSpun,
        isAdmin,
        players,
        currentTask,
        newTaskName,
        isVotingActive,
        playerHasVoted,
        validPoints,
        setNewTaskName,
        handleStartVoting,
        handleNewTask,
        handleSelectPoints,
        handleSpin,
        joinSession,
        createNewSession
    };

    return (
        <SessionContext.Provider value={contextValue}>
            {children}
        </SessionContext.Provider>
    );
}

// Export the hook to use the context
export function useSession() {
    const context = useContext(SessionContext);

    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }

    return context;
}