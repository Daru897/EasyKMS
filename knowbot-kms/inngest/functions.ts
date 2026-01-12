import { inngest } from '@/lib/inngest';
import { getValidGoogleTokens } from '@/utils/google-oauth/server';
import { createDriveClient } from '@/lib/google-oauth';
import { createServiceClient } from '@/utils/supabase/server';
import type { drive_v3 } from 'googleapis';

/**
 * Inngest Functions for Google Drive Sync
 */

/**
 * Sync tenant's Google Drive folder
 * Polls for changes and triggers ingestion jobs
 * 
 * Runs on schedule (e.g., every 5 minutes) or manually triggered
 */
export const syncTenantDrive = inngest.createFunction(
  {
    id: 'sync-tenant-drive',
    name: 'Sync Tenant Google Drive',
    retries: 2,
  },
  { event: 'google-drive/sync.tenant' },
  async ({ event, step }) => {
    const { tenantId, folderId } = event.data;

    return await step.run('sync-drive-folder', async () => {
      // Get valid tokens
      const tokens = await getValidGoogleTokens(tenantId);
      if (!tokens) {
        throw new Error(`Google Drive not connected for tenant ${tenantId}`);
      }

      // Create Drive client
      const drive = createDriveClient(tokens.access_token, tokens.refresh_token || undefined);

      // Get tenant settings
      const supabase = createServiceClient();
      const { data: tenant } = await supabase
        .from('tenants')
        .select('settings, google_drive_folder_id')
        .eq('id', tenantId)
        .single();

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      const syncFolderId = folderId || tenant.google_drive_folder_id;
      if (!syncFolderId) {
        throw new Error(`No folder configured for tenant ${tenantId}`);
      }

      // Get allowed file types from settings
      const allowedTypes = tenant.settings?.allowed_file_types || [
        '.pdf',
        '.docx',
        '.doc',
        '.txt',
        '.md',
      ];

      // List files in folder
      const { data: files, error } = await drive.files.list({
        q: `'${syncFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, size, createdTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 100,
      });

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      const fileList = files.files || [];
      const changes: Array<{
        type: 'new' | 'updated' | 'deleted';
        file: drive_v3.Schema$File;
      }> = [];

      // Check each file against database
      for (const file of fileList) {
        if (!file.id || !file.name) continue;

        // Check if file type is allowed
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isAllowed = allowedTypes.some((ext: string) =>
          file.name.toLowerCase().endsWith(ext.toLowerCase())
        );

        if (!isAllowed) {
          continue; // Skip non-allowed file types
        }

        // Check if document exists in database
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('id, last_synced_at, current_version_id')
          .eq('tenant_id', tenantId)
          .eq('google_file_id', file.id)
          .single();

        if (!existingDoc) {
          // New file
          changes.push({ type: 'new', file });
        } else {
          // Check if file was modified
          const fileModifiedTime = file.modifiedTime
            ? new Date(file.modifiedTime).getTime()
            : 0;
          const lastSyncedTime = existingDoc.last_synced_at
            ? new Date(existingDoc.last_synced_at).getTime()
            : 0;

          if (fileModifiedTime > lastSyncedTime) {
            // File was updated
            changes.push({ type: 'updated', file });
          }
        }
      }

      // Check for deleted files (files in DB but not in Drive)
      const { data: dbFiles } = await supabase
        .from('documents')
        .select('id, google_file_id, title')
        .eq('tenant_id', tenantId)
        .eq('current_status', 'DRAFT');

      const driveFileIds = new Set(fileList.map((f) => f.id).filter(Boolean));
      for (const dbFile of dbFiles || []) {
        if (!driveFileIds.has(dbFile.google_file_id)) {
          // File deleted from Drive
          changes.push({
            type: 'deleted',
            file: {
              id: dbFile.google_file_id,
              name: dbFile.title,
            } as drive_v3.Schema$File,
          });
        }
      }

      // Log sync operation
      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        action: 'sync',
        status: 'success',
        details: {
          folder_id: syncFolderId,
          files_checked: fileList.length,
          changes_detected: changes.length,
          new_files: changes.filter((c) => c.type === 'new').length,
          updated_files: changes.filter((c) => c.type === 'updated').length,
          deleted_files: changes.filter((c) => c.type === 'deleted').length,
        },
      });

      // Trigger ingestion jobs for changes
      for (const change of changes) {
        if (!change.file.id) continue;

        if (change.type === 'new') {
          await inngest.send({
            name: 'google-drive/file.new',
            data: {
              tenantId,
              fileId: change.file.id,
              fileName: change.file.name || 'Unknown',
              mimeType: change.file.mimeType || '',
            },
          });
        } else if (change.type === 'updated') {
          await inngest.send({
            name: 'google-drive/file.updated',
            data: {
              tenantId,
              fileId: change.file.id,
              fileName: change.file.name || 'Unknown',
              mimeType: change.file.mimeType || '',
            },
          });
        } else if (change.type === 'deleted') {
          await inngest.send({
            name: 'google-drive/file.deleted',
            data: {
              tenantId,
              fileId: change.file.id,
            },
          });
        }
      }

      return {
        success: true,
        folderId: syncFolderId,
        filesChecked: fileList.length,
        changesDetected: changes.length,
        changes,
      };
    });
  }
);

/**
 * Handle new file detected in Google Drive
 * Triggers ingestion pipeline
 */
export const handleNewFile = inngest.createFunction(
  {
    id: 'handle-new-file',
    name: 'Handle New Google Drive File',
    retries: 3,
  },
  { event: 'google-drive/file.new' },
  async ({ event, step }) => {
    const { tenantId, fileId, fileName, mimeType } = event.data;

    return await step.run('process-new-file', async () => {
      // Log the new file detection
      const supabase = createServiceClient();
      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        document_id: null,
        action: 'create',
        status: 'started',
        details: {
          file_id: fileId,
          file_name: fileName,
          mime_type: mimeType,
        },
      });

      // Trigger ingestion job
      await inngest.send({
        name: 'document/ingest',
        data: {
          tenantId,
          fileId,
          documentId: '', // Will be created during ingestion
        },
      });

      return {
        success: true,
        fileId,
        fileName,
        message: 'New file ingestion triggered',
      };
    });
  }
);

/**
 * Handle updated file in Google Drive
 * Triggers re-versioning job
 */
export const handleUpdatedFile = inngest.createFunction(
  {
    id: 'handle-updated-file',
    name: 'Handle Updated Google Drive File',
    retries: 3,
  },
  { event: 'google-drive/file.updated' },
  async ({ event, step }) => {
    const { tenantId, fileId, fileName, mimeType } = event.data;

    return await step.run('process-updated-file', async () => {
      const supabase = createServiceClient();

      // Find existing document
      const { data: document } = await supabase
        .from('documents')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('google_file_id', fileId)
        .single();

      if (!document) {
        // Treat as new file if not found
        await inngest.send({
          name: 'google-drive/file.new',
          data: {
            tenantId,
            fileId,
            fileName,
            mimeType,
          },
        });
        return {
          success: true,
          message: 'File not found, treating as new file',
        };
      }

      // Log the update
      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        document_id: document.id,
        action: 'update',
        status: 'started',
        details: {
          file_id: fileId,
          file_name: fileName,
          mime_type: mimeType,
        },
      });

      // Trigger re-ingestion (will create new version)
      await inngest.send({
        name: 'document/ingest',
        data: {
          tenantId,
          fileId,
          documentId: document.id,
        },
      });

      return {
        success: true,
        documentId: document.id,
        fileId,
        message: 'File update processing triggered',
      };
    });
  }
);

/**
 * Handle deleted file in Google Drive
 * Archives the document
 */
export const handleDeletedFile = inngest.createFunction(
  {
    id: 'handle-deleted-file',
    name: 'Handle Deleted Google Drive File',
    retries: 1,
  },
  { event: 'google-drive/file.deleted' },
  async ({ event, step }) => {
    const { tenantId, fileId } = event.data;

    return await step.run('process-deleted-file', async () => {
      const supabase = createServiceClient();

      // Find document
      const { data: document } = await supabase
        .from('documents')
        .select('id, current_status')
        .eq('tenant_id', tenantId)
        .eq('google_file_id', fileId)
        .single();

      if (!document) {
        return {
          success: true,
          message: 'Document not found, nothing to archive',
        };
      }

      // Archive the document
      await supabase
        .from('documents')
        .update({
          current_status: 'ARCHIVED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);

      // Archive current version if LIVE
      if (document.current_status === 'LIVE') {
        await supabase
          .from('document_versions')
          .update({
            status: 'ARCHIVED',
            updated_at: new Date().toISOString(),
          })
          .eq('document_id', document.id)
          .eq('status', 'LIVE');
      }

      // Log the deletion
      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        document_id: document.id,
        action: 'delete',
        status: 'success',
        details: {
          file_id: fileId,
          previous_status: document.current_status,
        },
      });

      return {
        success: true,
        documentId: document.id,
        message: 'Document archived',
      };
    });
  }
);
