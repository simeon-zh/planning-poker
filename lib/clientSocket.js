// lib/clientSocket.js
// This file contains only the client-side socket utilities
// to avoid importing server-only code in the browser

// Valid point values for voting (duplicated here to avoid importing server code)
export const validPoints = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Client-side helpers for session management
export async function fetchSession(sessionId) {
    try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
            throw new Error('Session not found');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching session:', error);
        throw error;
    }
}

export async function createSession(playerName) {
    try {
        console.log('Creating session for player:', playerName);
        const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ creatorName: playerName }),
        });

        if (!response.ok) {
            console.error('Server returned error:', response.status, response.statusText);
            throw new Error('Failed to create session');
        }

        const data = await response.json();
        console.log('Session created successfully:', data);
        return data;
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
}