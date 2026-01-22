/**
 * OpenAI Embedding Generation
 * Uses text-embedding-3-small model for generating embeddings
 */

import { getOpenAIClient, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, isOpenAIConfigured, getOpenAIStatus } from '@/lib/openai';

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  totalTokens: number;
}

/**
 * Generate embedding for a single text
 *
 * @param text - Text to embed
 * @returns Embedding vector and token count
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });

    const embedding = response.data[0].embedding;
    const tokenCount = response.usage?.total_tokens || 0;

    return {
      embedding,
      tokenCount,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('invalid_api_key') || error.message.includes('Incorrect API key')) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local');
      }
      if (error.message.includes('rate_limit')) {
        throw new Error('OpenAI rate limit exceeded. Please wait and try again.');
      }
    }
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI supports batching up to 2048 inputs
 *
 * @param texts - Array of texts to embed
 * @param batchSize - Maximum batch size (default: 100)
 * @returns Array of embeddings and total token count
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<BatchEmbeddingResult> {
  if (!texts || texts.length === 0) {
    return { embeddings: [], totalTokens: 0 };
  }

  // Filter out empty texts
  const validTexts = texts.map(t => t.trim()).filter(t => t.length > 0);

  if (validTexts.length === 0) {
    return { embeddings: [], totalTokens: 0 };
  }

  const client = getOpenAIClient();
  const allEmbeddings: number[][] = [];
  let totalTokens = 0;

  // Process in batches
  for (let i = 0; i < validTexts.length; i += batchSize) {
    const batch = validTexts.slice(i, i + batchSize);

    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      // Sort by index to maintain order
      const sortedData = response.data.sort((a, b) => a.index - b.index);
      const batchEmbeddings = sortedData.map(d => d.embedding);

      allEmbeddings.push(...batchEmbeddings);
      totalTokens += response.usage?.total_tokens || 0;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('invalid_api_key') || error.message.includes('Incorrect API key')) {
          throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local');
        }
        if (error.message.includes('rate_limit')) {
          // Simple backoff for rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          i -= batchSize; // Retry this batch
          continue;
        }
      }
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    embeddings: allEmbeddings,
    totalTokens,
  };
}

/**
 * Check if OpenAI is ready for embedding generation
 */
export function isEmbeddingServiceReady(): boolean {
  return isOpenAIConfigured();
}

/**
 * Get embedding service status
 */
export function getEmbeddingServiceStatus(): {
  ready: boolean;
  model: string;
  dimensions: number;
  message: string;
} {
  const status = getOpenAIStatus();

  return {
    ready: status.configured,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    message: status.message,
  };
}
