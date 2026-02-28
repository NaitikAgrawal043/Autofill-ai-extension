// ============================================================
// AutoFill AI — Shared Type Definitions
// ============================================================

// ---- User Profile Types ----

export interface UserProfile {
    // Personal
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    currentCity: string;
    currentState: string;
    country: string;
    pincode: string;
    address: string; // Permanent Address
    currentAddress: string;

    // Online Presence
    linkedinUrl: string;
    githubUrl: string;
    portfolioUrl: string;
    twitterUrl: string;

    // Education
    class10: Class10Education;
    class12: Class12Education;
    degree: DegreeEducation;
    additionalEducation: AdditionalEducation[];

    // Experience
    experience: Experience[];

    // Skills
    technicalSkills: string[];
    softSkills: string[];
    languages: Language[];

    // Documents
    resumeText: string;
    resumePdfBase64: string;
    resumePdfName: string;
    coverLetterTemplate: string;

    // Academic
    cgpa: string;
    percentage: string;
    backlogs: string;
    yearOfPassing: string;

    // Professional
    currentCTC: string;
    expectedCTC: string;
    noticePeriod: string;
    yearsOfExperience: string;
    preferredRole: string;
    preferredLocation: string[];

    // Custom fields (user-defined key-value pairs)
    customFields: Record<string, string>;

    // Metadata
    lastUpdated: string;
    version: number;
}

export interface Class10Education {
    schoolName: string;
    board: string;            // CBSE, ICSE, State Board, etc.
    yearOfPassing: string;
    percentage: string;
    cgpa: string;
    city: string;
    state: string;
}

export interface Class12Education {
    schoolName: string;
    board: string;
    stream: string;           // Science, Commerce, Arts
    yearOfPassing: string;
    percentage: string;
    cgpa: string;
    city: string;
    state: string;
}

export interface DegreeEducation {
    degree: string;           // B.Tech, B.Sc, BCA, etc.
    branch: string;           // Computer Science, Electronics, etc.
    institution: string;      // College name
    university: string;       // University name
    enrollmentNumber: string;
    startYear: string;
    endYear: string;
    cgpa: string;
    percentage: string;
    semester: string;         // Current semester for ongoing degrees
    backlogs: string;
    city: string;
    state: string;
}

export interface AdditionalEducation {
    title: string;         // e.g. "M.Tech", "Diploma", "Certification"
    field: string;         // e.g. "Data Science", "Web Development"
    institution: string;
    yearOfPassing: string;
    grade: string;         // CGPA or percentage
    description: string;   // Any extra details
}

export interface Experience {
    title: string;
    company: string;
    location: string;
    type: 'full-time' | 'part-time' | 'internship' | 'freelance';
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    skills: string[];
}

export interface Language {
    name: string;
    proficiency: 'native' | 'fluent' | 'intermediate' | 'beginner';
}

// ---- Form Field Types ----

export interface FormField {
    selector: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' |
    'radio' | 'checkbox' | 'textarea' | 'file' | 'url' | 'hidden' | 'password';
    options?: string[];
    currentValue?: string;
    required: boolean;
    context?: string;
    placeholder?: string;
}

// ---- Field Mapping Types ----

export interface FieldMapping {
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

export interface MatchResult {
    matched: FieldMapping[];
    unmatched: UnmatchedField[];
    overallConfidence: number;
}

export interface FillResult {
    selector: string;
    success: boolean;
    error?: string;
}

// ---- Autofill Status ----

export interface AutofillStatus {
    state: 'idle' | 'scraping' | 'matching' | 'filling' | 'done' | 'error';
    totalFields: number;
    filledFields: number;
    unmatchedFields: UnmatchedField[];
    error?: string;
}

// ---- Default Profile ----

export function createDefaultProfile(): UserProfile {
    return {
        firstName: '',
        lastName: '',
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        currentCity: '',
        currentState: '',
        country: '',
        pincode: '',
        address: '',
        currentAddress: '',
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
        twitterUrl: '',
        class10: { schoolName: '', board: '', yearOfPassing: '', percentage: '', cgpa: '', city: '', state: '' },
        class12: { schoolName: '', board: '', stream: '', yearOfPassing: '', percentage: '', cgpa: '', city: '', state: '' },
        degree: { degree: '', branch: '', institution: '', university: '', enrollmentNumber: '', startYear: '', endYear: '', cgpa: '', percentage: '', semester: '', backlogs: '', city: '', state: '' },
        additionalEducation: [],
        experience: [],
        technicalSkills: [],
        softSkills: [],
        languages: [],
        resumeText: '',
        resumePdfBase64: '',
        resumePdfName: '',
        coverLetterTemplate: '',
        cgpa: '',
        percentage: '',
        backlogs: '',
        yearOfPassing: '',
        currentCTC: '',
        expectedCTC: '',
        noticePeriod: '',
        yearsOfExperience: '',
        preferredRole: '',
        preferredLocation: [],
        customFields: {},
        lastUpdated: new Date().toISOString(),
        version: 1,
    };
}
