// pages/api/sessions/[sessionId].js
import { getSession } from '@/lib/socket';

export default function handler(req, res) {
    const { sessionId } = req.query;

    if (req.method === 'GET') {
        try {
            console.log('API: Getting session:', sessionId);
            const session = getSession(sessionId);

            if (!session) {
                console.log('API: Session not found:', sessionId);
                return res.status(404).json({ error: 'Session not found' });
            }

            console.log('API: Session found, returning data');

            // Convert Map objects to arrays for JSON serialization
            const responseData = {
                id: session.id,
                creatorName: session.creatorName,
                players: Array.from(session.players.values()),
                tasks: session.tasks,
                currentTask: session.currentTask,
                // Convert votes to an array of objects for the response
                votes: Array.from(session.votes.entries()).map(([playerId, vote]) => ({
                    playerId,
                    vote: session.currentTask?.revealed ? vote : '?'
                })),
                // Convert victories to an array for response
                victories: Array.from(session.victories.entries()).map(([playerId, count]) => ({
                    playerId,
                    count
                }))
            };

            res.status(200).json(responseData);
        } catch (error) {
            console.error('API: Error getting session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}