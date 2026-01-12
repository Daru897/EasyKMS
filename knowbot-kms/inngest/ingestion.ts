import { inngest } from '@/lib/inngest';
import { downloadFile, getFileMetadata } from '@/utils/google-drive/server';
import { createServiceClient } from '@/utils/supabase/server';
import { redactPII } from '@/utils/pii-redaction';
import { parseDocument } from '@/utils/llamaparse';
import { suggestCategories } from '@/utils/ml-tagging';
import crypto from 'crypto';

/**
 * Document Ingestion Pipeline
 * Processes files from Google Drive and saves as Draft
 */

/**
 * Ingest a document from Google Drive
 * Full pipeline: Download → PII Redaction → Parse → Tag → Save as Draft
 */
export const ingestDocument = inngest.createFunction(
  {
    id: 'ingest-document',
    name: 'Ingest Document from Google Drive',
    retries: 2,
  },
  { event: 'document/ingest' },
  async ({ event, step }) => {
    const { tenantId, fileId, documentId } = event.data;

    // Step 1: Get file metadata
    const fileMetadata = await step.run('get-file-metadata', async () => {
      const metadata = await getFileMetadata(tenantId, fileId);
      if (!metadata) {
        throw new Error(`File ${fileId} not found in Google Drive`);
      }
      return metadata;
    });

    // Step 2: Download file
    const fileData = await step.run('download-file', async () => {
      const data = await downloadFile(tenantId, fileId);
      if (!data) {
        throw new Error(`Failed to download file ${fileId}`);
      }
      return data;
    });

    // Step 3: Calculate content hash
    const contentHash = await step.run('calculate-hash', async () => {
      return crypto.createHash('sha256').update(fileData.buffer).digest('hex');
    });

    // Step 4: Check for duplicate (same content hash)
    const existingDoc = await step.run('check-duplicate', async () => {
      if (!documentId) {
        // For new documents, check if content hash exists
        const supabase = createServiceClient();
        const { data } = await supabase
          .from('document_versions')
          .select('id, document_id, content_hash')
          .eq('content_hash', contentHash)
          .limit(1)
          .single();

        if (data) {
          // Check if it's from the same tenant
          const { data: doc } = await supabase
            .from('documents')
            .select('tenant_id')
            .eq('id', data.document_id)
            .single();

          if (doc && doc.tenant_id === tenantId) {
            return { isDuplicate: true, existingVersionId: data.id };
          }
        }
      }
      return { isDuplicate: false };
    });

    if (existingDoc.isDuplicate) {
      return {
        success: true,
        message: 'Duplicate document detected, skipping ingestion',
        existingVersionId: existingDoc.existingVersionId,
      };
    }

    // Step 5: Parse document with LlamaParse first
    const parsedContent = await step.run('parse-document', async () => {
      // Parse the document to get text content
      return await parseDocument(fileData.buffer, fileData.mimeType);
    });

    // Step 6: PII Redaction on parsed text
    const redactedData = await step.run('redact-pii', async () => {
      // Redact PII from the parsed markdown text
      return await redactPII(parsedContent.markdown);
    });

    // Step 7: Auto-tagging with ML (use redacted text for privacy)
    const suggestedCategories = await step.run('suggest-categories', async () => {
      const text = redactedData.text; // Use redacted text for category suggestion
      return await suggestCategories(text, tenantId);
    });

    // Step 8: Save to database as Draft
    const savedDocument = await step.run('save-draft', async () => {
      const supabase = createServiceClient();

      // Get or create document record
      let docId = documentId;
      if (!docId) {
        // Create new document
        const { data: newDoc, error } = await supabase
          .from('documents')
          .insert({
            tenant_id: tenantId,
            google_file_id: fileId,
            title: fileMetadata.name || 'Untitled',
            mime_type: fileMetadata.mimeType || fileData.mimeType,
            file_extension: fileMetadata.name?.split('.').pop() || '',
            file_size_bytes: fileMetadata.size ? parseInt(fileMetadata.size) : fileData.buffer.length,
            google_drive_metadata: {
              id: fileMetadata.id,
              name: fileMetadata.name,
              modifiedTime: fileMetadata.modifiedTime,
              createdTime: fileMetadata.createdTime,
              webViewLink: fileMetadata.webViewLink,
            },
            current_status: 'DRAFT',
            sync_status: 'syncing',
            last_synced_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create document: ${error.message}`);
        }
        docId = newDoc.id;
      } else {
        // Update existing document
        await supabase
          .from('documents')
          .update({
            sync_status: 'syncing',
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', docId);
      }

      // Create document version
      const { data: version, error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: docId,
          content_hash: contentHash,
          raw_content_hash: crypto.createHash('sha256').update(fileData.buffer).digest('hex'),
          parsed_markdown: redactedData.text, // Store redacted version
          word_count: redactedData.text.split(/\s+/).filter(w => w.length > 0).length,
          chunk_count: 0, // Will be set during indexing
          status: 'DRAFT',
          pii_redacted: redactedData.redacted,
          pii_redaction_stats: redactedData.stats || {},
          parser_metadata: parsedContent.metadata || {},
          sync_metadata: {
            file_name: fileMetadata.name,
            mime_type: fileData.mimeType,
            file_size: fileData.buffer.length,
            ingested_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (versionError) {
        throw new Error(`Failed to create document version: ${versionError.message}`);
      }

      // Update document's current_version_id
      await supabase
        .from('documents')
        .update({
          current_version_id: version.id,
          sync_status: 'synced',
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      // Associate suggested categories
      if (suggestedCategories.length > 0) {
        // Get or create category IDs
        const categoryIds: string[] = [];
        for (const categoryName of suggestedCategories) {
          // Check if category exists
          const { data: existing } = await supabase
            .from('document_categories')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('name', categoryName)
            .single();

          if (existing) {
            categoryIds.push(existing.id);
          } else {
            // Create new category
            const { data: newCategory } = await supabase
              .from('document_categories')
              .insert({
                tenant_id: tenantId,
                name: categoryName,
              })
              .select()
              .single();

            if (newCategory) {
              categoryIds.push(newCategory.id);
            }
          }
        }

        // Link categories to version
        if (categoryIds.length > 0) {
          const categoryLinks = categoryIds.map((catId) => ({
            document_version_id: version.id,
            category_id: catId,
          }));

          await supabase.from('document_version_categories').insert(categoryLinks);
        }
      }

      return {
        documentId: docId,
        versionId: version.id,
        versionNumber: version.version_number,
      };
    });

    // Step 9: Log success
    await step.run('log-success', async () => {
      const supabase = createServiceClient();
      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        document_id: savedDocument.documentId,
        action: documentId ? 'update' : 'create',
        status: 'success',
        details: {
          file_id: fileId,
          file_name: fileMetadata.name,
          version_id: savedDocument.versionId,
          version_number: savedDocument.versionNumber,
          word_count: redactedData.text.split(/\s+/).filter(w => w.length > 0).length,
          categories: suggestedCategories,
        },
      });
    });

    return {
      success: true,
      documentId: savedDocument.documentId,
      versionId: savedDocument.versionId,
      versionNumber: savedDocument.versionNumber,
      message: 'Document ingested successfully as Draft',
    };
  }
);
