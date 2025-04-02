import React, { useEffect, useState, useRef } from 'react';

function RouletteWheel({ isSpinning, result }) {
    const [displayResult, setDisplayResult] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const wheelRef = useRef(null);

    // Handle incoming results
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

                // Only set the display result after animation is complete
                if (isSpinning) {
                    setIsAnimating(true);
                    // Will be set to the actual result when animation ends
                } else {
                    setDisplayResult(formatted);
                }
            } else {
                // Handle non-numeric result
                console.error(`Invalid numeric result: ${result}`);
                setDisplayResult(String(result));
            }
        } catch (e) {
            console.error(`Error formatting result:`, e);
            setDisplayResult('Error');
        }
    }, [result, isSpinning]);

    // Handle animation effects
    useEffect(() => {
        if (!wheelRef.current) return;

        if (isSpinning) {
            // Start spinning animation
            wheelRef.current.classList.add('animate-spin-slow');
            setIsAnimating(true);

            // Set a timeout to end the animation
            const timeout = setTimeout(() => {
                if (wheelRef.current) {
                    wheelRef.current.classList.remove('animate-spin-slow');
                }

                setIsAnimating(false);

                // Now show the result
                if (result !== null && result !== undefined) {
                    const numResult = typeof result === 'number' ? result : Number(result);
                    if (!isNaN(numResult)) {
                        const formatted = Number.isInteger(numResult) ?
                            numResult.toString() : numResult.toFixed(1);
                        setDisplayResult(formatted);
                    }
                }
            }, 2000); // Match this to your CSS animation time

            return () => clearTimeout(timeout);
        } else if (!isSpinning && isAnimating) {
            // If we were spinning but now it's stopped
            wheelRef.current.classList.remove('animate-spin-slow');
            setIsAnimating(false);

            // Set the result
            if (result !== null && result !== undefined) {
                const numResult = typeof result === 'number' ? result : Number(result);
                if (!isNaN(numResult)) {
                    const formatted = Number.isInteger(numResult) ?
                        numResult.toString() : numResult.toFixed(1);
                    setDisplayResult(formatted);
                }
            }
        }
    }, [isSpinning, isAnimating, result]);

    return (
        <div className="flex flex-col items-center">
            <div ref={wheelRef} className="relative w-64 h-64 my-4 border-4 border-gray-800 rounded-full bg-red-700 transition-transform duration-500">
                {/* Wheel pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-5 h-10 bg-yellow-500 transform rotate-180"
                        style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                </div>

                <div className="text-center">
                    {isSpinning || isAnimating ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-white text-xl font-bold">Spinning...</p>
                        </div>
                    ) : displayResult !== null ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center border-2 border-gray-800 shadow-lg transition-all duration-300 transform scale-110">
                                <span className="text-3xl font-bold text-red-600">{displayResult}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-white text-xl font-bold">Place your bets!</p>
                        </div>
                    )}
                </div>

                {/* Add wheel sections for visual effect */}
                {!isSpinning && !isAnimating && displayResult === null && (
                    <>
                        {validPoints.map((point, index) => (
                            <div
                                key={point}
                                className="absolute w-full h-full"
                                style={{
                                    transform: `rotate(${index * (360 / validPoints.length)}deg)`,
                                    clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 50%)',
                                    backgroundColor: index % 2 === 0 ? '#991b1b' : '#7f1d1d',
                                }}
                            >
                                <span
                                    className="absolute text-white text-sm"
                                    style={{
                                        top: '25%',
                                        left: '75%',
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                >
                                    {point}
                                </span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

// Define valid points array for the wheel sections
const validPoints = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export default RouletteWheel;