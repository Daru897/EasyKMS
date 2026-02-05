import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { subDays, format, startOfDay } from 'date-fns';

type TrendMetric = 'queries' | 'answer_rate' | 'latency' | 'no_data';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30')));
    const metric = (searchParams.get('metric') || 'queries') as TrendMetric;
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
      .select('response_type, latency_ms, created_at, categories')
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

    const dateBuckets: Record<string, { total: number; answered: number; latencySum: number; latencyCount: number; noData: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dateBuckets[date] = { total: 0, answered: 0, latencySum: 0, latencyCount: 0, noData: 0 };
    }

    (logs || []).forEach((log) => {
      const date = format(new Date(log.created_at), 'yyyy-MM-dd');
      if (!dateBuckets[date]) return;
      dateBuckets[date].total += 1;
      if (log.response_type === 'ANSWER') {
        dateBuckets[date].answered += 1;
      } else {
        dateBuckets[date].noData += 1;
      }
      if (log.latency_ms && log.latency_ms > 0) {
        dateBuckets[date].latencySum += log.latency_ms;
        dateBuckets[date].latencyCount += 1;
      }
    });

    const trend = Object.entries(dateBuckets)
      .map(([date, bucket]) => {
        let value = 0;
        switch (metric) {
          case 'answer_rate':
            value = bucket.total > 0 ? Math.round((bucket.answered / bucket.total) * 100) : 0;
            break;
          case 'latency':
            value = bucket.latencyCount > 0 ? Math.round(bucket.latencySum / bucket.latencyCount) : 0;
            break;
          case 'no_data':
            value = bucket.noData;
            break;
          case 'queries':
          default:
            value = bucket.total;
            break;
        }
        return { date, value };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ success: true, metric, trend });
  } catch (error) {
    console.error('[Analytics Trends] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
