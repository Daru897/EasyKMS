import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { syncTenantDrive, handleNewFile, handleUpdatedFile, handleDeletedFile } from '@/inngest/functions';
import { periodicSync } from '@/inngest/scheduled';
import { ingestDocument } from '@/inngest/ingestion';

/**
 * Inngest serve endpoint
 * This endpoint is used by Inngest to trigger functions
 * 
 * GET/POST /api/inngest
 */
export const { GET, POST } = serve({
  client: inngest,
  functions: [
    // Sync functions
    syncTenantDrive,
    handleNewFile,
    handleUpdatedFile,
    handleDeletedFile,
    // Scheduled functions
    periodicSync,
    // Ingestion functions
    ingestDocument,
  ],
});
