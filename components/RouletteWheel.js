import React, { useEffect, useState } from 'react';

function RouletteWheel({ isSpinning, result }) {
    const [displayResult, setDisplayResult] = useState(null);

    useEffect(() => {
        console.log(`RouletteWheel received result: ${result} (type: ${typeof result})`);

        if (result === null || result === undefined) {
            setDisplayResult(null);
            return;
        }

        try {
            // Handle numeric results
            const numResult = typeof result === 'number' ? result : Number(result);

            if (!isNaN(numResult)) {
                const formatted = Number.isInteger(numResult) ?
                    numResult.toString() : numResult.toFixed(1);
                console.log(`Formatted result: ${formatted}`);
                setDisplayResult(formatted);
            } else {
                // Handle non-numeric result
                console.error(`Invalid numeric result: ${result}`);
                setDisplayResult(String(result));
            }
        } catch (e) {
            console.error(`Error formatting result:`, e);
            setDisplayResult('Error');
        }
    }, [result]);

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 my-4 border-4 border-gray-800 rounded-full bg-red-700">
                <div className="text-center">
                    {isSpinning ? (
                        <div className="absolute inset-0 flex items-center justify-center spin-slow">
                            <p className="text-white text-xl font-bold">Spinning...</p>
                        </div>
                    ) : displayResult !== null ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center border-2 border-gray-800">
                                <span className="text-3xl font-bold text-red-600">{displayResult}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-white text-xl font-bold">Place your bets!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RouletteWheel;