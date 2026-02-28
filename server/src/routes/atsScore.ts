import { Router } from 'express';
import { getAtsScoreWithAI } from '../services/aiService.js';

export const atsScoreRouter = Router();

atsScoreRouter.post('/ats-score', async (req: any, res: any): Promise<void> => {
    try {
        const { resumeText, jobDescription } = req.body;

        if (!resumeText || !jobDescription) {
            res.status(400).json({ success: false, error: 'Missing resumeText or jobDescription' });
            return;
        }

        const scoreData = await getAtsScoreWithAI(resumeText, jobDescription);

        res.json({
            success: true,
            ...scoreData
        });
    } catch (error: any) {
        console.error('❌ ATS Score error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to calculate ATS matching score.' });
    }
});
