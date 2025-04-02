import { useRouter } from 'next/router';
import Head from 'next/head';

// Import the RouletteWheel component directly with relative path
import RouletteWheel from '../../components/RouletteWheel';
import { useSession } from '../../contexts/SessionContext';

export default function SessionPage() {
    const router = useRouter();
    const { sessionId } = router.query;

    // Function to calculate average of all votes
    const calculateAverage = (players) => {
        const votes = players
            .filter(player => player.vote !== null && player.vote !== undefined)
            .map(player => parseInt(player.vote));

        if (votes.length === 0) return "N/A";

        const sum = votes.reduce((total, vote) => total + vote, 0);
        const avg = sum / votes.length;

        // Return with 1 decimal place if needed, otherwise as integer
        return avg % 1 === 0 ? avg.toString() : avg.toFixed(1);
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
                                <span className="text-sm text-gray-500">{players?.length} players</span>
                            </div>

                            {players?.length === 0 ? (
                                <p className="text-gray-500 text-sm">Waiting for players to join...</p>
                            ) : (
                                <ul className="space-y-2">
                                    {players?.map((player, index) => (
                                        <li
                                            key={index}
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
                                            {hasSpun && (
                                                <span className="text-xs font-medium">{player.vote}</span>
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
                                        {`${window.location.origin}/session/${sessionId}`}
                                    </span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/session/${sessionId}`);
                                            alert('Link copied to clipboard!');
                                        }}
                                        className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                    >
                                        Copy
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
                                {isAdmin && (
                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <p className="text-sm text-yellow-700">
                                            Note: Only one active session exists at a time.
                                            If someone else creates a new session, this one will become inactive.
                                        </p>
                                    </div>
                                )}
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
                                        <p className="text-gray-700">Select your estimate for this task</p>
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

                                                className={`px-4 py-2 text-sm font-medium rounded-md ${isSpinning || players.filter(p => p.hasVoted).length === 0
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
                                                {selectedPoints}
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
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                    {validPoints.slice(0, 8).map((points) => {
                                        const isSelected = selectedPoints === points;

                                        return (
                                            <button
                                                key={points}
                                                onClick={() => handleSelectPoints(points)}
                                                disabled={isSpinning}
                                                className={`p-4 text-center rounded-md transition-all ${isSelected
                                                    ? 'bg-red-600 text-white transform scale-110 shadow-md'
                                                    : 'bg-white border hover:bg-gray-50'
                                                    } ${isSpinning ? 'cursor-not-allowed opacity-50' : ''
                                                    }`}
                                            >
                                                {points}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Players and votes (only visible after spin) */}
                        {hasSpun && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium mb-4">Voting Results</h3>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-medium">Task: {currentTask}</span>
                                        <div className="flex space-x-4 mt-2">
                                            <div>
                                                <p className="text-sm text-gray-600">Selected Result</p>
                                                <p className="text-2xl font-bold text-blue-700">{result} Points</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Average</p>
                                                <p className="text-2xl font-bold text-blue-700">
                                                    {calculateAverage(players)} Points
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
        </div>
    );
}