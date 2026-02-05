import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { subDays, startOfDay } from 'date-fns';

function toCsvRow(values: Array<string | number | null | undefined>): string {
  return values
    .map((value) => {
      if (value === null || value === undefined) return '';
      const raw = String(value);
      if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    })
    .join(',');
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
    const format = (searchParams.get('format') || 'json').toLowerCase();
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
      .select('query_text, response_type, confidence_score, latency_ms, sources_count, categories, channel, created_at')
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

    if (format === 'csv') {
      const header = [
        'query_text',
        'response_type',
        'confidence_score',
        'latency_ms',
        'sources_count',
        'categories',
        'channel',
        'created_at',
      ];
      const rows = (logs || []).map((log) => toCsvRow([
        log.query_text,
        log.response_type,
        log.confidence_score,
        log.latency_ms,
        log.sources_count,
        Array.isArray(log.categories) ? log.categories.join('|') : '',
        log.channel,
        log.created_at,
      ]));
      const csv = [toCsvRow(header), ...rows].join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${days}d.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (error) {
    console.error('[Analytics Exports] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
