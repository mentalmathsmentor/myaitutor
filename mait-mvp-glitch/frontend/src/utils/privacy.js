/**
 * Privacy Shield Utility
 * Scans text for PII (Personally Identifiable Information) before it leaves the browser.
 */

export const scanForPII = (text) => {
    // Regex Patterns
    const patterns = {
        mobile: /\b(?:04\d{2}[- ]?\d{3}[- ]?\d{3})\b/, // Australian Mobile
        email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
        creditCard: /\b(?:\d[ -]*?){13,16}\b/ // Basic Credit Card
    };

    if (patterns.mobile.test(text)) {
        return "Privacy Shield: PII detected (Mobile Number). Please remove it.";
    }

    if (patterns.email.test(text)) {
        return "Privacy Shield: PII detected (Email Address). Please remove it.";
    }

    if (patterns.creditCard.test(text)) {
        return "Privacy Shield: PII detected (Credit Card). Please remove it.";
    }

    return null; // No PII found
};
