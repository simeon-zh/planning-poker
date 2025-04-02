// pages/_app.js
import '../styles/globals.css';
import { SessionProvider } from '../contexts/SessionContext';

function MyApp({ Component, pageProps }) {
    return (
        <SessionProvider>
            <Component {...pageProps} />
        </SessionProvider>
    );
}

export default MyApp;