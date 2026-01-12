import { google } from 'googleapis';

/**
 * Google OAuth Configuration
 * Uses OAuth 2.0 Authorization Code Flow
 */

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly', // Read-only access to Google Drive
];

export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google-oauth/callback`,
};

/**
 * Validate Google OAuth environment variables
 */
export function validateGoogleOAuthConfig(): void {
  if (!GOOGLE_OAUTH_CONFIG.clientId) {
    throw new Error(
      'GOOGLE_CLIENT_ID environment variable is not set. ' +
      'Please add it to your .env.local file.'
    );
  }

  if (!GOOGLE_OAUTH_CONFIG.clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_SECRET environment variable is not set. ' +
      'Please add it to your .env.local file.'
    );
  }
}

/**
 * Create OAuth2 client for Google
 */
export function createGoogleOAuth2Client() {
  validateGoogleOAuthConfig();

  return new google.auth.OAuth2(
    GOOGLE_OAUTH_CONFIG.clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    GOOGLE_OAUTH_CONFIG.redirectUri
  );
}

/**
 * Generate Google OAuth authorization URL
 * 
 * @param tenantId - Tenant ID to associate with this OAuth flow
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export function getGoogleAuthUrl(tenantId: string, state?: string): string {
  const oauth2Client = createGoogleOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh token
    scope: GOOGLE_OAUTH_SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
    state: state || tenantId, // Use tenant_id as state for security
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 * 
 * @param code - Authorization code from Google callback
 * @returns Token response with access_token, refresh_token, etc.
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createGoogleOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('[Google OAuth] Token exchange failed:', error);
    throw new Error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Refresh access token using refresh token
 * 
 * @param refreshToken - Refresh token from stored credentials
 * @returns New token response
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createGoogleOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('[Google OAuth] Token refresh failed:', error);
    throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get Google user info from access token
 * 
 * @param accessToken - Valid access token
 * @returns User info (email, id, etc.)
 */
export async function getGoogleUserInfo(accessToken: string) {
  const oauth2Client = createGoogleOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  } catch (error) {
    console.error('[Google OAuth] Failed to get user info:', error);
    throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create authenticated Google Drive client
 * 
 * @param accessToken - Valid access token
 * @param refreshToken - Optional refresh token for auto-refresh
 * @returns Authenticated Drive client
 */
export function createDriveClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = createGoogleOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Auto-refresh token if expired
  if (refreshToken) {
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // Refresh token might be rotated, update it
        console.log('[Google OAuth] Tokens refreshed');
      }
    });
  }

  return google.drive({ version: 'v3', auth: oauth2Client });
}
