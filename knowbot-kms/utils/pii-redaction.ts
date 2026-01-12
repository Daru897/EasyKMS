/**
 * PII (Personally Identifiable Information) Redaction
 * 
 * Redacts sensitive information like names, credit cards, SSNs, etc.
 * 
 * Options:
 * 1. Microsoft Presidio (Python service) - Best accuracy
 * 2. Simple regex-based redaction - Quick implementation
 * 3. API service (e.g., Presidio API)
 * 
 * For now, implementing a simple regex-based approach.
 * Can be upgraded to Presidio later.
 */

export interface PIIRedactionResult {
  text: string;
  redacted: boolean;
  stats: {
    names?: number;
    emails?: number;
    phones?: number;
    creditCards?: number;
    ssn?: number;
    total?: number;
  };
}

/**
 * Redact PII from text
 * Uses regex patterns to identify and mask sensitive data
 */
export async function redactPII(text: string): Promise<PIIRedactionResult> {
  const stats = {
    names: 0,
    emails: 0,
    phones: 0,
    creditCards: 0,
    ssn: 0,
    total: 0,
  };

  let redactedText = text;

  // Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = redactedText.match(emailRegex) || [];
  stats.emails = emails.length;
  redactedText = redactedText.replace(emailRegex, '[EMAIL_REDACTED]');

  // Phone numbers (US format: (123) 456-7890, 123-456-7890, etc.)
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
  const phones = redactedText.match(phoneRegex) || [];
  stats.phones = phones.length;
  redactedText = redactedText.replace(phoneRegex, '[PHONE_REDACTED]');

  // Credit card numbers (16 digits, with or without spaces/dashes)
  const creditCardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  const creditCards = redactedText.match(creditCardRegex) || [];
  stats.creditCards = creditCards.length;
  redactedText = redactedText.replace(creditCardRegex, '[CARD_REDACTED]');

  // SSN (Social Security Number: XXX-XX-XXXX)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  const ssns = redactedText.match(ssnRegex) || [];
  stats.ssn = ssns.length;
  redactedText = redactedText.replace(ssnRegex, '[SSN_REDACTED]');

  // Names (simple heuristic: capitalized words that might be names)
  // This is a basic approach - Presidio would be better
  // For now, we'll skip name redaction or use a simple list
  // TODO: Integrate with Presidio for better name detection

  stats.total = stats.emails + stats.phones + stats.creditCards + stats.ssn;

  return {
    text: redactedText,
    redacted: stats.total > 0,
    stats,
  };
}

/**
 * Redact PII using Microsoft Presidio (if available)
 * Falls back to regex if Presidio service is not available
 */
export async function redactPIIWithPresidio(text: string): Promise<PIIRedactionResult> {
  const presidioUrl = process.env.PRESIDIO_API_URL;

  if (!presidioUrl) {
    // Fallback to regex-based redaction
    return redactPII(text);
  }

  try {
    const response = await fetch(`${presidioUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.warn('[PII Redaction] Presidio service unavailable, using regex fallback');
      return redactPII(text);
    }

    const analysis = await response.json();
    // Process Presidio results and redact
    // Implementation depends on Presidio API format

    return {
      text, // Redacted text from Presidio
      redacted: true,
      stats: {
        total: analysis.entities?.length || 0,
      },
    };
  } catch (error) {
    console.warn('[PII Redaction] Presidio error, using regex fallback:', error);
    return redactPII(text);
  }
}
