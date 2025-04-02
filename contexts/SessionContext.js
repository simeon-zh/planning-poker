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
                if (data.result !== undefined) {
                    const numericResult = Number(data.result);
                    if (!isNaN(numericResult)) {
                        console.log(`Setting numeric result: ${numericResult}`);
                        setResult(numericResult);
                    } else {
                        console.error(`Non-numeric result received:`, data.result);
                    }
                } else {
                    console.error('No result field in wheel data');
                }

                if (Array.isArray(data.players)) {
                    setPlayers(data.players);
                }

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
            setPlayers(prevPlayers => [...prevPlayers, data]);
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

        // Clean up listeners when component unmounts
        return () => {
            socket.off('adminStatus');
            socket.off('playerJoined');
            socket.off('taskUpdate');
            socket.off('wheelSpinning');
            socket.off('wheelResult');
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

        // Update players array
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
        if (isSpinning || !isVotingActive || !socket || !sessionId) return;

        // Emit spin event to server
        socket.emit('spinWheel', { sessionId, votes: players.map(p => p.vote) });
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