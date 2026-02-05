import OpenAI from 'openai';

/**
 * OpenAI Embedding Generation Utility
 * Uses text-embedding-3-small model (1536 dimensions)
 */

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. ' +
        'Please add it to your .env.local file.'
      );
    }

    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

/**
 * Embedding model configuration
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const MAX_BATCH_SIZE = 2048; // OpenAI's max batch size

/**
 * Generate embedding for a single text
 *
 * @param text - Text to generate embedding for
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding generation');
  }

  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim(),
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batches
 * Handles rate limiting with exponential backoff
 *
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors in same order as input
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out empty texts and track indices
  const validTexts: { index: number; text: string }[] = [];
  texts.forEach((text, index) => {
    if (text && text.trim().length > 0) {
      validTexts.push({ index, text: text.trim() });
    }
  });

  if (validTexts.length === 0) {
    return texts.map(() => []);
  }

  const client = getOpenAIClient();
  const allEmbeddings: { index: number; embedding: number[] }[] = [];

  // Process in batches
  for (let i = 0; i < validTexts.length; i += MAX_BATCH_SIZE) {
    const batch = validTexts.slice(i, i + MAX_BATCH_SIZE);
    const batchTexts = batch.map(b => b.text);

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const response = await client.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batchTexts,
          dimensions: EMBEDDING_DIMENSIONS,
        });

        // Map embeddings back with original indices
        response.data.forEach((item, batchIndex) => {
          allEmbeddings.push({
            index: batch[batchIndex].index,
            embedding: item.embedding,
          });
        });

        break; // Success, exit retry loop
      } catch (error) {
        attempt++;

        if (error instanceof OpenAI.RateLimitError) {
          if (attempt < maxAttempts) {
            // Exponential backoff: 1s, 2s, 4s
            const waitTime = Math.pow(2, attempt - 1) * 1000;
            console.log(`[Embeddings] Rate limited. Waiting ${waitTime}ms before retry...`);
            await sleep(waitTime);
          } else {
            throw new Error(
              `Rate limit exceeded after ${maxAttempts} attempts. ` +
              'Please try again later or reduce batch size.'
            );
          }
        } else {
          throw error;
        }
      }
    }
  }

  // Sort by original index and extract embeddings
  allEmbeddings.sort((a, b) => a.index - b.index);

  // Build result array with empty arrays for filtered texts
  const result: number[][] = texts.map(() => []);
  allEmbeddings.forEach(({ index, embedding }) => {
    result[index] = embedding;
  });

  return result;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Useful for testing/debugging
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}
