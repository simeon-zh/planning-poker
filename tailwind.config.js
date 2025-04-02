/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            animation: {
                'spin-slow': 'spin 5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            },
            transitionDuration: {
                '5000': '5000ms',
            },
            borderWidth: {
                '12': '12px',
            },
        },
    },
    plugins: [],
}