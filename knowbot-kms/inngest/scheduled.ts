import { inngest } from '@/lib/inngest';

/**
 * Scheduled Inngest Functions
 * These run automatically on a schedule
 */

/**
 * Periodic sync job for all active tenants
 * Runs every 5 minutes (configurable per tenant)
 */
export const periodicSync = inngest.createFunction(
  {
    id: 'periodic-sync-all-tenants',
    name: 'Periodic Sync All Tenants',
    retries: 0, // Don't retry scheduled jobs
  },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    return await step.run('sync-all-tenants', async () => {
      const { createServiceClient } = await import('@/utils/supabase/server');
      const supabase = createServiceClient();

      // Get all active tenants with Google Drive connected
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, google_drive_folder_id, settings')
        .eq('is_active', true)
        .not('google_drive_folder_id', 'is', null);

      if (error) {
        console.error('[Periodic Sync] Failed to fetch tenants:', error);
        return { success: false, error: error.message };
      }

      if (!tenants || tenants.length === 0) {
        return { success: true, message: 'No tenants to sync', count: 0 };
      }

      // Trigger sync for each tenant
      const syncPromises = tenants.map((tenant) =>
        inngest.send({
          name: 'google-drive/sync.tenant',
          data: {
            tenantId: tenant.id,
            folderId: tenant.google_drive_folder_id,
          },
        })
      );

      await Promise.all(syncPromises);

      return {
        success: true,
        tenantsSynced: tenants.length,
        tenants,
      };
    });
  }
);
