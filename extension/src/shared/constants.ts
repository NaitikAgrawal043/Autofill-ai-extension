// ============================================================
// AutoFill AI — Shared Constants
// ============================================================

// Backend API URL (Production via Render)
export const API_BASE_URL = 'https://autofill-ai-extension.onrender.com/api';

// Storage Keys
export const STORAGE_KEYS = {
    USER_PROFILE: 'autofill_user_profile',
    CUSTOM_ANSWERS: 'autofill_custom_answers',
    SETTINGS: 'autofill_settings',
    FILL_HISTORY: 'autofill_fill_history',
} as const;

// Default settings
export interface ExtensionSettings {
    apiUrl: string;
    autoDetectForms: boolean;
    showNotifications: boolean;
    skipFilledFields: boolean;
    confidenceThreshold: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
    apiUrl: API_BASE_URL,
    autoDetectForms: true,
    showNotifications: true,
    skipFilledFields: true,
    confidenceThreshold: 0.5,
};
