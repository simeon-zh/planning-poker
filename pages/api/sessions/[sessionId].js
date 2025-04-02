import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Import the RouletteWheel component directly with relative path
// This approach avoids path alias issues
import RouletteWheel from '../../components/RouletteWheel';

// Define valid points directly to avoid import issues
const validPoints = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export default function SessionPage() {
    const router = useRouter();
    const { sessionId } = router.query;

    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState(null);

    const handleSpin = () => {
        setIsSpinning(true);

        // Simulate a spin result after 3 seconds
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * validPoints.slice(0, 8).length);
            setResult(validPoints[randomIndex]);
            setIsSpinning(false);
        }, 3000);
    };

    if (!sessionId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-semibold">Loading session...</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Head>
                <title>Roulette Planning | Session {sessionId}</title>
            </Head>

            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-xl font-semibold text-gray-900">
                        Planning Roulette: Session {sessionId}
                    </h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-lg font-medium">Test Roulette</h2>
                            <p className="text-gray-700">This is a test to ensure the RouletteWheel component works</p>
                        </div>

                        <button
                            onClick={handleSpin}
                            disabled={isSpinning}
                            className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                        >
                            {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
                        </button>
                    </div>

                    <div className="flex justify-center mb-6">
                        <RouletteWheel
                            isSpinning={isSpinning}
                            result={result}
                            points={validPoints.slice(0, 8)}
                            onSpinComplete={() => console.log('Spin complete')}
                        />
                    </div>

                    {result !== null && (
                        <div className="text-center">
                            <p className="text-xl font-bold">
                                Result: <span className="text-red-600">{result}</span>
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}