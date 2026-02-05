import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/utils/embeddings';
import { queryVectors } from '@/utils/pinecone/server';
import { chunkMarkdown } from '@/utils/chunking';

const DEFAULT_TOP_K = 10;
const DEFAULT_MIN_SCORE = 0.75;
const SEMANTIC_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;
const MAX_CONTEXT_CHARS = 12000;

type QueryRequest = {
  query: string;
  asOf?: string;
  topK?: number;
  minScore?: number;
};

type SourceResult = {
  document_id: string;
  document_version_id: string;
  document_title: string;
  chunk_index: number;
  chunk_text: string;
  score: number;
  effective_date?: string | null;
  categories?: string[];
};

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

function normalizeScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
}

function toEpochMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function buildContext(sources: SourceResult[]): string {
  let context = '';
  for (const source of sources) {
    const block = [
      `Document: ${source.document_title}`,
      `Version: ${source.document_version_id}`,
      `Chunk: ${source.chunk_index}`,
      `Content: ${source.chunk_text}`,
    ].join('\n');
    if (context.length + block.length + 2 > MAX_CONTEXT_CHARS) {
      break;
    }
    context += (context ? '\n\n' : '') + block;
  }
  return context;
}

function buildCitationList(sources: SourceResult[]): string {
  return sources
    .map((source, index) => `[${index + 1}] ${source.document_title} (v${source.document_version_id}, chunk ${source.chunk_index})`)
    .join('\n');
}

async function generateAnswer(query: string, sources: SourceResult[]): Promise<string> {
  const client = getOpenAIClient();
  const context = buildContext(sources);
  const citations = buildCitationList(sources);

  const systemPrompt = [
    'You are a strict knowledge assistant for a BPO knowledge base.',
    'Use ONLY the provided context to answer.',
    'If the context does not contain the answer, respond with "NO_DATA".',
    'Provide concise responses and include citations in the format [1], [2] referencing the provided list.',
  ].join(' ');

  const userPrompt = [
    `Question: ${query}`,
    '',
    'Context:',
    context || '(no context)',
    '',
    'Citations:',
    citations || '(no sources)',
  ].join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('LLM returned empty response');
  }
  return content;
}

function computeChunkKeywordScores(query: string, markdown: string): Array<{ chunk_index: number; chunk_text: string; score: number }> {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 1);

  if (tokens.length === 0) return [];

  const chunks = chunkMarkdown(markdown);
  return chunks.map(chunk => {
    const haystack = chunk.text.toLowerCase();
    let matches = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) matches += 1;
    }
    const score = matches / tokens.length;
    return {
      chunk_index: chunk.index,
      chunk_text: chunk.text,
      score,
    };
  });
}

export async function POST(request: NextRequest) {
  const timings = {
    embeddingMs: 0,
    semanticMs: 0,
    keywordMs: 0,
    llmMs: 0,
    totalMs: 0,
  };
  const startedAt = Date.now();
  let tenantId: string | undefined;
  let responseType: 'ANSWER' | 'NO_DATA' = 'NO_DATA';
  let topScore = 0;
  let mergedResults: SourceResult[] = [];

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as QueryRequest;
    const query = body?.query?.trim();
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const topK = body.topK && body.topK > 0 ? body.topK : DEFAULT_TOP_K;
    const minScore = body.minScore && body.minScore > 0 ? body.minScore : DEFAULT_MIN_SCORE;
    const asOfEpoch = toEpochMs(body.asOf);

    tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      tenantId = tenants?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const embeddingStart = Date.now();
    const queryVector = await generateEmbedding(query);
    timings.embeddingMs = Date.now() - embeddingStart;

    const semanticStart = Date.now();
    const semanticFilter: Record<string, unknown> = {
      document_status: { $eq: 'LIVE' },
    };
    if (asOfEpoch) {
      semanticFilter.effective_date_epoch = { $lte: asOfEpoch };
    }

    const semanticResponse = await queryVectors(tenantId, queryVector, {
      topK,
      includeMetadata: true,
      filter: semanticFilter,
    });
    timings.semanticMs = Date.now() - semanticStart;

    const semanticMatches = (semanticResponse.matches || [])
      .filter(match => match?.metadata?.document_status === 'LIVE')
      .filter(match => {
        if (!asOfEpoch) return true;
        const candidate = typeof match.metadata?.effective_date_epoch === 'number'
          ? match.metadata?.effective_date_epoch
          : null;
        return candidate ? candidate <= asOfEpoch : true;
      })
      .map(match => ({
        document_id: match.metadata?.document_id as string,
        document_version_id: match.metadata?.document_version_id as string,
        document_title: (match.metadata?.document_title as string) || 'Untitled',
        chunk_index: Number(match.metadata?.chunk_index || 0),
        chunk_text: (match.metadata?.chunk_text as string) || '',
        score: normalizeScore(match.score || 0),
        effective_date: (match.metadata?.effective_date as string) || null,
        categories: (match.metadata?.categories as string[]) || [],
      }))
      .slice(0, topK);

    const keywordStart = Date.now();
    const serviceClient = createServiceClient();
    const keywordMatches: SourceResult[] = [];

    const { data: keywordDocs, error: keywordError } = await serviceClient
      .from('document_versions')
      .select(`
        id,
        parsed_markdown,
        effective_date,
        approved_at,
        created_at,
        documents!document_versions_document_id_fkey (
          id,
          title,
          tenant_id
        )
      `)
      .eq('status', 'LIVE')
      .eq('documents.tenant_id', tenantId)
      .textSearch('search_vector', query, { type: 'websearch' })
      .limit(topK);

    if (keywordError) {
      console.error('[Query] Keyword search error:', keywordError);
    }

    if (keywordDocs && keywordDocs.length > 0) {
      for (const doc of keywordDocs) {
        const markdown = doc.parsed_markdown || '';
        if (!markdown) continue;
        const chunkScores = computeChunkKeywordScores(query, markdown)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        const documentTitle = Array.isArray(doc.documents)
          ? doc.documents[0]?.title
          : doc.documents?.title;
        const documentId = Array.isArray(doc.documents)
          ? doc.documents[0]?.id
          : doc.documents?.id;

        for (const chunk of chunkScores) {
          keywordMatches.push({
            document_id: documentId,
            document_version_id: doc.id,
            document_title: documentTitle || 'Untitled',
            chunk_index: chunk.chunk_index,
            chunk_text: chunk.chunk_text,
            score: normalizeScore(chunk.score),
            effective_date: doc.effective_date,
          });
        }
      }
    }
    timings.keywordMs = Date.now() - keywordStart;

    const mergedMap = new Map<string, SourceResult>();
    for (const match of semanticMatches) {
      const key = `${match.document_version_id}:${match.chunk_index}`;
      mergedMap.set(key, match);
    }
    for (const match of keywordMatches) {
      const key = `${match.document_version_id}:${match.chunk_index}`;
      const existing = mergedMap.get(key);
      if (!existing) {
        mergedMap.set(key, match);
      } else {
        const blended = normalizeScore(existing.score * SEMANTIC_WEIGHT + match.score * KEYWORD_WEIGHT);
        mergedMap.set(key, { ...existing, score: blended });
      }
    }

    mergedResults = Array.from(mergedMap.values())
      .map(item => ({
        ...item,
        score: normalizeScore(item.score),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    topScore = mergedResults[0]?.score || 0;

    let answer: string | undefined;

    if (topScore >= minScore) {
      const llmStart = Date.now();
      const llmAnswer = await generateAnswer(query, mergedResults);
      timings.llmMs = Date.now() - llmStart;

      if (llmAnswer.trim().toUpperCase() !== 'NO_DATA') {
        answer = llmAnswer;
        responseType = 'ANSWER';
      }
    }

    if (responseType === 'NO_DATA') {
      const gapContext = {
        asOf: body.asOf || null,
        minScore,
        topScore,
      };

      await serviceClient.from('knowledge_gaps').insert({
        tenant_id: tenantId,
        query_text: query,
        query_context: JSON.stringify(gapContext),
        agent_id: user.id,
        confidence_score: topScore,
      });
    }

    timings.totalMs = Date.now() - startedAt;

    try {
      const categorySet = new Set<string>();
      for (const source of mergedResults) {
        (source.categories || []).forEach((category) => {
          if (category) categorySet.add(category);
        });
      }
      await serviceClient.from('query_logs').insert({
        tenant_id: tenantId,
        user_id: user.id,
        query_text: query,
        response_type: responseType,
        confidence_score: topScore,
        latency_ms: timings.totalMs,
        sources_count: mergedResults.length,
        categories: Array.from(categorySet),
        channel: 'api',
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[Query] Failed to log query:', logError);
    }

    return NextResponse.json({
      type: responseType,
      answer,
      confidence: topScore,
      sources: mergedResults,
      retrieval: {
        semanticCount: semanticMatches.length,
        keywordCount: keywordMatches.length,
        mergedCount: mergedResults.length,
      },
      timings,
    });
  } catch (error) {
    console.error('[Query] Error:', error);
    timings.totalMs = Date.now() - startedAt;
    if (tenantId && request) {
      try {
        const supabase = createServiceClient();
        await supabase.from('query_logs').insert({
          tenant_id: tenantId,
          query_text: 'unknown',
          response_type: 'NO_DATA',
          confidence_score: 0,
          latency_ms: timings.totalMs,
          sources_count: 0,
          channel: 'api',
          created_at: new Date().toISOString(),
        });
      } catch {
        // Swallow logging errors during failures
      }
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timings,
      },
      { status: 500 }
    );
  }
}
