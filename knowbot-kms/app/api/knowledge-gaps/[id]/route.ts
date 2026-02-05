import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isResolved, resolution } = body;

    if (typeof isResolved !== 'boolean') {
      return NextResponse.json({ error: 'isResolved is required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const updateData: {
      is_resolved: boolean;
      resolved_at?: string | null;
      resolved_by?: string | null;
      resolution_notes?: string | null;
    } = {
      is_resolved: isResolved,
    };

    if (isResolved) {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user.id;
      if (resolution) {
        updateData.resolution_notes = resolution;
      }
    } else {
      updateData.resolved_at = null;
      updateData.resolved_by = null;
      updateData.resolution_notes = null;
    }

    const { data, error } = await serviceClient
      .from('knowledge_gaps')
      .update(updateData)
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('[KnowledgeGaps] Update error:', error);
      return NextResponse.json({ error: 'Failed to update knowledge gap' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: data.id,
    });
  } catch (error) {
    console.error('[KnowledgeGaps] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from('knowledge_gaps')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[KnowledgeGaps] Query error:', error);
      return NextResponse.json({ error: 'Knowledge gap not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      gap: data,
    });
  } catch (error) {
    console.error('[KnowledgeGaps] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
