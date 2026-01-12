import { createServiceClient } from '@/utils/supabase/server';
import { exchangeCodeForTokens, getGoogleUserInfo, refreshAccessToken } from '@/lib/google-oauth';
import type { OAuth2Client } from 'google-auth-library';

/**
 * Server-side utilities for managing Google OAuth tokens in database
 */

export interface GoogleTokenData {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  expires_at: Date;
  scope?: string;
  google_user_id?: string;
  google_user_email?: string;
}

/**
 * Store OAuth tokens in database for a tenant
 * 
 * @param tenantId - Tenant ID
 * @param tokens - Token data from Google
 * @param userInfo - Optional Google user info
 * @returns Stored token record
 */
export async function storeGoogleTokens(
  tenantId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    scope?: string | string[] | null;
  },
  userInfo?: {
    id?: string | null;
    email?: string | null;
  }
): Promise<any> {
  const supabase = createServiceClient();

  if (!tokens.access_token) {
    throw new Error('access_token is required');
  }

  // Calculate expiry date
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000); // Default 1 hour

  const tokenData: GoogleTokenData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    token_type: 'Bearer',
    expires_at: expiresAt,
    scope: Array.isArray(tokens.scope) ? tokens.scope.join(' ') : tokens.scope || null,
    google_user_id: userInfo?.id || null,
    google_user_email: userInfo?.email || null,
  };

  // Upsert: Update if exists, insert if not
  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .upsert(
      {
        tenant_id: tenantId,
        ...tokenData,
        last_refreshed_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'tenant_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[Google OAuth] Failed to store tokens:', error);
    throw new Error(`Failed to store tokens: ${error.message}`);
  }

  return data;
}

/**
 * Get stored OAuth tokens for a tenant
 * 
 * @param tenantId - Tenant ID
 * @returns Token record or null
 */
export async function getGoogleTokens(tenantId: string): Promise<any | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('[Google OAuth] Failed to get tokens:', error);
    throw new Error(`Failed to get tokens: ${error.message}`);
  }

  return data;
}

/**
 * Check if tokens are expired and refresh if needed
 * 
 * @param tenantId - Tenant ID
 * @returns Valid token data
 */
export async function getValidGoogleTokens(tenantId: string): Promise<GoogleTokenData | null> {
  const tokens = await getGoogleTokens(tenantId);

  if (!tokens) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() < buffer) {
    // Token expired or about to expire, refresh it
    if (!tokens.refresh_token) {
      console.warn(`[Google OAuth] Token expired and no refresh token for tenant ${tenantId}`);
      return null;
    }

    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      const refreshed = await storeGoogleTokens(tenantId, newTokens);
      return refreshed;
    } catch (error) {
      console.error(`[Google OAuth] Failed to refresh token for tenant ${tenantId}:`, error);
      // Mark as inactive
      await deactivateGoogleTokens(tenantId);
      return null;
    }
  }

  return tokens;
}

/**
 * Deactivate OAuth tokens for a tenant
 * 
 * @param tenantId - Tenant ID
 */
export async function deactivateGoogleTokens(tenantId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('google_oauth_tokens')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[Google OAuth] Failed to deactivate tokens:', error);
    throw new Error(`Failed to deactivate tokens: ${error.message}`);
  }
}

/**
 * Delete OAuth tokens for a tenant
 * 
 * @param tenantId - Tenant ID
 */
export async function deleteGoogleTokens(tenantId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('google_oauth_tokens')
    .delete()
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[Google OAuth] Failed to delete tokens:', error);
    throw new Error(`Failed to delete tokens: ${error.message}`);
  }
}

/**
 * Get connection status for a tenant
 * 
 * @param tenantId - Tenant ID
 * @returns Connection status object
 */
export async function getGoogleConnectionStatus(tenantId: string): Promise<{
  connected: boolean;
  email?: string;
  expiresAt?: string;
  needsRefresh?: boolean;
}> {
  const tokens = await getGoogleTokens(tenantId);

  if (!tokens || !tokens.is_active) {
    return { connected: false };
  }

  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  const needsRefresh = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000; // 5 minutes

  return {
    connected: true,
    email: tokens.google_user_email,
    expiresAt: tokens.expires_at,
    needsRefresh,
  };
}
