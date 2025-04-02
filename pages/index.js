import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);

    // Initialize Socket.IO
    useEffect(() => {
        // Initialize socket connection
        fetch('/api/socket');
    }, []);

    // Check for sessionId in URL when page loads
    useEffect(() => {
        // Extract sessionId from URL query parameters if available
        if (router.query.sessionId) {
            setSessionId(router.query.sessionId.toUpperCase());
        }
    }, [router.query]);

    // Handle join session
    const handleJoinSession = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!sessionId.trim()) {
            setError('Please enter a session ID');
            return;
        }

        setIsJoining(true);

        try {
            // Store the player name in localStorage before redirecting
            localStorage.setItem('playerName', name.trim());

            // Navigate to the session page
            router.push(`/session/${sessionId.toUpperCase()}`);
        } catch (error) {
            console.error('Error joining session:', error);
            setError('Failed to join session');
        } finally {
            setIsJoining(false);
        }
    };

    // Handle create new session
    const handleCreateSession = async (e) => {
        e.preventDefault();

        // Use the entered name or default to "Admin" if empty
        const adminName = name.trim() || "Admin";

        setIsCreating(true);

        try {
            // Store the player name in localStorage before redirecting
            localStorage.setItem('playerName', adminName);

            // Generate a random session ID
            const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();

            console.log(`Created session: ${newSessionId}`);

            // Navigate to the session page
            router.push(`/session/${newSessionId}`);
        } catch (error) {
            console.error('Error creating session:', error);
            setError('Failed to create session');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <Head>
                <title>Planning Roulette</title>
                <meta name="description" content="Sprint planning voting tool with a roulette twist" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="text-center text-3xl font-extrabold text-gray-900">
                    Planning Roulette
                </h1>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Estimate user stories with a spin of the wheel!
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Your Name
                        </label>
                        <div className="mt-1">
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                placeholder="Enter your name"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Join existing session section */}
                        <div>
                            <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700">
                                Session ID
                            </label>
                            <div className="mt-1">
                                <input
                                    id="sessionId"
                                    name="sessionId"
                                    type="text"
                                    value={sessionId}
                                    onChange={(e) => setSessionId(e.target.value)}
                                    className="appearance-none uppercase block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                    placeholder="Enter session ID"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleJoinSession}
                            disabled={isJoining}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isJoining
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                                }`}
                        >
                            {isJoining ? 'Joining...' : 'Join Session'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateSession}
                            disabled={isCreating}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isCreating
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                }`}
                        >
                            {isCreating ? 'Creating...' : name.trim() ? `Create Session as "${name}"` : 'Create Session as "Admin"'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}