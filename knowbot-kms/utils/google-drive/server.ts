import { createDriveClient } from '@/lib/google-oauth';
import { getValidGoogleTokens } from '@/utils/google-oauth/server';
import type { drive_v3 } from 'googleapis';

/**
 * Server-side Google Drive utilities
 * For file operations, metadata retrieval, etc.
 */

/**
 * Get file metadata from Google Drive
 */
export async function getFileMetadata(
  tenantId: string,
  fileId: string
): Promise<drive_v3.Schema$File | null> {
  const tokens = await getValidGoogleTokens(tenantId);
  if (!tokens) {
    throw new Error(`Google Drive not connected for tenant ${tenantId}`);
  }

  const drive = createDriveClient(tokens.access_token, tokens.refresh_token || undefined);

  try {
    const { data: file } = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink',
    });

    return file;
  } catch (error) {
    console.error(`[Google Drive] Failed to get file metadata for ${fileId}:`, error);
    return null;
  }
}

/**
 * Download file from Google Drive
 * Returns file buffer
 */
export async function downloadFile(
  tenantId: string,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  const tokens = await getValidGoogleTokens(tenantId);
  if (!tokens) {
    throw new Error(`Google Drive not connected for tenant ${tenantId}`);
  }

  const drive = createDriveClient(tokens.access_token, tokens.refresh_token || undefined);

  try {
    // Get file metadata first
    const file = await getFileMetadata(tenantId, fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    // Download file
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'arraybuffer',
      }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    const mimeType = file.mimeType || 'application/octet-stream';
    const fileName = file.name || 'unknown';

    return {
      buffer,
      mimeType,
      fileName,
    };
  } catch (error) {
    console.error(`[Google Drive] Failed to download file ${fileId}:`, error);
    throw error;
  }
}

/**
 * List files in a folder
 */
export async function listFolderFiles(
  tenantId: string,
  folderId: string,
  options: {
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
  } = {}
): Promise<{
  files: drive_v3.Schema$File[];
  nextPageToken?: string;
}> {
  const tokens = await getValidGoogleTokens(tenantId);
  if (!tokens) {
    throw new Error(`Google Drive not connected for tenant ${tenantId}`);
  }

  const drive = createDriveClient(tokens.access_token, tokens.refresh_token || undefined);

  try {
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, size, createdTime), nextPageToken',
      orderBy: options.orderBy || 'modifiedTime desc',
      pageSize: options.pageSize || 100,
      pageToken: options.pageToken,
    });

    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken || undefined,
    };
  } catch (error) {
    console.error(`[Google Drive] Failed to list files in folder ${folderId}:`, error);
    throw error;
  }
}

/**
 * Check if file exists and get its metadata
 */
export async function fileExists(
  tenantId: string,
  fileId: string
): Promise<boolean> {
  try {
    const file = await getFileMetadata(tenantId, fileId);
    return file !== null;
  } catch {
    return false;
  }
}
