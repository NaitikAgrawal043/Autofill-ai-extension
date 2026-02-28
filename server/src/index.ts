// ============================================================
// AutoFill AI — Server: Express Entry Point
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { matchFieldsRouter } from './routes/matchFields.js';
import { extractPdfRouter } from './routes/extractPdf.js';
import { atsScoreRouter } from './routes/atsScore.js';
import { healthRouter } from './routes/health.js';
import { feedbackRouter } from './routes/feedback.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ---- Security Middleware ----
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ---- CORS ----
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like curl, Postman, or same-origin)
        if (!origin) {
            callback(null, true);
            return;
        }
        // Allow Chrome extensions
        if (origin.startsWith('chrome-extension://')) {
            callback(null, true);
            return;
        }
        // Allow localhost in development
        if (config.NODE_ENV === 'development' && (
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1')
        )) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ---- Rate Limiting ----
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                    // 100 requests per window
    message: { success: false, error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
}));

// ---- Body Parser ----
app.use(express.json({ limit: '10mb' }));

// ---- Request Logger ----
app.use((req, _res, next) => {
    if (req.path !== '/api/health') {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    }
    next();
});

// ---- Routes ----
app.use('/api', healthRouter);
app.use('/api', matchFieldsRouter);
app.use('/api', extractPdfRouter);
app.use('/api', atsScoreRouter);
app.use('/api', feedbackRouter);

// ---- Root Route ----
app.get('/', (_req, res) => {
    res.json({
        name: 'AutoFill AI Server',
        version: '1.0.0',
        docs: '/api/health',
        endpoints: [
            'GET  /api/health',
            'POST /api/match-fields',
            'POST /api/feedback',
            'GET  /api/feedback/stats',
        ],
    });
});

// ---- Error Handler ----
app.use(errorHandler);

// ---- Start Server ----
app.listen(config.PORT, () => {
    console.log('');
    console.log('  ⚡ AutoFill AI Server');
    console.log('  ──────────────────────────────');
    console.log(`  🚀 Running on http://localhost:${config.PORT}`);
    console.log(`  🏥 Health:    http://localhost:${config.PORT}/api/health`);
    console.log(`  🤖 AI:       Gemini 2.0 Flash`);
    console.log(`  🔑 API Key:  ${config.GEMINI_API_KEY && config.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✅ Configured' : '❌ Not set'}`);
    console.log(`  🌍 Env:      ${config.NODE_ENV}`);
    console.log('  ──────────────────────────────');
    console.log('');
});

export default app;
