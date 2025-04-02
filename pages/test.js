// pages/test.js
import React from 'react';
// Import just to test if the component can be found
import RouletteWheel from '@/components/RouletteWheel';

export default function TestPage() {
    return (
        <div>
            <h1>Import Test Page</h1>
            <p>If you can see this without errors, the RouletteWheel component is importable.</p>
            <RouletteWheel
                isSpinning={false}
                result={5}
                points={[0, 1, 2, 3, 5, 8, 13, 21]}
                onSpinComplete={() => console.log('Spin complete')}
            />
        </div>
    );
}