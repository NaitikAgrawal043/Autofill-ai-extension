// ============================================================
// AutoFill AI — Options Page: Master Profile Dashboard
// ============================================================

import { useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { MessageType } from '../shared/messages';
import { createDefaultProfile } from '../shared/types';
import type { UserProfile, Class10Education, Class12Education, DegreeEducation, AdditionalEducation, Experience, Language } from '../shared/types';
import './Options.css';

type Tab = 'personal' | 'education' | 'experience' | 'skills' | 'links' | 'resume' | 'custom' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'skills', label: 'Skills', icon: '⚡' },
    { id: 'links', label: 'Links', icon: '🔗' },
    { id: 'resume', label: 'Resume', icon: '📄' },
    { id: 'custom', label: 'Custom Q&A', icon: '💬' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Options() {
    const [activeTab, setActiveTab] = useState<Tab>('personal');
    const [profile, setProfile] = useState<UserProfile>(createDefaultProfile());
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [apiUrl, setApiUrl] = useState('http://localhost:3001/api');

    // Load profile on mount
    useEffect(() => {
        chrome.runtime.sendMessage({ type: MessageType.GET_PROFILE })
            .then((response) => {
                if (response?.success && response.profile) {
                    // Merge with defaults to handle missing fields from old profiles
                    const defaults = createDefaultProfile();
                    setProfile({
                        ...defaults,
                        ...response.profile,
                        // Ensure nested education objects are properly merged
                        class10: { ...defaults.class10, ...(response.profile.class10 || {}) },
                        class12: { ...defaults.class12, ...(response.profile.class12 || {}) },
                        degree: { ...defaults.degree, ...(response.profile.degree || {}) },
                        additionalEducation: response.profile.additionalEducation || [],
                    });
                }
            })
            .catch(console.error);
    }, []);

    // Update a profile field
    const updateField = useCallback((field: keyof UserProfile, value: any) => {
        setProfile(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    }, []);

    // Save profile
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            // Auto-generate fullName
            const updatedProfile = {
                ...profile,
                fullName: `${profile.firstName} ${profile.lastName}`.trim(),
                lastUpdated: new Date().toISOString(),
            };

            await chrome.runtime.sendMessage({
                type: MessageType.SAVE_PROFILE,
                data: updatedProfile,
            });

            setProfile(updatedProfile);
            setIsDirty(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setIsSaving(false);
        }
    }, [profile]);

    // ---- Education Helpers ----
    const updateClass10 = (field: keyof Class10Education, value: string) => {
        updateField('class10', { ...profile.class10, [field]: value });
    };

    const updateClass12 = (field: keyof Class12Education, value: string) => {
        updateField('class12', { ...profile.class12, [field]: value });
    };

    const updateDegree = (field: keyof DegreeEducation, value: string) => {
        updateField('degree', { ...profile.degree, [field]: value });
    };

    // ---- Additional Education Helpers ----
    const addAdditionalEducation = () => {
        const newEdu: AdditionalEducation = {
            title: '', field: '', institution: '', yearOfPassing: '', grade: '', description: '',
        };
        updateField('additionalEducation', [...(profile.additionalEducation || []), newEdu]);
    };

    const updateAdditionalEducation = (index: number, field: keyof AdditionalEducation, value: string) => {
        const updated = [...(profile.additionalEducation || [])];
        updated[index] = { ...updated[index], [field]: value };
        updateField('additionalEducation', updated);
    };

    const removeAdditionalEducation = (index: number) => {
        updateField('additionalEducation', (profile.additionalEducation || []).filter((_: any, i: number) => i !== index));
    };

    // ---- Resume PDF Handler ----
    const handleResumePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file.');
            return;
        }

        try {
            // Read settings to get the dynamic API url bounds
            const settingsResp = await chrome.storage.local.get('autofill_settings');
            const apiUrl = settingsResp?.autofill_settings?.apiUrl || 'http://localhost:3001/api';

            const formData = new FormData();
            formData.append('resume', file);

            const res = await fetch(`${apiUrl}/extract-pdf`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.success && data.text) {
                // Remove the raw base64 mapping completely! Just save the extracted text.
                updateField('resumePdfBase64', '');
                updateField('resumePdfName', file.name);

                // Keep existing text if wanted, or overwrite if requested. 
                // Mostly users want to just dump it.
                updateField('resumeText', data.text);

                alert('Success! Resume PDF successfully uploaded and text was extracted.');
            } else {
                alert('Warning: Server could not process the PDF. Ensure the backend is running.');
            }
        } catch (error) {
            console.error('PDF Upload Error:', error);
            alert('Error connecting to the backend server to parse your PDF.');
        }
    };

    const removeResumePdf = () => {
        updateField('resumePdfBase64', '');
        updateField('resumePdfName', '');
    };

    // ---- Experience Helpers ----
    const addExperience = () => {
        const newExp: Experience = {
            title: '', company: '', location: '', type: 'internship',
            startDate: '', endDate: '', current: false, description: '', skills: [],
        };
        updateField('experience', [...profile.experience, newExp]);
    };

    const updateExperience = (index: number, field: keyof Experience, value: any) => {
        const updated = [...profile.experience];
        updated[index] = { ...updated[index], [field]: value };
        updateField('experience', updated);
    };

    const removeExperience = (index: number) => {
        updateField('experience', profile.experience.filter((_, i) => i !== index));
    };

    // ---- Language Helpers ----
    const addLanguage = () => {
        updateField('languages', [...profile.languages, { name: '', proficiency: 'intermediate' as const }]);
    };

    const updateLanguage = (index: number, field: keyof Language, value: any) => {
        const updated = [...profile.languages];
        updated[index] = { ...updated[index], [field]: value };
        updateField('languages', updated);
    };

    const removeLanguage = (index: number) => {
        updateField('languages', profile.languages.filter((_, i) => i !== index));
    };

    // ---- Tags Input Handler ----
    const handleTagKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        field: 'technicalSkills' | 'softSkills' | 'preferredLocation'
    ) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const value = e.currentTarget.value.trim();
            if (value && !profile[field].includes(value)) {
                updateField(field, [...profile[field], value]);
                e.currentTarget.value = '';
            }
        }
    };

    const removeTag = (field: 'technicalSkills' | 'softSkills' | 'preferredLocation', index: number) => {
        updateField(field, profile[field].filter((_, i) => i !== index));
    };

    // ---- Custom Fields Helpers ----
    const addCustomField = () => {
        updateField('customFields', { ...profile.customFields, '': '' });
    };

    const updateCustomFieldKey = (oldKey: string, newKey: string) => {
        const entries = Object.entries(profile.customFields);
        const updated: Record<string, string> = {};
        for (const [k, v] of entries) {
            updated[k === oldKey ? newKey : k] = v;
        }
        updateField('customFields', updated);
    };

    const updateCustomFieldValue = (key: string, value: string) => {
        updateField('customFields', { ...profile.customFields, [key]: value });
    };

    const removeCustomField = (key: string) => {
        const { [key]: _, ...rest } = profile.customFields;
        updateField('customFields', rest);
    };

    // ---- Render Sections ----

    const renderPersonal = () => (
        <div className="section-card">
            <h2 className="section-title">
                <span className="section-title-icon">👤</span>
                Personal Information
            </h2>
            <p className="section-description">Basic personal details used in most application forms.</p>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={profile.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        placeholder="e.g. Naitik" />
                </div>
                <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={profile.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        placeholder="e.g. Agrawal" />
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={profile.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="you@example.com" />
                </div>
                <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" value={profile.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="+91-9876543210" />
                </div>
                <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input className="form-input" type="date" value={profile.dateOfBirth}
                        onChange={(e) => updateField('dateOfBirth', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={profile.gender}
                        onChange={(e) => updateField('gender', e.target.value)}>
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Nationality</label>
                    <input className="form-input" value={profile.nationality}
                        onChange={(e) => updateField('nationality', e.target.value)}
                        placeholder="e.g. Indian" />
                </div>
                <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input" value={profile.country}
                        onChange={(e) => updateField('country', e.target.value)}
                        placeholder="e.g. India" />
                </div>
                <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" value={profile.currentCity}
                        onChange={(e) => updateField('currentCity', e.target.value)}
                        placeholder="e.g. Delhi" />
                </div>
                <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-input" value={profile.currentState}
                        onChange={(e) => updateField('currentState', e.target.value)}
                        placeholder="e.g. Delhi" />
                </div>
                <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input className="form-input" value={profile.pincode}
                        onChange={(e) => updateField('pincode', e.target.value)}
                        placeholder="e.g. 110001" />
                </div>
                <div className="form-group full-width">
                    <label className="form-label">Permanent Full Address</label>
                    <textarea className="form-textarea" value={profile.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder="Your permanent complete address..."
                        rows={2} />
                </div>
                <div className="form-group full-width">
                    <label className="form-label">Current Full Address</label>
                    <textarea className="form-textarea" value={profile.currentAddress}
                        onChange={(e) => updateField('currentAddress', e.target.value)}
                        placeholder="Your current complete address..."
                        rows={2} />
                </div>
            </div>
        </div>
    );

    const renderEducation = () => (
        <>
            {/* ---- Class 10th Section ---- */}
            <div className="section-card">
                <h2 className="section-title">
                    <span className="section-title-icon">🏫</span>
                    Class 10th (Secondary)
                </h2>
                <p className="section-description">Your 10th standard / SSC / ICSE details.</p>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">School Name</label>
                        <input className="form-input" value={profile.class10.schoolName}
                            onChange={(e) => updateClass10('schoolName', e.target.value)}
                            placeholder="e.g. Delhi Public School" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Board</label>
                        <select className="form-select" value={profile.class10.board}
                            onChange={(e) => updateClass10('board', e.target.value)}>
                            <option value="">Select Board...</option>
                            <option value="CBSE">CBSE</option>
                            <option value="ICSE">ICSE</option>
                            <option value="State Board">State Board</option>
                            <option value="NIOS">NIOS</option>
                            <option value="IB">IB</option>
                            <option value="Cambridge">Cambridge (IGCSE)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Year of Passing</label>
                        <input className="form-input" value={profile.class10.yearOfPassing}
                            onChange={(e) => updateClass10('yearOfPassing', e.target.value)}
                            placeholder="e.g. 2020" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Percentage</label>
                        <input className="form-input" value={profile.class10.percentage}
                            onChange={(e) => updateClass10('percentage', e.target.value)}
                            placeholder="e.g. 92.5" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">CGPA (if applicable)</label>
                        <input className="form-input" value={profile.class10.cgpa}
                            onChange={(e) => updateClass10('cgpa', e.target.value)}
                            placeholder="e.g. 9.8" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">City</label>
                        <input className="form-input" value={profile.class10.city}
                            onChange={(e) => updateClass10('city', e.target.value)}
                            placeholder="e.g. Delhi" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">State</label>
                        <input className="form-input" value={profile.class10.state}
                            onChange={(e) => updateClass10('state', e.target.value)}
                            placeholder="e.g. Delhi" />
                    </div>
                </div>
            </div>

            {/* ---- Class 12th Section ---- */}
            <div className="section-card">
                <h2 className="section-title">
                    <span className="section-title-icon">📚</span>
                    Class 12th (Higher Secondary)
                </h2>
                <p className="section-description">Your 12th standard / HSC / ISC details.</p>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">School Name</label>
                        <input className="form-input" value={profile.class12.schoolName}
                            onChange={(e) => updateClass12('schoolName', e.target.value)}
                            placeholder="e.g. Delhi Public School" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Board</label>
                        <select className="form-select" value={profile.class12.board}
                            onChange={(e) => updateClass12('board', e.target.value)}>
                            <option value="">Select Board...</option>
                            <option value="CBSE">CBSE</option>
                            <option value="ICSE">ISC</option>
                            <option value="State Board">State Board</option>
                            <option value="NIOS">NIOS</option>
                            <option value="IB">IB</option>
                            <option value="Cambridge">Cambridge (A-Level)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Stream</label>
                        <select className="form-select" value={profile.class12.stream}
                            onChange={(e) => updateClass12('stream', e.target.value)}>
                            <option value="">Select Stream...</option>
                            <option value="Science (PCM)">Science (PCM)</option>
                            <option value="Science (PCB)">Science (PCB)</option>
                            <option value="Science (PCMB)">Science (PCMB)</option>
                            <option value="Commerce">Commerce</option>
                            <option value="Arts / Humanities">Arts / Humanities</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Year of Passing</label>
                        <input className="form-input" value={profile.class12.yearOfPassing}
                            onChange={(e) => updateClass12('yearOfPassing', e.target.value)}
                            placeholder="e.g. 2022" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Percentage</label>
                        <input className="form-input" value={profile.class12.percentage}
                            onChange={(e) => updateClass12('percentage', e.target.value)}
                            placeholder="e.g. 88.5" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">CGPA (if applicable)</label>
                        <input className="form-input" value={profile.class12.cgpa}
                            onChange={(e) => updateClass12('cgpa', e.target.value)}
                            placeholder="e.g. 9.2" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">City</label>
                        <input className="form-input" value={profile.class12.city}
                            onChange={(e) => updateClass12('city', e.target.value)}
                            placeholder="e.g. Delhi" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">State</label>
                        <input className="form-input" value={profile.class12.state}
                            onChange={(e) => updateClass12('state', e.target.value)}
                            placeholder="e.g. Delhi" />
                    </div>
                </div>
            </div>

            {/* ---- Degree / College Section ---- */}
            <div className="section-card">
                <h2 className="section-title">
                    <span className="section-title-icon">🎓</span>
                    Degree / College
                </h2>
                <p className="section-description">Your graduation / post-graduation details.</p>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Degree</label>
                        <select className="form-select" value={profile.degree.degree}
                            onChange={(e) => updateDegree('degree', e.target.value)}>
                            <option value="">Select Degree...</option>
                            <option value="B.Tech">B.Tech</option>
                            <option value="B.E.">B.E.</option>
                            <option value="B.Sc">B.Sc</option>
                            <option value="BCA">BCA</option>
                            <option value="B.Com">B.Com</option>
                            <option value="BBA">BBA</option>
                            <option value="BA">BA</option>
                            <option value="M.Tech">M.Tech</option>
                            <option value="M.Sc">M.Sc</option>
                            <option value="MCA">MCA</option>
                            <option value="MBA">MBA</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Branch / Specialization</label>
                        <input className="form-input" value={profile.degree.branch}
                            onChange={(e) => updateDegree('branch', e.target.value)}
                            placeholder="e.g. Computer Science & Engineering" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">College / Institution</label>
                        <input className="form-input" value={profile.degree.institution}
                            onChange={(e) => updateDegree('institution', e.target.value)}
                            placeholder="e.g. IIT Delhi" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">University</label>
                        <input className="form-input" value={profile.degree.university}
                            onChange={(e) => updateDegree('university', e.target.value)}
                            placeholder="e.g. University of Delhi" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Enrollment / Roll Number</label>
                        <input className="form-input" value={profile.degree.enrollmentNumber}
                            onChange={(e) => updateDegree('enrollmentNumber', e.target.value)}
                            placeholder="e.g. 2022BTCS001" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Start Year</label>
                        <input className="form-input" value={profile.degree.startYear}
                            onChange={(e) => updateDegree('startYear', e.target.value)}
                            placeholder="e.g. 2022" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">End Year (Expected)</label>
                        <input className="form-input" value={profile.degree.endYear}
                            onChange={(e) => updateDegree('endYear', e.target.value)}
                            placeholder="e.g. 2026" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">CGPA</label>
                        <input className="form-input" value={profile.degree.cgpa}
                            onChange={(e) => updateDegree('cgpa', e.target.value)}
                            placeholder="e.g. 8.5" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Percentage</label>
                        <input className="form-input" value={profile.degree.percentage}
                            onChange={(e) => updateDegree('percentage', e.target.value)}
                            placeholder="e.g. 82" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Current Semester / Trimester</label>
                        <input className="form-input" value={profile.degree.semester}
                            onChange={(e) => updateDegree('semester', e.target.value)}
                            placeholder="e.g. 6" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Active Backlogs</label>
                        <input className="form-input" value={profile.degree.backlogs}
                            onChange={(e) => updateDegree('backlogs', e.target.value)}
                            placeholder="e.g. 0" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">City</label>
                        <input className="form-input" value={profile.degree.city}
                            onChange={(e) => updateDegree('city', e.target.value)}
                            placeholder="e.g. Delhi" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">State</label>
                        <input className="form-input" value={profile.degree.state}
                            onChange={(e) => updateDegree('state', e.target.value)}
                            placeholder="e.g. Delhi" />
                    </div>
                </div>
            </div>

            {/* ---- Additional Education ---- */}
            <div className="section-card">
                <h2 className="section-title">
                    <span className="section-title-icon">📜</span>
                    Additional Education
                </h2>
                <p className="section-description">Post-graduation, diplomas, certifications, or any other qualifications.</p>

                {(profile.additionalEducation || []).map((edu: AdditionalEducation, i: number) => (
                    <div key={i} className="repeatable-item">
                        <div className="repeatable-header">
                            <span className="repeatable-title">Education #{i + 1}</span>
                            <button className="btn-remove" onClick={() => removeAdditionalEducation(i)}>✕ Remove</button>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Title / Degree</label>
                                <input className="form-input" value={edu.title}
                                    onChange={(e) => updateAdditionalEducation(i, 'title', e.target.value)}
                                    placeholder="e.g. M.Tech, Diploma, AWS Certification" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Field / Subject</label>
                                <input className="form-input" value={edu.field}
                                    onChange={(e) => updateAdditionalEducation(i, 'field', e.target.value)}
                                    placeholder="e.g. Data Science" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Institution</label>
                                <input className="form-input" value={edu.institution}
                                    onChange={(e) => updateAdditionalEducation(i, 'institution', e.target.value)}
                                    placeholder="e.g. Coursera, IIT Bombay" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Year of Passing</label>
                                <input className="form-input" value={edu.yearOfPassing}
                                    onChange={(e) => updateAdditionalEducation(i, 'yearOfPassing', e.target.value)}
                                    placeholder="e.g. 2025" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Grade / Score</label>
                                <input className="form-input" value={edu.grade}
                                    onChange={(e) => updateAdditionalEducation(i, 'grade', e.target.value)}
                                    placeholder="e.g. 9.0 CGPA or 90%" />
                            </div>
                            <div className="form-group full-width">
                                <label className="form-label">Description (optional)</label>
                                <textarea className="form-textarea" value={edu.description}
                                    onChange={(e) => updateAdditionalEducation(i, 'description', e.target.value)}
                                    placeholder="Any extra details about this qualification..."
                                    rows={2} />
                            </div>
                        </div>
                    </div>
                ))}
                <button className="btn-add" onClick={addAdditionalEducation}>
                    ➕ Add Education
                </button>
            </div>
        </>
    );

    const renderExperience = () => (
        <div className="section-card">
            <h2 className="section-title">
                <span className="section-title-icon">💼</span>
                Experience
            </h2>
            <p className="section-description">Internships, jobs, and freelance work. Most recent first.</p>

            <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group">
                    <label className="form-label">Years of Experience</label>
                    <input className="form-input" value={profile.yearsOfExperience}
                        onChange={(e) => updateField('yearsOfExperience', e.target.value)}
                        placeholder="e.g. 2" />
                </div>
                <div className="form-group">
                    <label className="form-label">Preferred Role</label>
                    <input className="form-input" value={profile.preferredRole}
                        onChange={(e) => updateField('preferredRole', e.target.value)}
                        placeholder="e.g. Full Stack Developer" />
                </div>
                <div className="form-group">
                    <label className="form-label">Current CTC</label>
                    <input className="form-input" value={profile.currentCTC}
                        onChange={(e) => updateField('currentCTC', e.target.value)}
                        placeholder="e.g. 10 LPA" />
                </div>
                <div className="form-group">
                    <label className="form-label">Expected CTC</label>
                    <input className="form-input" value={profile.expectedCTC}
                        onChange={(e) => updateField('expectedCTC', e.target.value)}
                        placeholder="e.g. 15 LPA" />
                </div>
                <div className="form-group">
                    <label className="form-label">Notice Period</label>
                    <input className="form-input" value={profile.noticePeriod}
                        onChange={(e) => updateField('noticePeriod', e.target.value)}
                        placeholder="e.g. 30 days" />
                </div>
                <div className="form-group">
                    <label className="form-label">Preferred Locations</label>
                    <div className="tags-container">
                        {profile.preferredLocation.map((loc, i) => (
                            <span key={i} className="tag">
                                {loc}
                                <button className="tag-remove" onClick={() => removeTag('preferredLocation', i)}>×</button>
                            </span>
                        ))}
                        <input className="tags-input" placeholder="Type & press Enter"
                            onKeyDown={(e) => handleTagKeyDown(e, 'preferredLocation')} />
                    </div>
                </div>
            </div>

            {profile.experience.map((exp, i) => (
                <div key={i} className="repeatable-item">
                    <div className="repeatable-header">
                        <span className="repeatable-title">Experience #{i + 1}</span>
                        <button className="btn-remove" onClick={() => removeExperience(i)}>✕ Remove</button>
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Job Title</label>
                            <input className="form-input" value={exp.title}
                                onChange={(e) => updateExperience(i, 'title', e.target.value)}
                                placeholder="e.g. Software Intern" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company</label>
                            <input className="form-input" value={exp.company}
                                onChange={(e) => updateExperience(i, 'company', e.target.value)}
                                placeholder="e.g. Google" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input className="form-input" value={exp.location}
                                onChange={(e) => updateExperience(i, 'location', e.target.value)}
                                placeholder="e.g. Bangalore" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" value={exp.type}
                                onChange={(e) => updateExperience(i, 'type', e.target.value as any)}>
                                <option value="internship">Internship</option>
                                <option value="full-time">Full-time</option>
                                <option value="part-time">Part-time</option>
                                <option value="freelance">Freelance</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input className="form-input" type="date" value={exp.startDate}
                                onChange={(e) => updateExperience(i, 'startDate', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input className="form-input" type="date" value={exp.endDate}
                                onChange={(e) => updateExperience(i, 'endDate', e.target.value)}
                                disabled={exp.current} />
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" value={exp.description}
                                onChange={(e) => updateExperience(i, 'description', e.target.value)}
                                placeholder="Describe your role, responsibilities, and achievements..."
                                rows={3} />
                        </div>
                    </div>
                </div>
            ))}
            <button className="btn-add" onClick={addExperience}>
                ➕ Add Experience
            </button>
        </div>
    );

    const renderSkills = () => (
        <div className="section-card">
            <h2 className="section-title">
                <span className="section-title-icon">⚡</span>
                Skills & Languages
            </h2>
            <p className="section-description">Type skills and press Enter to add them as tags.</p>

            <div className="form-grid">
                <div className="form-group full-width">
                    <label className="form-label">Technical Skills</label>
                    <div className="tags-container">
                        {profile.technicalSkills.map((skill, i) => (
                            <span key={i} className="tag">
                                {skill}
                                <button className="tag-remove" onClick={() => removeTag('technicalSkills', i)}>×</button>
                            </span>
                        ))}
                        <input className="tags-input" placeholder="e.g. React, TypeScript, Python..."
                            onKeyDown={(e) => handleTagKeyDown(e, 'technicalSkills')} />
                    </div>
                </div>

                <div className="form-group full-width">
                    <label className="form-label">Soft Skills</label>
                    <div className="tags-container">
                        {profile.softSkills.map((skill, i) => (
                            <span key={i} className="tag">
                                {skill}
                                <button className="tag-remove" onClick={() => removeTag('softSkills', i)}>×</button>
                            </span>
                        ))}
                        <input className="tags-input" placeholder="e.g. Leadership, Communication..."
                            onKeyDown={(e) => handleTagKeyDown(e, 'softSkills')} />
                    </div>
                </div>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '20px 0 12px', color: 'var(--text-secondary)' }}>
                Languages
            </h3>

            {profile.languages.map((lang, i) => (
                <div key={i} className="custom-field-row">
                    <div className="form-group">
                        <input className="form-input" value={lang.name}
                            onChange={(e) => updateLanguage(i, 'name', e.target.value)}
                            placeholder="e.g. English" />
                    </div>
                    <div className="form-group">
                        <select className="form-select" value={lang.proficiency}
                            onChange={(e) => updateLanguage(i, 'proficiency', e.target.value as any)}>
                            <option value="native">Native</option>
                            <option value="fluent">Fluent</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="beginner">Beginner</option>
                        </select>
                    </div>
                    <button className="btn-remove" onClick={() => removeLanguage(i)} style={{ marginBottom: 6 }}>✕</button>
                </div>
            ))}
            <button className="btn-add" onClick={addLanguage}>
                ➕ Add Language
            </button>
        </div>
    );

    const renderLinks = () => (
        <div className="section-card">
            <h2 className="section-title">
                <span className="section-title-icon">🔗</span>
                Online Profiles
            </h2>
            <p className="section-description">Your professional URLs. These are commonly asked in application forms.</p>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">LinkedIn URL</label>
                    <input className="form-input" type="url" value={profile.linkedinUrl}
                        onChange={(e) => updateField('linkedinUrl', e.target.value)}
                        placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="form-group">
                    <label className="form-label">GitHub URL</label>
                    <input className="form-input" type="url" value={profile.githubUrl}
                        onChange={(e) => updateField('githubUrl', e.target.value)}
                        placeholder="https://github.com/..." />
                </div>
                <div className="form-group">
                    <label className="form-label">Portfolio URL</label>
                    <input className="form-input" type="url" value={profile.portfolioUrl}
                        onChange={(e) => updateField('portfolioUrl', e.target.value)}
                        placeholder="https://yourportfolio.com" />
                </div>
                <div className="form-group">
                    <label className="form-label">Twitter / X URL</label>
                    <input className="form-input" type="url" value={profile.twitterUrl}
                        onChange={(e) => updateField('twitterUrl', e.target.value)}
                        placeholder="https://twitter.com/..." />
                </div>
            </div>
        </div>
    );

    const renderResume = () => (
        <div className="section-card">
            <h2 className="section-title">
                <span className="section-title-icon">📄</span>
                Resume & Cover Letter
            </h2>
            <p className="section-description">
                Upload your resume PDF or paste your resume text. The AI uses this to answer
                open-ended questions like "Tell us about yourself."
            </p>

            {/* PDF Upload */}
            <div style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Resume PDF</label>
                {profile.resumePdfName ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-sm)',
                    }}>
                        <span style={{ fontSize: 24 }}>📎</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                {profile.resumePdfName}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--success)' }}>✅ Uploaded</div>
                        </div>
                        <button className="btn-remove" onClick={removeResumePdf}>✕ Remove</button>
                    </div>
                ) : (
                    <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: '24px', border: '2px dashed var(--border-accent)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        background: 'var(--bg-secondary)', transition: 'var(--transition)',
                    }}>
                        <span style={{ fontSize: 32 }}>📤</span>
                        <span style={{ fontSize: 14, color: 'var(--accent-light)', fontWeight: 500 }}>
                            Click to upload PDF resume
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Max 5MB, PDF only</span>
                        <input type="file" accept=".pdf,application/pdf" onChange={handleResumePdfUpload}
                            style={{ display: 'none' }} />
                    </label>
                )}
            </div>

            <div className="form-grid">
                <div className="form-group full-width">
                    <label className="form-label">Resume Text (optional — paste if you prefer text over PDF)</label>
                    <textarea className="form-textarea" value={profile.resumeText}
                        onChange={(e) => updateField('resumeText', e.target.value)}
                        placeholder="Paste your complete resume text here. The AI will use this to generate answers for subjective questions..."
                        rows={10} />
                </div>
                <div className="form-group full-width">
                    <label className="form-label">Cover Letter Template (optional)</label>
                    <textarea className="form-textarea" value={profile.coverLetterTemplate}
                        onChange={(e) => updateField('coverLetterTemplate', e.target.value)}
                        placeholder="A generic cover letter template. Use {company} and {role} as placeholders..."
                        rows={6} />
                </div>
            </div>
        </div>
    );

    const renderCustom = () => (
        <div className="section-card">
            <h2 className="section-title">
                <span className="section-title-icon">💬</span>
                Custom Questions & Answers
            </h2>
            <p className="section-description">
                Pre-define answers to frequently asked questions. When the AI encounters these questions on a form,
                it will use your saved answers.
            </p>

            {Object.entries(profile.customFields).map(([key, value], i) => (
                <div key={i} className="custom-field-row">
                    <div className="form-group">
                        <label className="form-label">Question</label>
                        <input className="form-input" value={key}
                            onChange={(e) => updateCustomFieldKey(key, e.target.value)}
                            placeholder="e.g. Why do you want to join?" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Answer</label>
                        <input className="form-input" value={value}
                            onChange={(e) => updateCustomFieldValue(key, e.target.value)}
                            placeholder="Your answer..." />
                    </div>
                    <button className="btn-remove" onClick={() => removeCustomField(key)}
                        style={{ marginTop: 18 }}>✕</button>
                </div>
            ))}

            <button className="btn-add" onClick={addCustomField}>
                ➕ Add Custom Q&A
            </button>
        </div>
    );

    const renderSettings = () => (
        <div className="section-card">
            <h2 className="section-title">
                <span className="section-title-icon">⚙️</span>
                Extension Settings
            </h2>
            <p className="section-description">Configure how AutoFill AI works.</p>
            <div className="form-grid">
                <div className="form-group full-width">
                    <label className="form-label">Backend API URL</label>
                    <input className="form-input" value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="http://localhost:3001/api" />
                </div>
            </div>
        </div>
    );

    const tabContent: Record<Tab, () => React.JSX.Element> = {
        personal: renderPersonal,
        education: renderEducation,
        experience: renderExperience,
        skills: renderSkills,
        links: renderLinks,
        resume: renderResume,
        custom: renderCustom,
        settings: renderSettings,
    };

    return (
        <div className="options-container">
            {/* Header */}
            <header className="page-header">
                <div className="page-logo">⚡</div>
                <h1 className="page-title">AutoFill AI</h1>
                <p className="page-subtitle">Set up your master profile — fill once, apply everywhere</p>
            </header>

            {/* Navigation Tabs */}
            <nav className="nav-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="nav-tab-icon">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Active Tab Content */}
            {tabContent[activeTab]()}

            {/* Save Bar */}
            {isDirty && (
                <div className="save-bar">
                    <span className="save-status">
                        You have unsaved changes
                    </span>
                    <button className="btn-save" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : '💾 Save Profile'}
                    </button>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <div className="toast">
                    ✅ Profile saved successfully!
                </div>
            )}
        </div>
    );
}
