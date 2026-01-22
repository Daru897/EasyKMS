/**
 * Text Chunking Utility
 * Splits text into overlapping chunks for embedding generation
 */

export interface ChunkOptions {
  /**
   * Maximum number of characters per chunk
   * Default: 800
   */
  chunkSize?: number;

  /**
   * Number of characters to overlap between chunks
   * Default: 200
   */
  overlapSize?: number;

  /**
   * Minimum chunk size to keep (avoids tiny trailing chunks)
   * Default: 100
   */
  minChunkSize?: number;
}

export interface TextChunk {
  /**
   * The text content of this chunk
   */
  text: string;

  /**
   * Zero-based index of this chunk
   */
  index: number;

  /**
   * Starting character position in original text
   */
  startChar: number;

  /**
   * Ending character position in original text
   */
  endChar: number;
}

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP_SIZE = 200;
const DEFAULT_MIN_CHUNK_SIZE = 100;

/**
 * Split text into overlapping chunks
 *
 * @param text - The text to split
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlapSize = DEFAULT_OVERLAP_SIZE,
    minChunkSize = DEFAULT_MIN_CHUNK_SIZE,
  } = options;

  // Validate options
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be positive');
  }
  if (overlapSize < 0) {
    throw new Error('overlapSize cannot be negative');
  }
  if (overlapSize >= chunkSize) {
    throw new Error('overlapSize must be less than chunkSize');
  }

  // Normalize whitespace and trim
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  // Handle empty or very short text
  if (!normalizedText || normalizedText.length === 0) {
    return [];
  }

  if (normalizedText.length <= chunkSize) {
    return [{
      text: normalizedText,
      index: 0,
      startChar: 0,
      endChar: normalizedText.length,
    }];
  }

  const chunks: TextChunk[] = [];
  const step = chunkSize - overlapSize;
  let position = 0;
  let index = 0;

  while (position < normalizedText.length) {
    let endPosition = Math.min(position + chunkSize, normalizedText.length);

    // Try to break at word boundary
    if (endPosition < normalizedText.length) {
      const lastSpace = normalizedText.lastIndexOf(' ', endPosition);
      if (lastSpace > position + chunkSize * 0.5) {
        // Only break at word boundary if we don't lose too much text
        endPosition = lastSpace;
      }
    }

    const chunkText = normalizedText.slice(position, endPosition).trim();

    // Skip if chunk is too small (unless it's the last chunk)
    if (chunkText.length >= minChunkSize || position + step >= normalizedText.length) {
      chunks.push({
        text: chunkText,
        index,
        startChar: position,
        endChar: endPosition,
      });
      index++;
    }

    position += step;

    // Avoid infinite loop for edge cases
    if (position >= normalizedText.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Calculate estimated token count for text
 * Rough estimate: ~4 characters per token for English text
 *
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total estimated tokens for an array of chunks
 *
 * @param chunks - Array of text chunks
 * @returns Total estimated token count
 */
export function estimateTotalTokens(chunks: TextChunk[]): number {
  return chunks.reduce((total, chunk) => total + estimateTokenCount(chunk.text), 0);
}
