// ============================================================
// AutoFill AI — Server: Match Fields Route
// ============================================================

import { Router } from 'express';
import { matchFieldsWithAI } from '../services/aiService.js';

import type { Request, Response } from 'express';

export const matchFieldsRouter = Router();

matchFieldsRouter.post('/match-fields', async (req: Request, res: Response): Promise<void> => {
    try {
        const { profile, fields, customAnswers } = req.body;

        // ---- Validation ----
        if (!profile) {
            res.status(400).json({
                success: false,
                error: 'Missing "profile" in request body',
            });
            return;
        }

        if (!fields || !Array.isArray(fields) || fields.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Missing or empty "fields" array in request body',
            });
            return;
        }

        // Limit fields to prevent abuse (Gemini has token limits)
        if (fields.length > 100) {
            res.status(400).json({
                success: false,
                error: 'Too many fields. Maximum 100 fields per request.',
            });
            return;
        }

        console.log(`\n📝 Match request: ${fields.length} fields from extension`);

        // ---- Call AI Service ----
        const result = await matchFieldsWithAI(
            profile,
            fields,
            customAnswers || {}
        );

        res.json({
            success: true,
            matched: result.matched,
            unmatched: result.unmatched,
            confidence: result.overallConfidence,
        });
    } catch (error: any) {
        console.error('❌ Match fields error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error during field matching',
        });
    }
});
