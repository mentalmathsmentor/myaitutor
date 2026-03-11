const PATTERNS = {
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    phone: /\b(?:\+?61|0)\d(?:[\s-]?\d){8,}\b/g,
    student_id: /\b(?:student|student id|id)\s*[:#-]?\s*[A-Z0-9_-]{4,}\b/gi,
    street_address: /\b\d{1,5}\s+[A-Za-z0-9.'-]+\s+(?:street|st|road|rd|avenue|ave|drive|dr|close|cl|lane|ln|crescent|cres|court|ct)\b/gi,
    dob: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|date of birth[:\s]+\w+)\b/gi,
};

const REPLACEMENTS = {
    email: '[EMAIL]',
    phone: '[PHONE]',
    student_id: '[STUDENT_ID]',
    street_address: '[ADDRESS]',
    dob: '[DOB]',
};

export function scanForPII(text = '') {
    return Object.entries(PATTERNS).flatMap(([type, pattern]) => {
        const matcher = new RegExp(pattern.source, pattern.flags);
        const matches = [...text.matchAll(matcher)];
        return matches.map((match) => ({
            type,
            match: match[0],
        }));
    });
}

export function sanitizeForCloudQuery(text = '') {
    const findings = scanForPII(text);
    let sanitizedText = text;

    Object.entries(PATTERNS).forEach(([type, pattern]) => {
        const matcher = new RegExp(pattern.source, pattern.flags);
        sanitizedText = sanitizedText.replace(matcher, REPLACEMENTS[type]);
    });

    return {
        findings,
        sanitizedText: sanitizedText.trim(),
        wasSanitized: findings.length > 0 || sanitizedText.trim() !== text.trim(),
    };
}

export function formatPrivacyWarning(findings = []) {
    if (!findings.length) {
        return null;
    }

    const labels = [...new Set(findings.map((finding) => finding.type.replace('_', ' ')))];
    return `Privacy Airlock active. I scrubbed ${labels.join(', ')} before any cloud request.`;
}
