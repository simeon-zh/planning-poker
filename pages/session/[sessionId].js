import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';

// Import the RouletteWheel component directly with relative path
import RouletteWheel from '../../components/RouletteWheel';
import { useSession } from '../../contexts/SessionContext';

export default function SessionPage() {
    const router = useRouter();
    const { sessionId } = router.query;
    const [copied, setCopied] = useState(false);
    const [sessionLink, setSessionLink] = useState('');

    // Set session link when component mounts
    useEffect(() => {
        if (typeof window !== 'undefined' && sessionId) {
            setSessionLink(`${window.location.origin}/session/${sessionId}`);
        }
    }, [sessionId]);

    // Function to calculate average of all votes
    const calculateAverage = (players) => {
        if (!players || !Array.isArray(players)) {
            console.error("No valid players array provided to calculateAverage");
            return "N/A";
        }

        // Filter out players with no votes and convert vote values to numbers
        const votes = players
            .filter(player =>
                player &&
                player.vote !== null &&
                player.vote !== undefined &&
                !isNaN(Number(player.vote))
            )
            .map(player => Number(player.vote));

        // Debug log to check what votes we're using
        console.log("Calculating average from these votes:", votes);

        if (votes.length === 0) {
            console.log("No valid votes found for average calculation");
            return "N/A";
        }

        const sum = votes.reduce((total, vote) => total + vote, 0);
        const avg = sum / votes.length;

        // Return with 1 decimal place if needed, otherwise as integer
        return avg % 1 === 0 ? avg.toString() : avg.toFixed(1);
    };

    // Copy session link to clipboard
    const copySessionLink = () => {
        navigator.clipboard.writeText(sessionLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Use the session context instead of local state
    const {
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
    } = useSession();

    // Loading state - show a loading message
    if (!sessionId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-semibold">Loading session...</h1>
                    <p className="mt-2 text-gray-600">Please wait, the session is initializing.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Head>
                <title>Planning Roulette: Session {sessionId}</title>
                <meta name="description" content="Planning poker with a roulette twist" />
            </Head>

            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Planning Roulette: Session {sessionId}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {isAdmin ? "Admin view" : "Participant view"}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {playerName || 'Player'}
                        </span>
                        {isAdmin && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Admin
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Participants sidebar */}
                    <div className="md:col-span-1">
                        <div className="bg-white shadow rounded-lg p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-medium">Participants</h2>
                                <span className="text-sm text-gray-500">{players?.length || 0} players</span>
                            </div>

                            {players?.length === 0 ? (
                                <p className="text-gray-500 text-sm">Waiting for players to join...</p>
                            ) : (
                                <ul className="space-y-2">
                                    {players?.map((player, index) => (
                                        <li
                                            key={player.id || index}
                                            className={`flex items-center justify-between p-2 rounded-md ${player.hasVoted ? 'bg-green-100' : 'bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className="mr-2">
                                                    <div className={`w-3 h-3 rounded-full ${player.hasVoted ? 'bg-green-500' : 'bg-gray-400'
                                                        }`}></div>
                                                </div>
                                                <span className={player.name === playerName ? "font-medium" : ""}>
                                                    {player.name === playerName ? `${player.name} (You)` : player.name}
                                                </span>
                                                {player.isAdmin && (
                                                    <span className="ml-1 text-xs text-blue-600">(Admin)</span>
                                                )}
                                            </div>
                                            {player.hasVoted && !hasSpun && (
                                                <span className="text-xs text-green-600 font-medium">Voted</span>
                                            )}
                                            {hasSpun && player.vote !== null && player.vote !== undefined && (
                                                <span className={`text-sm font-medium ${player.vote === result ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {player.vote}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Share session link */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Invite others</h3>
                                <div className="flex items-center bg-gray-100 rounded p-2 text-sm break-all">
                                    <span className="mr-2 text-gray-600 truncate flex-grow">
                                        {sessionLink}
                                    </span>
                                    <button
                                        onClick={copySessionLink}
                                        className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                    >
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="md:col-span-3">
                        {/* Admin task input form - only visible for admin when no active voting */}
                        {isAdmin && !isVotingActive && (
                            <div className="bg-white shadow rounded-lg p-6 mb-6">
                                <h2 className="text-lg font-medium mb-4">Start New Voting Round</h2>
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-sm text-yellow-700">
                                        When you start a new voting round, all participants will be able to submit their estimates.
                                    </p>
                                </div>
                                <form onSubmit={handleStartVoting} className="space-y-4">
                                    <div>
                                        <label htmlFor="taskName" className="block text-sm font-medium text-gray-700">
                                            Task Name
                                        </label>
                                        <input
                                            type="text"
                                            id="taskName"
                                            value={newTaskName}
                                            onChange={(e) => setNewTaskName(e.target.value)}
                                            placeholder="Enter task to estimate"
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Start Voting
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Main task voting area - only visible when there's an active task */}
                        {isVotingActive && (
                            <div className="bg-white shadow rounded-lg p-6 mb-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-lg font-medium">Vote for: {currentTask}</h2>
                                        <p className="text-gray-700 mt-1">
                                            {!hasSpun
                                                ? `${players?.filter(p => p.hasVoted)?.length || 0} of ${players?.length || 0} players have voted`
                                                : 'Voting complete!'}
                                        </p>
                                    </div>

                                    {isAdmin && (
                                        hasSpun ? (
                                            <button
                                                onClick={handleNewTask}
                                                className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                                New Task
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSpin}
                                                disabled={isSpinning || !players.some(p => p.hasVoted)}
                                                className={`px-4 py-2 text-sm font-medium rounded-md ${isSpinning || !players.some(p => p.hasVoted)
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    : 'bg-red-600 text-white hover:bg-red-700'
                                                    }`}
                                            >
                                                {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
                                            </button>
                                        )
                                    )}
                                </div>

                                <div className="flex justify-center mb-6">
                                    <RouletteWheel
                                        isSpinning={isSpinning}
                                        result={result}
                                    />
                                </div>

                                {result !== null && (
                                    <div className="text-center mt-4">
                                        <p className="text-xl font-bold">
                                            Result: <span className="text-red-600">{result}</span>
                                        </p>

                                        {/* Your selection highlight */}
                                        <p className="mt-2 text-gray-600">
                                            Your selection:
                                            <span className={selectedPoints === result ? 'text-green-600 font-bold ml-1' : 'text-gray-600 ml-1'}>
                                                {selectedPoints || 'None'}
                                                {selectedPoints === result && ' (Winner!)'}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Voting cards - only visible during active voting */}
                        {isVotingActive && !hasSpun && (
                            <div className="bg-white shadow rounded-lg p-6 mb-6">
                                <h3 className="text-sm font-medium text-gray-500 mb-4">Your bet:</h3>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
                                    {validPoints.map((points) => {
                                        const isSelected = selectedPoints === points;

                                        return (
                                            <button
                                                key={points}
                                                onClick={() => handleSelectPoints(points)}
                                                disabled={isSpinning || playerHasVoted}
                                                className={`p-4 text-center rounded-md transition-all 
                                                    ${isSelected
                                                        ? 'bg-red-600 text-white transform scale-110 shadow-md'
                                                        : 'bg-white border hover:bg-gray-50'
                                                    } 
                                                    ${(isSpinning || playerHasVoted) && !isSelected ? 'cursor-not-allowed opacity-50' : ''}
                                                `}
                                            >
                                                {points}
                                            </button>
                                        );
                                    })}
                                </div>

                                {playerHasVoted && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded text-green-700 text-sm">
                                        Your vote has been submitted! Waiting for other players to vote.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Players and votes (only visible after spin) */}
                        {hasSpun && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium mb-4">Voting Results</h3>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-medium">Task: {currentTask}</span>
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            <div>
                                                <p className="text-sm text-gray-600">Selected Result</p>
                                                <p className="text-2xl font-bold text-blue-700">{result !== null ? `${result} Points` : 'Pending...'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Average</p>
                                                <p className="text-2xl font-bold text-blue-700">
                                                    {calculateAverage(players)} Points
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Your Vote</p>
                                                <p className="text-2xl font-bold text-blue-700">
                                                    {selectedPoints !== null ? `${selectedPoints}` : 'None'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={handleNewTask}
                                            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                            New Task
                                        </button>
                                    )}
                                </div>

                                {/* Player votes summary */}
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Player Votes</h4>
                                    <div className="space-y-2">
                                        {players.filter(p => p.hasVoted).map((player, index) => (
                                            <div key={player.id || index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                                <div className="font-medium">
                                                    {player.name === playerName ? `${player.name} (You)` : player.name}
                                                    {player.isAdmin && <span className="ml-1 text-xs text-blue-600">(Admin)</span>}
                                                </div>
                                                <div className={`font-bold ${player.vote === result ? 'text-green-600' : 'text-gray-700'}`}>
                                                    {player.vote !== null && player.vote !== undefined ? player.vote : 'No vote'}
                                                </div>
                                            </div>
                                        ))}

                                        {players.filter(p => p.hasVoted).length === 0 && (
                                            <div className="text-center py-3 text-gray-500">
                                                No votes recorded for this task.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Instructions when no voting is active */}
                        {!isVotingActive && !isAdmin && (
                            <div className="bg-white shadow rounded-lg p-6 text-center">
                                <h2 className="text-lg font-medium mb-2">Waiting for admin to start a voting round</h2>
                                <p className="text-gray-600">The session admin will start a new voting round soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="bg-white mt-8 py-4 border-t">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">
                        Planning Roulette - A fun way to estimate user stories
                    </p>
                </div>
            </footer>
        </div>
    );
}