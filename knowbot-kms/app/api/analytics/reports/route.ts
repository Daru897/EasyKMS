import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { subDays, startOfDay } from 'date-fns';

interface ReportStats {
  totalQueries: number;
  queriesWithAnswers: number;
  queriesNoData: number;
  avgResponseTimeMs: number;
  topQueries: { query: string; count: number }[];
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

    let query = serviceClient
      .from('query_logs')
      .select('query_text, response_type, latency_ms, categories, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (channel !== 'all') {
      query = query.eq('channel', channel);
    }

    if (responseType !== 'all') {
      query = query.eq('response_type', responseType);
    }

    if (category) {
      query = query.contains('categories', [category]);
    }

    const { data: logs, error } = await query;
    if (error) {
      throw error;
    }

    const allQueries = (logs || []).map(log => ({
      text: log.query_text,
      hadAnswer: log.response_type === 'ANSWER',
      latency: log.latency_ms || 0,
    }));

    const queryCounts: Record<string, number> = {};
    allQueries.forEach(q => {
      const normalized = q.text.toLowerCase().trim();
      if (!normalized) return;
      queryCounts[normalized] = (queryCounts[normalized] || 0) + 1;
    });

    const topQueries = Object.entries(queryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalQueries = allQueries.length;
    const queriesWithAnswers = allQueries.filter(q => q.hadAnswer).length;
    const queriesNoData = allQueries.filter(q => !q.hadAnswer).length;
    const latencyValues = allQueries.map(q => q.latency).filter(v => v > 0);
    const avgResponseTimeMs = latencyValues.length > 0
      ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
      : 0;

    const stats: ReportStats = {
      totalQueries,
      queriesWithAnswers,
      queriesNoData,
      avgResponseTimeMs,
      topQueries,
    };

    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error('[Analytics Reports] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
