// ============================================================
// AutoFill AI — Server: Feedback Route (for learning)
// ============================================================

import { Router } from 'express';

import type { Request, Response } from 'express';

export const feedbackRouter = Router();

// Store feedback in memory for now (use MongoDB in production)
const feedbackStore: any[] = [];

feedbackRouter.post('/feedback', (req: Request, res: Response) => {
    try {
        const { fieldLabel, aiSuggestion, userCorrection, accepted } = req.body;

        if (!fieldLabel) {
            res.status(400).json({ success: false, error: 'Missing fieldLabel' });
            return;
        }

        const entry = {
            fieldLabel,
            aiSuggestion,
            userCorrection,
            accepted: accepted ?? true,
            timestamp: new Date().toISOString(),
        };

        feedbackStore.push(entry);
        console.log(`📊 Feedback received: "${fieldLabel}" — ${accepted ? 'accepted' : 'corrected'}`);

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

feedbackRouter.get('/feedback/stats', (_req: Request, res: Response) => {
    res.json({
        total: feedbackStore.length,
        accepted: feedbackStore.filter(f => f.accepted).length,
        corrected: feedbackStore.filter(f => !f.accepted).length,
    });
});
