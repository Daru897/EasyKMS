# Google Drive OAuth Connector

This module implements the Google Drive OAuth integration for connecting tenant Google Drive accounts and selecting folders for document syncing.

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/google-oauth/callback` (development)
     - `https://yourdomain.com/api/google-oauth/callback` (production)
   - Save the **Client ID** and **Client Secret**

### 2. Environment Variables

Add to your `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-oauth/callback

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run the SQL migration:

```sql
-- Run supabase/Google_OAuth.sql
```

This creates the `google_oauth_tokens` table for storing OAuth tokens.

## Architecture

### OAuth Flow

1. **User clicks "Connect Google Drive"**
   - Redirects to `/api/google-oauth/authorize?tenantId=<uuid>`
   - Generates OAuth URL with tenant_id in state
   - Redirects user to Google consent screen

2. **Google redirects back**
   - Callback: `/api/google-oauth/callback?code=...&state=...`
   - Validates state (CSRF protection)
   - Exchanges code for tokens
   - Gets user info from Google
   - Stores tokens in database

3. **Token Management**
   - Tokens stored per tenant in `google_oauth_tokens` table
   - Auto-refresh when expired
   - Secure storage (encrypt in production)

### API Routes

#### `GET /api/google-oauth/authorize?tenantId=<uuid>`
Initiates OAuth flow. Redirects to Google.

#### `GET /api/google-oauth/callback?code=...&state=...`
Handles OAuth callback. Stores tokens and redirects to dashboard.

#### `GET /api/google-oauth/status?tenantId=<uuid>`
Get connection status for a tenant.

#### `POST /api/google-oauth/disconnect`
Body: `{ tenantId: string }`
Disconnects Google Drive for a tenant.

#### `GET /api/google-drive/folders?tenantId=<uuid>`
List folders from Google Drive for selection.

#### `POST /api/google-drive/set-folder`
Body: `{ tenantId: string, folderId: string }`
Set the folder ID for syncing.

## Usage

### In Your Components

```tsx
import GoogleDriveConnector from '@/components/GoogleDriveConnector';
import FolderSelector from '@/components/FolderSelector';

export default function AdminSettings() {
  const tenantId = 'your-tenant-id';

  return (
    <div>
      <h2>Google Drive Integration</h2>
      
      {/* Connect/Disconnect Button */}
      <GoogleDriveConnector
        tenantId={tenantId}
        onConnected={() => console.log('Connected!')}
        onDisconnected={() => console.log('Disconnected!')}
      />

      {/* Folder Selection (only show if connected) */}
      <FolderSelector
        tenantId={tenantId}
        currentFolderId={null}
        onFolderSelected={(folderId) => {
          console.log('Folder selected:', folderId);
        }}
      />
    </div>
  );
}
```

## Security

### Token Storage

- Tokens stored in `google_oauth_tokens` table
- Row Level Security (RLS) enabled
- Only tenant admins/managers can manage tokens
- **Production**: Encrypt tokens before storing (use Supabase Vault or similar)

### CSRF Protection

- State parameter includes tenant_id + timestamp + random
- Stored in httpOnly cookie
- Validated in callback

### Access Control

- All API routes require authentication
- Verify user has permission for tenant (TODO: implement role check)
- RLS policies enforce tenant isolation

## Token Refresh

Tokens are automatically refreshed when:
- Token expires (with 5-minute buffer)
- `getValidGoogleTokens()` is called
- Refresh token is available

If refresh fails, tokens are marked as inactive.

## Error Handling

Common errors:

- **"Google Drive not connected"**: User needs to connect first
- **"Token expired"**: Auto-refresh should handle this
- **"State mismatch"**: CSRF protection triggered (retry)
- **"Folder not found"**: Invalid folder ID or access denied

## Next Steps

1. **Encrypt tokens in production** (use Supabase Vault)
2. **Implement role-based access control** (verify admin/manager)
3. **Add webhook setup** for real-time sync (Stage 3 - Watcher)
4. **Add sync status dashboard** (Stage 6 - Admin View)

## Testing

### Manual Test Flow

1. Start dev server: `npm run dev`
2. Navigate to dashboard with tenant ID
3. Click "Connect Google Drive"
4. Complete OAuth flow
5. Select a folder
6. Verify tokens stored in database
7. Test disconnect

### Test OAuth Status

```bash
curl "http://localhost:3000/api/google-oauth/status?tenantId=<uuid>"
```

### Test Folder List

```bash
curl "http://localhost:3000/api/google-drive/folders?tenantId=<uuid>"
```

## Troubleshooting

### "Failed to initiate Google OAuth"
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Verify redirect URI matches Google Cloud Console

### "State mismatch"
- Clear cookies and try again
- Check cookie settings (httpOnly, secure, sameSite)

### "Token expired"
- Check refresh token is stored
- Verify token refresh logic
- Check Google API quota

### "Folder not found"
- Verify folder ID is correct
- Check user has access to folder
- Ensure Google Drive API is enabled

## Production Checklist

- [ ] Encrypt tokens before storing
- [ ] Set up proper redirect URIs in Google Cloud
- [ ] Enable RLS policies
- [ ] Add rate limiting
- [ ] Add logging/monitoring
- [ ] Test token refresh flow
- [ ] Set up error alerts
