// ============================================================
// AutoFill AI — Popup Component
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { MessageType } from '../shared/messages';
import type { UnmatchedField } from '../shared/types';
import './Popup.css';

type Status = 'idle' | 'loading' | 'done' | 'error';

interface FillStats {
    filled: number;
    total: number;
    confidence: number;
    unmatched: UnmatchedField[];
}

export default function Popup() {
    const [status, setStatus] = useState<Status>('idle');
    const [hasProfile, setHasProfile] = useState<boolean | null>(null);
    const [stats, setStats] = useState<FillStats | null>(null);
    const [error, setError] = useState<string>('');
    const [unmatchedAnswers, setUnmatchedAnswers] = useState<Record<string, string>>({});

    // Check if profile exists on mount
    useEffect(() => {
        chrome.runtime.sendMessage({ type: MessageType.GET_PROFILE })
            .then((response) => {
                if (response?.success && response.profile?.firstName) {
                    setHasProfile(true);
                } else {
                    setHasProfile(false);
                }
            })
            .catch(() => setHasProfile(false));
    }, []);

    // Start autofill
    const handleAutofill = useCallback(async () => {
        setStatus('loading');
        setError('');
        setStats(null);

        try {
            const response = await chrome.runtime.sendMessage({
                type: MessageType.START_AUTOFILL,
            });

            if (response?.success) {
                setStatus('done');
                setStats({
                    filled: response.filled || 0,
                    total: response.total || 0,
                    confidence: response.confidence || 0,
                    unmatched: response.unmatched || [],
                });
            } else {
                setStatus('error');
                setError(response?.error || 'Something went wrong');
                if (response?.needsProfile) {
                    setHasProfile(false);
                }
            }
        } catch (err) {
            setStatus('error');
            setError((err as Error).message || 'Failed to connect to AutoFill AI');
        }
    }, []);

    // Submit answers for unmatched fields
    const handleSubmitUnmatched = useCallback(async () => {
        if (!stats?.unmatched.length) return;

        const answers = stats.unmatched
            .filter(f => unmatchedAnswers[f.selector]?.trim())
            .map(f => ({
                selector: f.selector,
                value: unmatchedAnswers[f.selector],
                type: f.type,
                label: f.label,
            }));

        if (answers.length === 0) return;

        try {
            await chrome.runtime.sendMessage({
                type: MessageType.FILL_UNMATCHED,
                data: answers,
            });

            // Update stats
            setStats(prev => prev ? {
                ...prev,
                filled: prev.filled + answers.length,
                unmatched: prev.unmatched.filter(f => !unmatchedAnswers[f.selector]?.trim()),
            } : null);
            setUnmatchedAnswers({});
        } catch (err) {
            setError('Failed to fill remaining fields');
        }
    }, [stats, unmatchedAnswers]);

    // Open options page
    const openOptions = () => {
        chrome.runtime.openOptionsPage();
    };

    const statusText = {
        idle: 'Ready to AutoFill',
        loading: 'Working...',
        done: 'AutoFill Complete!',
        error: 'AutoFill Failed',
    };

    const statusMessages: Record<Status, string> = {
        idle: 'Click the button below to detect form fields and auto-fill them with your profile data.',
        loading: 'Scanning page for form fields and matching them with your profile using AI...',
        done: `Successfully auto-filled your form fields.`,
        error: '',
    };

    return (
        <div className="popup-container">
            {/* ---- Header ---- */}
            <header className="popup-header">
                <div className="header-top">
                    <div className="logo">⚡</div>
                    <div className="header-text">
                        <h1>AutoFill AI</h1>
                        <p>Smart internship form filler</p>
                    </div>
                </div>
            </header>

            {/* ---- Content ---- */}
            <div className="popup-content">
                {/* Profile Warning */}
                {hasProfile === false && (
                    <div className="profile-warning">
                        <span className="profile-warning-icon">⚠️</span>
                        <div className="profile-warning-text">
                            You haven't set up your profile yet.{' '}
                            <a onClick={openOptions}>Click here</a> to add your details so AutoFill AI can work its magic.
                        </div>
                    </div>
                )}

                {/* Status Card */}
                <div className={`status-card ${status}`}>
                    <div className="status-header">
                        <div className={`status-dot ${status === 'loading' ? 'active' :
                            status === 'done' ? 'success' :
                                status === 'error' ? 'error' : 'idle'
                            }`} />
                        <span className="status-label">{statusText[status]}</span>
                    </div>
                    <p className="status-message">{statusMessages[status]}</p>
                    {error && <p className="error-text">{error}</p>}
                </div>

                {/* Stats */}
                {stats && status === 'done' && (
                    <div className="stats-row">
                        <div className="stat-item">
                            <div className="stat-value success">{stats.filled}</div>
                            <div className="stat-label">Filled</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total Fields</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value warning">{stats.unmatched.length}</div>
                            <div className="stat-label">Unmatched</div>
                        </div>
                    </div>
                )}

                {/* AutoFill Button */}
                <button
                    className={`btn-primary ${status === 'loading' ? 'loading' : ''}`}
                    onClick={handleAutofill}
                    disabled={status === 'loading'}
                >
                    {status === 'loading' ? (
                        <>
                            <div className="spinner" />
                            Analyzing Form...
                        </>
                    ) : status === 'done' ? (
                        <>
                            <span className="btn-icon">🔄</span>
                            Re-fill Form
                        </>
                    ) : (
                        <>
                            <span className="btn-icon">⚡</span>
                            AutoFill This Page
                        </>
                    )}
                </button>

                {/* Unmatched Fields */}
                {stats && stats.unmatched.length > 0 && (
                    <div className="unmatched-section">
                        <div className="unmatched-title">
                            <span>⚠️</span>
                            {stats.unmatched.length} field{stats.unmatched.length > 1 ? 's' : ''} need your input
                        </div>

                        {stats.unmatched.map((field, index) => (
                            <div key={index} className="unmatched-field">
                                <div className="unmatched-field-label">{field.label}</div>
                                <input
                                    className="unmatched-input"
                                    type="text"
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                    value={unmatchedAnswers[field.selector] || ''}
                                    onChange={(e) =>
                                        setUnmatchedAnswers(prev => ({
                                            ...prev,
                                            [field.selector]: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        ))}

                        <button className="btn-secondary" onClick={handleSubmitUnmatched}>
                            <span>✅</span>
                            Fill Remaining Fields
                        </button>
                    </div>
                )}
            </div>

            {/* ---- Footer ---- */}
            <div className="popup-footer">
                <button className="footer-link" onClick={openOptions}>
                    ⚙️ Settings & Profile
                </button>
                <span className="footer-link" style={{ cursor: 'default' }}>
                    v1.0.0
                </span>
            </div>
        </div>
    );
}
