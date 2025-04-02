// pages/api/socket.js
import { initSocket } from '@/lib/socket';

export default function handler(req, res) {
    try {
        console.log('Socket.IO API endpoint called');
        // Initialize Socket.IO
        const io = initSocket(res);
        console.log('Socket.IO initialized:', !!io);

        // SendStatus is not used here because the socket server will handle the communication
        res.end();
    } catch (error) {
        console.error('Error initializing Socket.IO:', error);
        res.status(500).end();
    }
}