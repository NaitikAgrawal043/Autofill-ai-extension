// ============================================================
// AutoFill AI — Server: Environment Config
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

export const config = {
    PORT: parseInt(process.env.PORT || '3001', 10),
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'chrome-extension://').split(',').map(s => s.trim()),
    NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validate required config
if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn('⚠️  WARNING: GEMINI_API_KEY is not set. AI matching will not work.');
    console.warn('   Get your API key at: https://aistudio.google.com/apikey');
    console.warn('   Then set it in server/.env');
}
