import { Inngest } from 'inngest';

/**
 * Inngest client for background job processing
 * Handles Google Drive sync, document ingestion, and other async tasks
 */

export const inngest = new Inngest({
  id: 'knowbot-kms',
  name: 'Knowbot KMS',
});

/**
 * Event types for Inngest
 */
export const Events = {
  // Google Drive Sync Events
  'google-drive/sync.tenant': {
    name: 'google-drive/sync.tenant',
    data: {
      tenantId: 'string',
      folderId: 'string',
    },
  },
  'google-drive/file.new': {
    name: 'google-drive/file.new',
    data: {
      tenantId: 'string',
      fileId: 'string',
      fileName: 'string',
      mimeType: 'string',
    },
  },
  'google-drive/file.updated': {
    name: 'google-drive/file.updated',
    data: {
      tenantId: 'string',
      fileId: 'string',
      fileName: 'string',
      mimeType: 'string',
    },
  },
  'google-drive/file.deleted': {
    name: 'google-drive/file.deleted',
    data: {
      tenantId: 'string',
      fileId: 'string',
    },
  },
  // Document Processing Events
  'document/ingest': {
    name: 'document/ingest',
    data: {
      tenantId: 'string',
      fileId: 'string',
      documentId: 'string',
    },
  },
  'document/reindex': {
    name: 'document/reindex',
    data: {
      tenantId: 'string',
      documentVersionId: 'string',
    },
  },
  // Vector Indexing Events
  'document/index': {
    name: 'document/index',
    data: {
      tenantId: 'string',
      documentId: 'string',
      versionId: 'string',
    },
  },
  'document/unindex': {
    name: 'document/unindex',
    data: {
      tenantId: 'string',
      versionId: 'string',
    },
  },
} as const;
