/**
 * Markdown Chunking Utility
 * Splits documents into semantic chunks for vector embedding
 *
 * Strategy:
 * - Target: 512 tokens per chunk
 * - Max: 1024 tokens
 * - Overlap: 50 tokens between chunks
 * - Split by headers first, then paragraphs
 */

// Approximate tokens per character (conservative estimate for English text)
const CHARS_PER_TOKEN = 4;

// Chunking configuration
export const CHUNK_CONFIG = {
  targetTokens: 512,
  maxTokens: 1024,
  overlapTokens: 50,
  minChunkTokens: 50, // Don't create chunks smaller than this
};

export interface Chunk {
  index: number;
  text: string;
  tokenEstimate: number;
  startOffset: number;
  endOffset: number;
  metadata: {
    headingContext?: string;
    paragraphIndex?: number;
  };
}

/**
 * Estimate token count for text
 * Uses character-based estimation (conservative)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Convert token count to approximate character count
 */
function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN;
}

/**
 * Split markdown into chunks
 *
 * @param markdown - Markdown text to chunk
 * @returns Array of chunks with metadata
 */
export function chunkMarkdown(markdown: string): Chunk[] {
  if (!markdown || markdown.trim().length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];
  let currentOffset = 0;

  // Step 1: Split by headers to preserve semantic sections
  const sections = splitByHeaders(markdown);

  for (const section of sections) {
    const sectionChunks = chunkSection(
      section.content,
      section.heading,
      currentOffset,
      chunks.length
    );

    chunks.push(...sectionChunks);
    currentOffset += section.content.length;
  }

  return chunks;
}

/**
 * Split markdown by headers (h1-h4)
 */
function splitByHeaders(markdown: string): Array<{ heading: string; content: string }> {
  // Match headers: # through ####
  const headerRegex = /^(#{1,4})\s+(.+)$/gm;
  const sections: Array<{ heading: string; content: string }> = [];

  let lastIndex = 0;
  let lastHeading = '';
  let match;

  while ((match = headerRegex.exec(markdown)) !== null) {
    // Save previous section
    if (lastIndex < match.index) {
      const content = markdown.slice(lastIndex, match.index).trim();
      if (content.length > 0) {
        sections.push({ heading: lastHeading, content });
      }
    }

    lastHeading = match[2]; // Header text
    lastIndex = match.index + match[0].length;
  }

  // Don't forget the last section
  if (lastIndex < markdown.length) {
    const content = markdown.slice(lastIndex).trim();
    if (content.length > 0) {
      sections.push({ heading: lastHeading, content });
    }
  }

  // If no headers found, treat entire document as one section
  if (sections.length === 0) {
    sections.push({ heading: '', content: markdown.trim() });
  }

  return sections;
}

/**
 * Chunk a section of text
 */
function chunkSection(
  content: string,
  heading: string,
  startOffset: number,
  startIndex: number
): Chunk[] {
  const chunks: Chunk[] = [];
  const targetChars = tokensToChars(CHUNK_CONFIG.targetTokens);
  const maxChars = tokensToChars(CHUNK_CONFIG.maxTokens);
  const overlapChars = tokensToChars(CHUNK_CONFIG.overlapTokens);
  const minChars = tokensToChars(CHUNK_CONFIG.minChunkTokens);

  // If section fits in one chunk, return as-is
  if (content.length <= maxChars) {
    if (content.length >= minChars) {
      chunks.push({
        index: startIndex,
        text: content,
        tokenEstimate: estimateTokens(content),
        startOffset,
        endOffset: startOffset + content.length,
        metadata: {
          headingContext: heading || undefined,
          paragraphIndex: 0,
        },
      });
    }
    return chunks;
  }

  // Split by paragraphs (double newlines)
  const paragraphs = content.split(/\n\s*\n/);

  let currentChunk = '';
  let chunkStart = startOffset;
  let paragraphIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();

    if (paragraph.length === 0) continue;

    const potentialChunk = currentChunk
      ? currentChunk + '\n\n' + paragraph
      : paragraph;

    if (potentialChunk.length <= targetChars) {
      // Keep accumulating
      currentChunk = potentialChunk;
    } else if (potentialChunk.length <= maxChars) {
      // Close to target, might want to finalize
      if (currentChunk.length >= minChars) {
        // Current chunk is big enough, save it and start new
        chunks.push({
          index: startIndex + chunks.length,
          text: currentChunk,
          tokenEstimate: estimateTokens(currentChunk),
          startOffset: chunkStart,
          endOffset: chunkStart + currentChunk.length,
          metadata: {
            headingContext: heading || undefined,
            paragraphIndex,
          },
        });

        // Start new chunk with overlap
        const overlap = getOverlap(currentChunk, overlapChars);
        chunkStart = chunkStart + currentChunk.length - overlap.length;
        currentChunk = overlap + '\n\n' + paragraph;
        paragraphIndex++;
      } else {
        // Current chunk too small, keep adding
        currentChunk = potentialChunk;
      }
    } else {
      // Would exceed max, save current and handle large paragraph
      if (currentChunk.length >= minChars) {
        chunks.push({
          index: startIndex + chunks.length,
          text: currentChunk,
          tokenEstimate: estimateTokens(currentChunk),
          startOffset: chunkStart,
          endOffset: chunkStart + currentChunk.length,
          metadata: {
            headingContext: heading || undefined,
            paragraphIndex,
          },
        });
        paragraphIndex++;
      }

      // Handle the large paragraph by splitting it
      const overlap = currentChunk.length >= minChars
        ? getOverlap(currentChunk, overlapChars)
        : '';

      chunkStart = chunkStart + currentChunk.length - overlap.length;

      const paragraphChunks = splitLargeParagraph(
        overlap + (overlap ? '\n\n' : '') + paragraph,
        targetChars,
        maxChars,
        overlapChars
      );

      for (const pChunk of paragraphChunks) {
        chunks.push({
          index: startIndex + chunks.length,
          text: pChunk,
          tokenEstimate: estimateTokens(pChunk),
          startOffset: chunkStart,
          endOffset: chunkStart + pChunk.length,
          metadata: {
            headingContext: heading || undefined,
            paragraphIndex,
          },
        });
        chunkStart += pChunk.length - overlapChars;
      }

      currentChunk = getOverlap(paragraphChunks[paragraphChunks.length - 1], overlapChars);
      paragraphIndex++;
    }
  }

  // Don't forget remaining content
  if (currentChunk.length >= minChars) {
    chunks.push({
      index: startIndex + chunks.length,
      text: currentChunk,
      tokenEstimate: estimateTokens(currentChunk),
      startOffset: chunkStart,
      endOffset: chunkStart + currentChunk.length,
      metadata: {
        headingContext: heading || undefined,
        paragraphIndex,
      },
    });
  }

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlap(text: string, overlapChars: number): string {
  if (text.length <= overlapChars) {
    return text;
  }

  // Try to break at word boundary
  const end = text.slice(-overlapChars);
  const spaceIndex = end.indexOf(' ');

  if (spaceIndex > 0) {
    return end.slice(spaceIndex + 1);
  }

  return end;
}

/**
 * Split a large paragraph into smaller chunks
 * Tries to split at sentence boundaries
 */
function splitLargeParagraph(
  text: string,
  targetChars: number,
  maxChars: number,
  overlapChars: number
): string[] {
  const chunks: string[] = [];

  // Try splitting by sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if (currentChunk.length + trimmedSentence.length <= targetChars) {
      currentChunk = currentChunk
        ? currentChunk + ' ' + trimmedSentence
        : trimmedSentence;
    } else if (currentChunk.length + trimmedSentence.length <= maxChars) {
      currentChunk = currentChunk
        ? currentChunk + ' ' + trimmedSentence
        : trimmedSentence;
      chunks.push(currentChunk.trim());
      currentChunk = getOverlap(currentChunk, overlapChars);
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = getOverlap(currentChunk, overlapChars);
      }

      // Sentence is too long, split by words
      if (trimmedSentence.length > maxChars) {
        const wordChunks = splitByWords(trimmedSentence, targetChars, maxChars, overlapChars);
        chunks.push(...wordChunks);
        currentChunk = getOverlap(wordChunks[wordChunks.length - 1], overlapChars);
      } else {
        currentChunk = currentChunk
          ? currentChunk + ' ' + trimmedSentence
          : trimmedSentence;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Last resort: split by words
 */
function splitByWords(
  text: string,
  targetChars: number,
  maxChars: number,
  overlapChars: number
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const word of words) {
    if (currentChunk.length + word.length + 1 <= targetChars) {
      currentChunk = currentChunk ? currentChunk + ' ' + word : word;
    } else if (currentChunk.length + word.length + 1 <= maxChars) {
      currentChunk = currentChunk ? currentChunk + ' ' + word : word;
      chunks.push(currentChunk);
      currentChunk = getOverlap(currentChunk, overlapChars);
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = getOverlap(currentChunk, overlapChars) + ' ' + word;
      } else {
        currentChunk = word;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Create a summary of chunk statistics
 */
export function getChunkStats(chunks: Chunk[]): {
  totalChunks: number;
  totalTokens: number;
  avgTokensPerChunk: number;
  minTokens: number;
  maxTokens: number;
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      totalTokens: 0,
      avgTokensPerChunk: 0,
      minTokens: 0,
      maxTokens: 0,
    };
  }

  const tokens = chunks.map(c => c.tokenEstimate);
  const totalTokens = tokens.reduce((a, b) => a + b, 0);

  return {
    totalChunks: chunks.length,
    totalTokens,
    avgTokensPerChunk: Math.round(totalTokens / chunks.length),
    minTokens: Math.min(...tokens),
    maxTokens: Math.max(...tokens),
  };
}
