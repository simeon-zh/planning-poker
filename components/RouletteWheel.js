import React from 'react';

// Creating a simplified version with no dependencies
function RouletteWheel({ isSpinning, result, points, onSpinComplete }) {
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 my-4 border-4 border-gray-800 rounded-full bg-red-700">
                <div className="text-center">
                    {isSpinning ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-white text-xl font-bold">Spinning...</p>
                        </div>
                    ) : result !== null ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center border-2 border-gray-800">
                                <span className="text-3xl font-bold text-red-600">{result}</span>
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

// Make sure to export the component as default
export default RouletteWheel;