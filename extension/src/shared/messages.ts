// ============================================================
// AutoFill AI — Message Types for Chrome Runtime Messaging
// ============================================================

export const MessageType = {
    // Popup → Background
    START_AUTOFILL: 'START_AUTOFILL',
    GET_STATUS: 'GET_STATUS',
    GET_PROFILE: 'GET_PROFILE',
    SAVE_PROFILE: 'SAVE_PROFILE',
    SAVE_CUSTOM_ANSWER: 'SAVE_CUSTOM_ANSWER',
    FILL_UNMATCHED: 'FILL_UNMATCHED',
    GET_ATS_SCORE: 'GET_ATS_SCORE',

    // Background → Content Script
    SCRAPE_FIELDS: 'SCRAPE_FIELDS',
    SCRAPE_PAGE_TEXT: 'SCRAPE_PAGE_TEXT',
    FILL_FIELDS: 'FILL_FIELDS',
    HIGHLIGHT_UNMATCHED: 'HIGHLIGHT_UNMATCHED',

    // Content Script → Background
    FIELDS_SCRAPED: 'FIELDS_SCRAPED',
    FIELDS_FILLED: 'FIELDS_FILLED',
    FORM_DETECTED: 'FORM_DETECTED',
} as const;

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType];

export interface Message {
    type: MessageTypeValue;
    data?: any;
}

export interface AutofillResponse {
    success: boolean;
    filled?: number;
    total?: number;
    unmatched?: any[];
    error?: string;
}
