// ============================================================
// AutoFill AI — Background: API Client
// ============================================================

import type { UserProfile, FormField, MatchResult } from '../shared/types';
import { getSettings } from './storageManager';

/**
 * Call the backend API to match form fields with user profile data using AI.
 */
export async function callMatchFieldsAPI(
    profile: UserProfile,
    fields: FormField[],
    customAnswers: Record<string, string>
): Promise<MatchResult> {
    const settings = await getSettings();
    const apiUrl = settings.apiUrl || 'http://localhost:3001/api';

    try {
        const response = await fetch(`${apiUrl}/match-fields`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profile,
                fields,
                customAnswers,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'AI matching failed');
        }

        return {
            matched: data.matched || [],
            unmatched: data.unmatched || [],
            overallConfidence: data.confidence || 0,
        };
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(
                'Cannot connect to the AutoFill AI server. Make sure the backend is running on ' + apiUrl
            );
        }
        throw error;
    }
}

/**
 * Call the backend API to get an ATS job match score.
 */
export async function callAtsScoreAPI(
    resumeText: string,
    jobDescription: string
): Promise<any> {
    const settings = await getSettings();
    const apiUrl = settings.apiUrl || 'http://localhost:3001/api';

    try {
        const response = await fetch(`${apiUrl}/ats-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText, jobDescription }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'ATS scoring failed');
        }
        return data;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(
                'Cannot connect to the AutoFill AI server. Make sure the backend is running on ' + apiUrl
            );
        }
        throw error;
    }
}
