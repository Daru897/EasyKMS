import OpenAI from 'openai';

/**
 * OpenAI client configuration
 * Used for generating embeddings with text-embedding-3-small model
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Check if the API key is a placeholder or missing
 */
export function isOpenAIConfigured(): boolean {
  if (!OPENAI_API_KEY) {
    return false;
  }

  // Check for common placeholder patterns
  const placeholderPatterns = [
    'sk-placeholder',
    'sk-your-',
    'sk-proj-abcdef',
    'your-api-key',
    'replace-with',
  ];

  const keyLower = OPENAI_API_KEY.toLowerCase();
  return !placeholderPatterns.some(pattern => keyLower.includes(pattern.toLowerCase()));
}

/**
 * Get OpenAI configuration status for debugging
 */
export function getOpenAIStatus(): {
  configured: boolean;
  keyPresent: boolean;
  message: string;
} {
  if (!OPENAI_API_KEY) {
    return {
      configured: false,
      keyPresent: false,
      message: 'OPENAI_API_KEY environment variable is not set',
    };
  }

  if (!isOpenAIConfigured()) {
    return {
      configured: false,
      keyPresent: true,
      message: 'OPENAI_API_KEY appears to be a placeholder. Replace with a real API key from https://platform.openai.com/api-keys',
    };
  }

  return {
    configured: true,
    keyPresent: true,
    message: 'OpenAI is configured',
  };
}

/**
 * Create and export the OpenAI client
 * Will throw helpful errors when not properly configured
 */
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const status = getOpenAIStatus();

    if (!status.configured) {
      throw new Error(`OpenAI not configured: ${status.message}`);
    }

    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

/**
 * Constants for embedding operations
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Safe wrapper to get client, returns null if not configured
 * Useful for graceful degradation
 */
export function getOpenAIClientSafe(): OpenAI | null {
  try {
    return getOpenAIClient();
  } catch {
    return null;
  }
}
