import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { subDays, startOfDay } from 'date-fns';

interface InsightPayload {
  topNoDataQueries: { query: string; count: number }[];
  topAnsweredQueries: { query: string; count: number }[];
  trendingUpQueries: { query: string; delta: number }[];
  topCategories: { category: string; count: number }[];
}

function normalizeQuery(text: string): string {
  return text.toLowerCase().trim();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30')));
    const channel = searchParams.get('channel') || 'all';
    const responseType = searchParams.get('responseType') || 'all';
    const category = searchParams.get('category');

    let tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      const serviceClient = createServiceClient();
      const { data: tenants } = await serviceClient
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

    const serviceClient = createServiceClient();
    const startDate = startOfDay(subDays(new Date(), days));
    const previousStart = startOfDay(subDays(new Date(), days * 2));

    let baseQuery = serviceClient
      .from('query_logs')
      .select('query_text, response_type, categories, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', previousStart.toISOString())
      .order('created_at', { ascending: false });

    if (channel !== 'all') {
      baseQuery = baseQuery.eq('channel', channel);
    }

    if (responseType !== 'all') {
      baseQuery = baseQuery.eq('response_type', responseType);
    }

    if (category) {
      baseQuery = baseQuery.contains('categories', [category]);
    }

    const { data: logs, error } = await baseQuery;
    if (error) {
      throw error;
    }

    const currentLogs = (logs || []).filter((log) => new Date(log.created_at) >= startDate);
    const previousLogs = (logs || []).filter((log) => new Date(log.created_at) < startDate);

    const noDataCounts: Record<string, number> = {};
    const answeredCounts: Record<string, number> = {};
    const currentCounts: Record<string, number> = {};
    const previousCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    currentLogs.forEach((log) => {
      const normalized = normalizeQuery(log.query_text || '');
      if (normalized.length === 0) return;
      currentCounts[normalized] = (currentCounts[normalized] || 0) + 1;
      if (log.response_type === 'NO_DATA') {
        noDataCounts[normalized] = (noDataCounts[normalized] || 0) + 1;
      }
      if (log.response_type === 'ANSWER') {
        answeredCounts[normalized] = (answeredCounts[normalized] || 0) + 1;
      }

      const categories = Array.isArray(log.categories) ? log.categories : [];
      categories.forEach((cat) => {
        if (!cat) return;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    previousLogs.forEach((log) => {
      const normalized = normalizeQuery(log.query_text || '');
      if (normalized.length === 0) return;
      previousCounts[normalized] = (previousCounts[normalized] || 0) + 1;
    });

    const topNoDataQueries = Object.entries(noDataCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topAnsweredQueries = Object.entries(answeredCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const trendingUpQueries = Object.entries(currentCounts)
      .map(([query, count]) => ({
        query,
        delta: count - (previousCounts[query] || 0),
      }))
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5);

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const payload: InsightPayload = {
      topNoDataQueries,
      topAnsweredQueries,
      trendingUpQueries,
      topCategories,
    };

    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error('[Analytics Insights] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
