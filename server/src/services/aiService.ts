// ============================================================
// AutoFill AI — Server: Gemini AI Service
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { buildMatchFieldsPrompt } from '../prompts/matchFields.js';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
        if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            throw new Error('GEMINI_API_KEY is not configured. Set it in server/.env');
        }
        genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
    return genAI;
}

export interface MatchedField {
    selector: string;
    value: string;
    type: string;
    confidence: number;
    source: string;
}

export interface UnmatchedField {
    selector: string;
    label: string;
    type: string;
    reason: string;
}

export interface AIMatchResult {
    matched: MatchedField[];
    unmatched: UnmatchedField[];
    overallConfidence: number;
}

/**
 * Use Gemini AI to match form fields with user profile data.
 */
export async function matchFieldsWithAI(
    profile: any,
    fields: any[],
    customAnswers: Record<string, string>
): Promise<AIMatchResult> {
    const ai = getGenAI();

    const model = ai.getGenerativeModel({
        model: 'gemma-3-4b-it',
        generationConfig: {
            temperature: 0.1,          // Low temperature for consistent, factual output
            topP: 0.95,
            maxOutputTokens: 8192,
        },
    });

    // If a PDF is uploaded, dynamically extract its text so the Gemma text model can read it!
    if (profile.resumePdfBase64) {
        try {
            console.log(`[AI] Extracting text from PDF resume...`);
            const base64Data = profile.resumePdfBase64.replace(/^data:application\/pdf;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const pdfParseModule = (await import('pdf-parse')) as any;
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const pdfData = await pdfParse(buffer);
            profile.resumeText = (profile.resumeText || '') + '\n\n--- EXTRACTED RESUME TEXT ---\n' + pdfData.text;
        } catch (e: any) {
            console.error('[AI] Failed to extract text from PDF:', e.message);
        }
    }

    const prompt = buildMatchFieldsPrompt(profile, fields, customAnswers);

    console.log(`[AI] Sending ${fields.length} fields to Gemini for matching...`);
    const startTime = Date.now();

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        const elapsed = Date.now() - startTime;
        console.log(`[AI] Gemini responded in ${elapsed}ms`);

        // Parse the JSON response
        let parsed: any;
        try {
            // Clean possible markdown fences
            const cleaned = text
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();
            parsed = JSON.parse(cleaned);
        } catch (parseError) {
            console.error('[AI] Failed to parse response:', text.substring(0, 500));
            throw new Error('AI returned an unparseable response. Please try again.');
        }

        const initialMatched: MatchedField[] = (parsed.matched || []).map((m: any) => ({
            selector: m.selector || '',
            value: String(m.value ?? ''),
            type: m.type || 'text',
            confidence: typeof m.confidence === 'number' ? m.confidence : 0.5,
            source: m.source || 'ai',
        }));

        const unmatched: UnmatchedField[] = (parsed.unmatched || []).map((u: any) => ({
            selector: u.selector || '',
            label: u.label || '',
            type: u.type || 'text',
            reason: u.reason || 'Unknown',
        }));

        // ENFORCE STRICT HALLUCINATION GUARDRAIL: Automatically move any match < 0.80 straight to the "unmatched" UI bucket
        const finalMatched: MatchedField[] = [];
        for (const m of initialMatched) {
            if (m.confidence < 0.80 || m.value.trim() === '') {
                const ogField = fields.find(f => f.selector === m.selector);
                unmatched.push({
                    selector: m.selector,
                    label: ogField?.label || ogField?.placeholder || 'Unknown Field',
                    type: m.type,
                    reason: 'AI confidence was too low. Sent to manual input completely to avoid hallucination.',
                });
            } else {
                finalMatched.push(m);
            }
        }

        // CATCH-ALL: Sometimes the AI simply drops fields it doesn't understand and doesn't even put them in "unmatched".
        // We MUST verify every single original field was addressed, and if not, force it into unmatched.
        for (const og of fields) {
            const isMatched = finalMatched.some(m => m.selector === og.selector);
            const isUnmatched = unmatched.some(u => u.selector === og.selector);

            if (!isMatched && !isUnmatched) {
                unmatched.push({
                    selector: og.selector,
                    label: og.label || og.placeholder || 'Unknown Field',
                    type: og.type || 'text',
                    reason: 'AI completely skipped this field. Manual review required.',
                });
            }
        }

        const overallConfidence = finalMatched.length > 0
            ? Math.round(
                (finalMatched.reduce((sum, m) => sum + m.confidence, 0) / finalMatched.length) * 100
            ) / 100
            : 0;

        // FINAL FILTER: Do not bother the user with "Unmatched Fields" if the field is ALREADY FILLED OUT on their screen.
        // It's incredibly annoying to be asked to "fill" a field that already has their name or GPA in it natively.
        const cleanUnmatched = unmatched.filter(u => {
            const ogField = fields.find(f => f.selector === u.selector);
            // If the field actually exists on screen and has a value of > 1 character already, skip it completely.
            if (ogField && ogField.currentValue && ogField.currentValue.trim().length > 1) {
                return false;
            }
            return true;
        });

        console.log(`[AI] Matched: ${finalMatched.length}, Unmatched UI Needs: ${cleanUnmatched.length}, Confidence: ${overallConfidence}`);

        return { matched: finalMatched, unmatched: cleanUnmatched, overallConfidence };
    } catch (error: any) {
        if (error.message?.includes('API_KEY')) {
            throw new Error('Invalid Gemini API key. Check your GEMINI_API_KEY in .env');
        }
        if (error.message?.includes('quota')) {
            throw new Error('Gemini API quota exceeded. Try again later.');
        }
        throw error;
    }
}

/**
 * Compare resume text against a job description to calculate an ATS score.
 */
export async function getAtsScoreWithAI(resumeText: string, jobDescription: string): Promise<{ score: number; missingKeywords: string[]; feedback: string }> {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({
        model: 'gemma-3-4b-it',
        generationConfig: {
            temperature: 0.2, // Keep it highly analytical
            topP: 0.95,
            maxOutputTokens: 2000,
        },
    });

    const prompt = `You are an expert ATS (Applicant Tracking System) software. Analyze the following resume against the provided job description.
    
    ## INSTRUCTIONS:
    1. Calculate a MATCH SCORE from 0 to 100 representing how well the candidate fits the role.
    2. Identify up to 5 critical MISSING KEYWORDS (skills, tools, or experiences) that are in the job description but NOT in the resume.
    3. Provide a brief, actionable 2-sentence FEEDBACK summary on how to improve the resume for this exact job.

    ## RESUME TEXT:
    ${resumeText}

    ## JOB DESCRIPTION:
    ${jobDescription}

    ## OUTPUT FORMAT (strict JSON, no markdown formatting blocks):
    {
      "score": <number>,
      "missingKeywords": ["keyword1", "keyword2"],
      "feedback": "<detailed string>"
    }`;

    console.log('[AI] Calculating ATS Score...');
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
            score: typeof parsed.score === 'number' ? parsed.score : parseInt(parsed.score) || 0,
            missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
            feedback: parsed.feedback || 'No feedback provided.',
        };
    } catch (e) {
        console.error('[AI] Failed to parse ATS score:', text);
        throw new Error('AI returned an unparseable ATS score format.');
    }
}
