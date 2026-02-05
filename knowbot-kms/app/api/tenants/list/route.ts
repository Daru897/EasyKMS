import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/tenants/list
 * List all tenants (for testing/selection)
 * In production, filter by user's access
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all active tenants
    // TODO: Filter by user's tenant access in production
    const serviceClient = createClient();
    const { data: tenants, error } = await serviceClient
      .from('tenants')
      .select('id, name, slug, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      tenants: tenants || [],
    });

  } catch (error) {
    console.error('[Tenants List] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
