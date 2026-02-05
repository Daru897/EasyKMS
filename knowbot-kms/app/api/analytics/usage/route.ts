import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { subDays, format, startOfDay } from 'date-fns';

interface UsageStats {
  totalQueries: number;
  queriesWithAnswers: number;
  queriesNoData: number;
  avgResponseTimeMs: number;
  queryTrend: { date: string; count: number }[];
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
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '30')));

    // Get tenant ID
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

    const { data: logs, error: logsError } = await serviceClient
      .from('query_logs')
      .select('query_text, response_type, latency_ms, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('[Analytics] Query logs error:', logsError);
    }

    const allQueries = (logs || []).map(log => ({
      text: log.query_text,
      date: log.created_at,
      hadAnswer: log.response_type === 'ANSWER',
      latency: log.latency_ms || 0,
    }));

    // Count by date
    const dateCounts: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dateCounts[date] = 0;
    }

    allQueries.forEach(q => {
      const date = format(new Date(q.date), 'yyyy-MM-dd');
      if (dateCounts[date] !== undefined) {
        dateCounts[date]++;
      }
    });

    const queryTrend = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top queries
    const queryCounts: Record<string, number> = {};
    allQueries.forEach(q => {
      const normalized = q.text.toLowerCase().trim();
      queryCounts[normalized] = (queryCounts[normalized] || 0) + 1;
    });

    const topQueries = Object.entries(queryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate totals
    const totalQueries = allQueries.length;
    const queriesWithAnswers = allQueries.filter(q => q.hadAnswer).length;
    const queriesNoData = allQueries.filter(q => !q.hadAnswer).length;

    const latencyValues = allQueries.map(q => q.latency).filter(v => v > 0);
    const avgResponseTimeMs = latencyValues.length > 0
      ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
      : 0;

    const stats: UsageStats = {
      totalQueries,
      queriesWithAnswers,
      queriesNoData,
      avgResponseTimeMs,
      queryTrend,
      topQueries,
    };

    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
