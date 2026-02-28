// ============================================================
// AutoFill AI — Background Script: Service Worker Entry Point
// ============================================================

import { MessageType } from '../shared/messages';
import { getProfile, saveProfile, getCustomAnswers, saveCustomAnswer } from './storageManager';
import { callMatchFieldsAPI, callAtsScoreAPI } from './apiClient';
import type { FieldMapping } from '../shared/types';

console.log('[AutoFill AI] Background service worker started');

// ---- Message Listener ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender)
        .then(sendResponse)
        .catch((error) => {
            console.error('[AutoFill AI] Background error:', error);
            sendResponse({ success: false, error: error.message });
        });
    return true; // Keep channel open for async response
});

/**
 * Central message handler — routes messages from popup and content scripts.
 */
async function handleMessage(message: any, _sender: chrome.runtime.MessageSender) {
    switch (message.type) {
        // ========================
        // Popup → Background
        // ========================

        case MessageType.START_AUTOFILL: {
            return await handleStartAutofill();
        }

        case MessageType.GET_PROFILE: {
            const profile = await getProfile();
            return { success: true, profile };
        }

        case MessageType.SAVE_PROFILE: {
            await saveProfile(message.data);
            return { success: true };
        }

        case MessageType.SAVE_CUSTOM_ANSWER: {
            const { label, answer } = message.data;
            await saveCustomAnswer(label, answer);
            return { success: true };
        }

        case MessageType.FILL_UNMATCHED: {
            // User provided answers for unmatched fields — fill them
            return await handleFillUnmatched(message.data);
        }

        case MessageType.GET_ATS_SCORE: {
            return await handleGetAtsScore();
        }

        // ========================
        // Content Script → Background
        // ========================

        case MessageType.FORM_DETECTED: {
            console.log('[AutoFill AI] Form detected on:', message.data?.url);
            // Update badge to show forms are available
            const tab = _sender.tab;
            if (tab?.id) {
                await chrome.action.setBadgeText({ text: '●', tabId: tab.id });
                await chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId: tab.id });
            }
            return { success: true };
        }

        default:
            return { success: false, error: `Unknown message type: ${message.type}` };
    }
}

/**
 * Full autofill flow: scrape → match → fill.
 */
async function handleStartAutofill() {
    // Step 1: Get active tab
    const tab = await getActiveTab();
    if (!tab?.id) {
        return { success: false, error: 'No active tab found' };
    }

    // Step 2: Ask content script to scrape form fields
    let scrapeResponse;
    try {
        scrapeResponse = await chrome.tabs.sendMessage(tab.id, {
            type: MessageType.SCRAPE_FIELDS,
        });
    } catch {
        return {
            success: false,
            error: 'Could not connect to the page. Try refreshing and clicking AutoFill again.',
        };
    }

    if (!scrapeResponse?.success || !scrapeResponse.fields?.length) {
        return {
            success: false,
            error: scrapeResponse?.error || 'No form fields detected on this page.',
        };
    }

    const fields = scrapeResponse.fields;

    // Step 3: Get user profile
    const profile = await getProfile();
    if (!profile || !profile.firstName) {
        return {
            success: false,
            error: 'Profile not set up. Please open the Options page and fill in your details.',
            needsProfile: true,
        };
    }

    // Step 4: Call backend AI for field matching
    let matchResult;
    try {
        const customAnswers = await getCustomAnswers();
        matchResult = await callMatchFieldsAPI(profile, fields, customAnswers);
    } catch (error) {
        return {
            success: false,
            error: `AI matching failed: ${(error as Error).message}`,
        };
    }

    // Step 5: Send matched fields to content script for filling
    let fillResponse;
    if (matchResult.matched.length > 0) {
        try {
            fillResponse = await chrome.tabs.sendMessage(tab.id, {
                type: MessageType.FILL_FIELDS,
                data: matchResult.matched,
            });
        } catch {
            return { success: false, error: 'Failed to fill form fields on the page.' };
        }
    }

    // Step 6: Highlight unmatched fields
    if (matchResult.unmatched.length > 0) {
        try {
            await chrome.tabs.sendMessage(tab.id, {
                type: MessageType.HIGHLIGHT_UNMATCHED,
                data: matchResult.unmatched,
            });
        } catch {
            // Non-critical: just skip highlighting
        }
    }

    const filledCount = fillResponse?.results?.filter((r: any) => r.success).length || 0;

    return {
        success: true,
        filled: filledCount,
        total: fields.length,
        unmatched: matchResult.unmatched,
        confidence: matchResult.overallConfidence,
    };
}

/**
 * Fill previously unmatched fields with user-provided answers.
 */
async function handleFillUnmatched(userAnswers: { selector: string; value: string; type: string; label?: string }[]) {
    const tab = await getActiveTab();
    if (!tab?.id) return { success: false, error: 'No active tab' };

    // Automatically save user's manual answers to Customs (AutoFill Memory)
    for (const a of userAnswers) {
        if (a.label && a.value) {
            await saveCustomAnswer(a.label, a.value);
        }
    }

    const mappings: FieldMapping[] = userAnswers.map((a) => ({
        selector: a.selector,
        value: a.value,
        type: a.type,
        confidence: 1.0,
        source: 'user_manual',
    }));

    // Save these answers for future use
    for (const a of userAnswers) {
        // Use label from the DOM if possible
        await saveCustomAnswer(a.selector, a.value);
    }

    try {
        const fillResponse = await chrome.tabs.sendMessage(tab.id, {
            type: MessageType.FILL_FIELDS,
            data: mappings,
        });
        return { success: true, results: fillResponse?.results };
    } catch {
        return { success: false, error: 'Failed to fill fields on the page.' };
    }
}

/**
 * Handle Job Match Match/ATS Score request.
 */
async function handleGetAtsScore() {
    const tab = await getActiveTab();
    if (!tab?.id) return { success: false, error: 'Cannot access the current page.' };

    const profile = await getProfile();
    if (!profile || !profile.resumeText) {
        return { success: false, error: 'No Resume Data found! Please upload a PDF resume in Options first.' };
    }

    try {
        // Scrape entire page text
        const scrapeResponse = await chrome.tabs.sendMessage(tab.id, {
            type: MessageType.SCRAPE_PAGE_TEXT,
        });

        if (!scrapeResponse?.success || !scrapeResponse.text) {
            return { success: false, error: 'Failed to read job description from the page.' };
        }

        // Call the AI Server
        const scoreData = await callAtsScoreAPI(profile.resumeText, scrapeResponse.text);
        return scoreData;
    } catch (error: any) {
        return { success: false, error: `Match failed: ${error.message}` };
    }
}

/**
 * Get the currently active tab.
 */
async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}
