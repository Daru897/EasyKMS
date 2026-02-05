import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

type FeedbackRating = 'helpful' | 'not_helpful';

interface FeedbackRequest {
  queryText: string;
  answerText?: string;
  rating: FeedbackRating;
  issue?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as FeedbackRequest;

    // Validate request
    if (!body.queryText?.trim()) {
      return NextResponse.json({ error: 'Query text is required' }, { status: 400 });
    }

    if (!body.rating || !['helpful', 'not_helpful'].includes(body.rating)) {
      return NextResponse.json({ error: 'Valid rating is required (helpful or not_helpful)' }, { status: 400 });
    }

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

    // Insert feedback
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('agent_feedback')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        query_text: body.queryText.trim(),
        answer_text: body.answerText?.trim() || null,
        rating: body.rating,
        issue_description: body.issue?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Feedback] Insert error:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      feedbackId: data.id,
    });
  } catch (error) {
    console.error('[Feedback] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const rating = searchParams.get('rating') as FeedbackRating | null;

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
    let query = serviceClient
      .from('agent_feedback')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (rating) {
      query = query.eq('rating', rating);
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Feedback] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      feedback: data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('[Feedback] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
