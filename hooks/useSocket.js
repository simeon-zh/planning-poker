// hooks/useSocket.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket() {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    // Keep eventHandlers in a ref to avoid dependency issues with useEffect
    const eventHandlersRef = useRef({});

    // Initialize socket connection
    useEffect(() => {
        // Create socket connection only on client-side
        if (typeof window === 'undefined') return;

        console.log('Initializing socket connection');
        const socketIo = io({
            path: '/api/socket',
        });

        function onConnect() {
            console.log('Socket connected');
            setIsConnected(true);
        }

        function onDisconnect() {
            console.log('Socket disconnected');
            setIsConnected(false);
        }

        function onError(error) {
            console.error('Socket error:', error);
            setError(error.message || 'An error occurred');
        }

        // Set up event listeners
        socketIo.on('connect', onConnect);
        socketIo.on('disconnect', onDisconnect);
        socketIo.on('error', onError);

        setSocket(socketIo);

        // Clean up event listeners on unmount
        return () => {
            console.log('Cleaning up socket connection');
            socketIo.off('connect', onConnect);
            socketIo.off('disconnect', onDisconnect);
            socketIo.off('error', onError);
            socketIo.disconnect();
        };
    }, []);

    // Set up event handlers from components
    useEffect(() => {
        if (socket && isConnected) {
            console.log('Setting up socket event handlers');

            // Add event listeners for all registered handlers
            Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
                socket.on(event, handler);
            });

            // Clean up event listeners when component unmounts or socket changes
            return () => {
                console.log('Removing socket event handlers');
                Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
                    socket.off(event, handler);
                });
            };
        }
    }, [socket, isConnected]);

    // Register event handler
    const on = useCallback((event, handler) => {
        if (!eventHandlersRef.current[event]) {
            console.log(`Registering handler for event: ${event}`);
            eventHandlersRef.current[event] = handler;

            // If socket is already connected, add the listener immediately
            if (socket && isConnected) {
                socket.on(event, handler);
            }
        }
    }, [socket, isConnected]);

    // Unregister event handler
    const off = useCallback((event) => {
        if (eventHandlersRef.current[event]) {
            console.log(`Unregistering handler for event: ${event}`);

            // If socket is connected, remove the listener
            if (socket && isConnected) {
                socket.off(event, eventHandlersRef.current[event]);
            }

            delete eventHandlersRef.current[event];
        }
    }, [socket, isConnected]);

    // Emit an event
    const emit = useCallback((event, data, callback) => {
        if (socket && isConnected) {
            console.log(`Emitting event: ${event}`, data);
            socket.emit(event, data, callback);
        } else {
            console.error(`Cannot emit ${event}: Socket not connected`);
            setError('Socket not connected');
        }
    }, [socket, isConnected]);

    return { socket, isConnected, error, on, off, emit };
}