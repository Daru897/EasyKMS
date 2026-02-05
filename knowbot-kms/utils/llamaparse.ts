/**
 * LlamaParse Integration
 * Converts documents (PDF, DOCX) to structured Markdown
 * Preserves tables, formatting, and structure
 * 
 * LlamaParse API: https://docs.llamaindex.ai/en/stable/module_guides/loading/connector/llamaparse/
 */

export interface ParseResult {
  markdown: string;
  metadata: {
    parser: string;
    wordCount: number;
    pageCount?: number;
    hasTables?: boolean;
    hasImages?: boolean;
  };
}

/**
 * Parse document using LlamaParse
 * Falls back to simple text extraction if LlamaParse is unavailable
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  options: {
    redactedText?: string;
  } = {}
): Promise<ParseResult> {
  const llamaparseApiKey = process.env.LLAMAPARSE_API_KEY;
  const llamaparseApiUrl = process.env.LLAMAPARSE_API_URL || 'https://api.cloud.llamaindex.ai/api/parsing';

  // For text files, return as-is
  if (mimeType?.includes('text') || mimeType === 'text/plain') {
    const text = options.redactedText || buffer.toString('utf-8');
    return {
      markdown: text,
      metadata: {
        parser: 'text',
        wordCount: text.split(/\s+/).length,
      },
    };
  }

  // For Markdown files
  if (mimeType === 'text/markdown' || mimeType === 'application/x-markdown') {
    const text = options.redactedText || buffer.toString('utf-8');
    return {
      markdown: text,
      metadata: {
        parser: 'markdown',
        wordCount: text.split(/\s+/).length,
      },
    };
  }

  // Use LlamaParse for PDF/DOCX
  if (!llamaparseApiKey) {
    console.warn('[LlamaParse] API key not set, using fallback extraction');
    return fallbackParse(buffer, mimeType);
  }

  try {
    // Upload file to LlamaParse
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, 'document.pdf');

    const uploadResponse = await fetch(`${llamaparseApiUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${llamaparseApiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`LlamaParse upload failed: ${uploadResponse.statusText}`);
    }

    const uploadData = (await uploadResponse.json()) as { id?: string };
    const jobId = uploadData.id;

    if (!jobId) {
      throw new Error('LlamaParse upload did not return a job id');
    }

    // Poll for parsing result
    let result: { status?: string; error?: string } | null = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(`${llamaparseApiUrl}/job/${jobId}`, {
        headers: {
          Authorization: `Bearer ${llamaparseApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`LlamaParse status check failed: ${statusResponse.statusText}`);
      }

      result = (await statusResponse.json()) as { status?: string; error?: string };

      if (result.status === 'success') {
        break;
      }

      if (result.status === 'error') {
        throw new Error(`LlamaParse parsing failed: ${result.error}`);
      }

      attempts++;
    }

    if (!result || result.status !== 'success') {
      throw new Error('LlamaParse parsing timeout');
    }

    // Get parsed content
    const contentResponse = await fetch(`${llamaparseApiUrl}/job/${jobId}/result`, {
      headers: {
        Authorization: `Bearer ${llamaparseApiKey}`,
      },
    });

    if (!contentResponse.ok) {
      throw new Error(`Failed to get LlamaParse result: ${contentResponse.statusText}`);
    }

    const content = (await contentResponse.json()) as {
      markdown?: string;
      text?: string;
      pages?: number;
      images?: unknown[];
    };
    const markdown = content.markdown || content.text || '';

    return {
      markdown,
      metadata: {
        parser: 'llamaparse',
        wordCount: markdown.split(/\s+/).length,
        pageCount: content.pages,
        hasTables: markdown.includes('|'), // Simple table detection
        hasImages: (content.images?.length || 0) > 0,
      },
    };
  } catch (error) {
    console.error('[LlamaParse] Error:', error);
    console.warn('[LlamaParse] Falling back to simple extraction');
    return fallbackParse(buffer, mimeType);
  }
}

/**
 * Fallback parsing for when LlamaParse is unavailable
 * Simple text extraction (limited quality)
 */
async function fallbackParse(buffer: Buffer, mimeType: string): Promise<ParseResult> {
  let text = '';

  if (mimeType === 'application/pdf') {
    // For PDF, we'd need a PDF parser library
    // For now, return a placeholder
    text = '[PDF content - LlamaParse required for proper extraction]';
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    // For DOCX/DOC, we'd need a DOCX parser
    // For now, return a placeholder
    text = '[DOCX content - LlamaParse required for proper extraction]';
  } else {
    // Try to extract as text
    text = buffer.toString('utf-8');
  }

  return {
    markdown: text,
    metadata: {
      parser: 'fallback',
      wordCount: text.split(/\s+/).length,
    },
  };
}
