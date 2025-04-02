// pages/api/sessions/index.js
import { createSession } from '@/lib/socket';

export default function handler(req, res) {
    if (req.method === 'POST') {
        // Get the creator name from the request body
        const { creatorName } = req.body;

        // Create a new session with the creator name
        const sessionId = createSession(creatorName);
        res.status(200).json({ sessionId });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}