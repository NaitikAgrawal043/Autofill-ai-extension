// ============================================================
// AutoFill AI — Background: Storage Manager
// ============================================================

import { UserProfile, createDefaultProfile } from '../shared/types';
import { STORAGE_KEYS, ExtensionSettings, DEFAULT_SETTINGS } from '../shared/constants';

/**
 * Save user profile to chrome.storage.local.
 */
export async function saveProfile(profile: UserProfile): Promise<void> {
    profile.lastUpdated = new Date().toISOString();
    profile.fullName = `${profile.firstName} ${profile.lastName}`.trim();
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_PROFILE]: profile });
}

/**
 * Get user profile from chrome.storage.local.
 */
export async function getProfile(): Promise<UserProfile | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_PROFILE);
    return result[STORAGE_KEYS.USER_PROFILE] || null;
}

/**
 * Get or create user profile.
 */
export async function getOrCreateProfile(): Promise<UserProfile> {
    const profile = await getProfile();
    if (profile) return profile;
    const defaultProfile = createDefaultProfile();
    await saveProfile(defaultProfile);
    return defaultProfile;
}

/**
 * Save a custom answer for a field label.
 */
export async function saveCustomAnswer(fieldLabel: string, answer: string): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ANSWERS);
    const customAnswers: Record<string, string> = result[STORAGE_KEYS.CUSTOM_ANSWERS] || {};
    customAnswers[fieldLabel.toLowerCase().trim()] = answer;
    await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_ANSWERS]: customAnswers });
}

/**
 * Get all custom answers.
 */
export async function getCustomAnswers(): Promise<Record<string, string>> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ANSWERS);
    return result[STORAGE_KEYS.CUSTOM_ANSWERS] || {};
}

/**
 * Get extension settings.
 */
export async function getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * Save extension settings.
 */
export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await getSettings();
    await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: { ...current, ...settings },
    });
}
