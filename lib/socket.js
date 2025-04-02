// pages/api/socket.js
import { Server } from 'socket.io';
import { initSocketServer } from './socketServer';

export default function SocketHandler(req, res) {
    // If Socket.IO server is already running, skip initialization
    if (res.socket.server.io) {
        console.log('Socket.IO server already running');
        res.end();
        return;
    }

    console.log('Starting Socket.IO server');
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    // Initialize socket handlers
    initSocketServer(io);

    console.log('Socket.IO server initialized');
    res.end();
}