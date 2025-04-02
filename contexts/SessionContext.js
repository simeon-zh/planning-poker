// contexts/SessionContext.js
import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/router';

// Create the context
const SessionContext = createContext();

// Export the provider component
export function SessionProvider({ children }) {
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [player, setPlayer] = useState(null);
    const [error, setError] = useState(null);

    // Join a session (simplified)
    const joinSession = async (sessionId, playerName, isAdmin = false) => {
        try {
            console.log(`Joining session: ${sessionId} as ${playerName} (admin: ${isAdmin})`);

            // Store player information
            setPlayer({
                name: playerName,
                isAdmin: isAdmin
            });

            // Create a simple session object
            setSession({
                id: sessionId,
                creatorName: isAdmin ? playerName : 'Unknown',
                players: [{ name: playerName, isAdmin }],
                tasks: []
            });

            return true;
        } catch (error) {
            setError(error.message || 'Failed to join session');
            return false;
        }
    };

    // Create a new session (simplified)
    const createNewSession = async (playerName) => {
        try {
            // Generate a random session ID
            const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
            console.log(`Created session: ${sessionId} for ${playerName}`);

            return sessionId;
        } catch (error) {
            setError(error.message || 'Failed to create session');
            return null;
        }
    };

    // The context value object
    const contextValue = {
        session,
        player,
        error,
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