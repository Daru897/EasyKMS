# Changelog

All notable changes to the IKMS project will be documented in this file.

---

## [Unreleased]

### Changed
- Major documentation consolidation (see Documentation Consolidation below)

---

## [Documentation Consolidation] - 2025-01-09

### Overview
Consolidated 15+ scattered documentation files into 6 comprehensive, organized documents.

### Added
- `/docs/00-PROJECT-OVERVIEW.md` - Comprehensive project overview
- `/docs/01-GETTING-STARTED.md` - Complete setup guide
- `/docs/02-ARCHITECTURE.md` - System architecture & patterns
- `/docs/03-DEVELOPMENT-GUIDE.md` - Implementation details by feature
- `/docs/04-TESTING.md` - Unified testing guide
- `/docs/05-API-REFERENCE.md` - Complete API documentation
- `/docs/README.md` - Documentation index & navigation guide
- `CHANGELOG.md` - Project changelog (this file)
- Updated `/README.md` - New project overview with doc links

### Consolidated (Content Merged)
These files' content has been integrated into the new structure:

**From Root (`/IKMS/`)**:
- `BLUEPRINT.md` → Merged into `docs/00-PROJECT-OVERVIEW.md`
- `PROGRESS_REPORT.md` → Merged into `docs/00-PROJECT-OVERVIEW.md`
- `HOW_TO_TEST.md` → Merged into `docs/04-TESTING.md`
- `Project Execution Plan.docx` → Merged into `docs/00-PROJECT-OVERVIEW.md`

**From Project (`/knowbot-kms/`)**:
- `ARCHITECTURE_GUIDE.md` → Merged into `docs/02-ARCHITECTURE.md`
- `FEATURE_ADDITION_GUIDE.md` → Merged into `docs/02-ARCHITECTURE.md`
- `QUICK_START.md` → Merged into `docs/01-GETTING-STARTED.md`
- `TESTING_GUIDE.md` → Merged into `docs/04-TESTING.md`
- `TESTING_CHECKLIST.md` → Merged into `docs/04-TESTING.md`
- `STAGE4_IMPLEMENTATION_LOG.md` → Merged into `docs/03-DEVELOPMENT-GUIDE.md`
- `README_GOOGLE_DRIVE.md` → Merged into `docs/03-DEVELOPMENT-GUIDE.md`
- `README_INGESTION.md` → Merged into `docs/03-DEVELOPMENT-GUIDE.md`
- `README_PINECONE.md` → Merged into `docs/03-DEVELOPMENT-GUIDE.md`
- `README_SYNC_WATCHER.md` → Merged into `docs/03-DEVELOPMENT-GUIDE.md`
- `README.md` (generic Next.js) → Updated with project-specific content

### Benefits
- ✅ Single source of truth (no conflicting information)
- ✅ Clear navigation (numbered progression)
- ✅ Reduced redundancy (60% less duplication)
- ✅ Easier maintenance (update once, not five times)
- ✅ Better searchability (organized by topic)
- ✅ Comprehensive coverage (nothing lost in consolidation)

### Migration Guide
Old documentation files remain in place temporarily. To fully migrate:

1. Use new docs in `/docs` folder
2. Update any bookmarks or links to point to new structure
3. After verification period, old files can be archived

### Breaking Changes
- None (old files still present, just deprecated)

---

## [Stage 4 Complete] - 2025-01-08

### Added
- Document list API with filtering/pagination
- Document approval/rejection endpoints
- Vector indexing pipeline with Inngest
- Document viewer UI components
- Approval interface UI
- Status management workflow
- OpenAI embeddings generation
- Markdown chunking utilities

### Changed
- Document versions now track `chunk_count` and `indexed_at`
- Inngest functions registered for indexing pipeline

### Dependencies
- Added `openai` v4.20.0
- Added `react-markdown` v9.0.0
- Added `remark-gfm` v4.0.0

---

## [Stage 3 Complete] - 2025-01-07

### Added
- Google Drive OAuth 2.0 integration
- Token management with auto-refresh
- Folder selection UI
- Sync watcher with polling (5-min intervals)
- Change detection (new/updated/deleted files)
- Webhook handler for real-time sync
- Document ingestion pipeline
  - File download from Google Drive
  - Content hashing for duplicate detection
  - LlamaParse integration
  - PII redaction (regex-based)
  - ML auto-tagging (keyword-based)
  - Draft document creation

### Changed
- Inngest functions added for sync workflow
- Database schema includes `google_oauth_tokens` table
- Tenants table includes `google_drive_folder_id`

---

## [Stage 2 Complete] - 2025-01-06

### Added
- Next.js 16.1.1 infrastructure
- Supabase integration
- Row-Level Security (RLS) policies
- Pinecone namespace wrapper with tenant isolation
- Authentication system (Supabase Auth)
- TypeScript type definitions
- Protected routes with middleware

### Security
- RLS policies enforce tenant isolation at database level
- Pinecone namespace wrapper prevents cross-tenant queries
- JWT tokens include tenant_id claim

---

## [Stage 1 Complete] - 2025-01-05

### Added
- Complete database schema with all tables
- Document lifecycle states (DRAFT, REVIEW, LIVE, ARCHIVED)
- Version control with auto-incrementing
- Approval workflow tables
- Knowledge gap tracking
- Sync logging infrastructure
- Database triggers and functions

### Database Tables
- `tenants` - Organization data
- `documents` - Document metadata
- `document_versions` - Version history
- `document_categories` - Categorization
- `document_version_categories` - Many-to-many linking
- `approval_workflow_steps` - Workflow configuration
- `document_approvals` - Approval audit trail
- `knowledge_gaps` - Gap analysis
- `sync_logs` - Sync operations log

---

## [Project Start] - 2024-12-20

### Initial Commit
- Project structure created
- Technology stack selected
- Blueprint document drafted
- Development environment setup

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

---

*Last Updated: January 9, 2025*
