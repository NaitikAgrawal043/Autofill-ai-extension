// ============================================================
// AutoFill AI — Server: AI Prompt Templates
// ============================================================

export function buildMatchFieldsPrompt(
  profile: any,
  fields: any[],
  customAnswers: Record<string, string>
): string {
  // SECURITY/OPTIMIZATION: Strip massive Base64 strings, and also strip raw resume text 
  // from basic field matching context so the AI doesn't hallucinate a cover letter in a random box.
  const cleanProfile = { ...profile };
  delete cleanProfile.resumePdfBase64;
  delete cleanProfile.resumeText;

  return `You are an expert form-filling assistant. Your job is to match a user's profile data to web form fields from a job/internship application.

## USER PROFILE:
${JSON.stringify(cleanProfile, null, 2)}

## CUSTOM ANSWERS (User-provided answers to common questions):
${JSON.stringify(customAnswers, null, 2)}

## FORM FIELDS TO FILL:
${JSON.stringify(fields.map(f => ({
    selector: f.selector,
    label: f.label,
    type: f.type,
    options: f.options,
    required: f.required,
    context: f.context,
    placeholder: f.placeholder,
  })), null, 2)}

## YOUR TASK:
For each form field, determine the best matching value from the user's profile.

## RULES:
1. Match fields semantically — "Full Name" should concatenate firstName + " " + lastName.
2. For "Name" fields without "first" or "last" qualifier, use the full name.
3. For SELECT fields, you MUST pick EXACTLY from the available options list. Choose the closest match from the provided options.
4. For RADIO fields, match the value to the closest option from the list.
5. For CHECKBOX fields, return "true" or "false".
6. For DATE fields, return dates in YYYY-MM-DD format.
7. For subjective open-ended TEXTAREA questions (like "Why do you want to join?"), first check customAnswers. If no custom answer exists, briefly answer it based on the profile. Keep generated answers under 50 words.
8. NEVER hallucinate or write generic text. If you do not have the specific factual data in the profile or customAnswers to answer ANY field, you MUST mark it as unmatched. DO NOT GUESS. DO NOT WRITE FILLER TEXT. Keep it strictly blank if you don't know the exact answer.
9. If you truly cannot determine a value, mark it as unmatched with a clear reason.
10. For each match, provide a confidence score from 0.0 to 1.0.
11. For email fields, use the email from profile.
12. For phone/mobile fields, use the phone from profile.
13. For LinkedIn/GitHub/portfolio URL fields, use the corresponding URL from the profile.
14. For CGPA/GPA fields, use the cgpa or the most recent education grade.
15. For skills-related fields, join technicalSkills with commas.
16. For address or location fields, if "current" or "present" is specified, use 'currentAddress' or combine 'currentCity' and 'currentState'. Otherwise, use 'address' or combine 'city' and 'state' from profile.
17. For semester/trimester/term questions, use the semester from the degree object.
18. For "current company" or "employer", use the most recent experience company name. If no work experience exists, use the current university institution name.

## OUTPUT FORMAT (strict JSON, no markdown):
{
  "matched": [
    {
      "selector": "<field's CSS selector>",
      "value": "<the value to fill>",
      "type": "<field type>",
      "confidence": <0.0-1.0>,
      "source": "<which profile field was used>"
    }
  ],
  "unmatched": [
    {
      "selector": "<field's CSS selector>",
      "label": "<field label>",
      "type": "<field type>",
      "reason": "<why it couldn't be matched>"
    }
  ]
}

Return ONLY the JSON object. No markdown code fences, no explanation text, no backticks.`;
}
