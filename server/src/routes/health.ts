// ============================================================
// AutoFill AI — Server: Health Check Route
// ============================================================

import { Router } from 'express';
import { config } from '../config/env.js';

import type { Request, Response } from 'express';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/health', (_req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    res.json({
        status: 'ok',
        uptime: uptimeSeconds,
        aiProvider: 'gemini',
        aiConfigured: Boolean(config.GEMINI_API_KEY && config.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
