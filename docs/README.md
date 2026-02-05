# IKMS Documentation

Welcome to the IKMS (Knowledge Management System) documentation. This consolidated documentation replaces multiple scattered files with a clear, organized structure.

## 📚 Documentation Structure

### Core Documentation Files

1. **[00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md)**
   - Vision & goals
   - Technology stack
   - Project progress (65% complete)
   - Architecture overview
   - Key features & differentiators

2. **[01-GETTING-STARTED.md](./01-GETTING-STARTED.md)**
   - Prerequisites & setup
   - Environment configuration
   - Database migrations
   - First-time installation
   - Quick health checks

3. **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)**
   - System architecture diagrams
   - Multi-tenant isolation
   - Component interactions
   - Data flow & lifecycle
   - Security model
   - Feature addition patterns

4. **[03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md)**
   - Google Drive integration
   - Document sync watcher
   - Ingestion pipeline
   - Vector indexing
   - Approval workflow
   - Query engine (Stage 5)
   - Implementation logs

5. **[04-TESTING.md](./04-TESTING.md)**
   - Quick health checks
   - Stage-by-stage testing
   - End-to-end workflows
   - Performance testing
   - Troubleshooting guide

6. **[05-API-REFERENCE.md](./05-API-REFERENCE.md)**
   - Complete API documentation
   - Request/response examples
   - Error codes
   - Authentication
   - Webhooks
   - SDK examples

---

## 🚀 Quick Start

**New to IKMS?** Follow this path:

1. Start with [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md) to understand the project
2. Follow [01-GETTING-STARTED.md](./01-GETTING-STARTED.md) to set up your environment
3. Refer to [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) to understand the system
4. Use [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md) for implementation details
5. Run tests from [04-TESTING.md](./04-TESTING.md) to verify everything works
6. Reference [05-API-REFERENCE.md](./05-API-REFERENCE.md) when building features

---

## 🎯 Quick Access by Role

### For Developers
- **Setup**: [01-GETTING-STARTED.md](./01-GETTING-STARTED.md)
- **Architecture**: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) → Multi-Tenant Architecture
- **Implementation**: [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md)
- **API Docs**: [05-API-REFERENCE.md](./05-API-REFERENCE.md)

### For Testers
- **Quick Tests**: [04-TESTING.md](./04-TESTING.md) → Quick Start Testing
- **Full Tests**: [04-TESTING.md](./04-TESTING.md) → Stage-by-Stage Testing
- **Troubleshooting**: [04-TESTING.md](./04-TESTING.md) → Troubleshooting

### For Project Managers
- **Progress**: [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md) → Project Progress
- **Milestones**: [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md) → Next Milestones
- **Risks**: [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md) → Risk Mitigation

### For Architects
- **System Design**: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) → System Overview
- **Data Flow**: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) → Data Flow
- **Security**: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) → Security Model

---

## 📖 Documentation by Feature

### Google Drive Integration
- **Setup**: [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#google-drive-integration)
- **API**: [05-API-REFERENCE.md](./05-API-REFERENCE.md#google-drive-api)
- **Testing**: [04-TESTING.md](./04-TESTING.md#stage-3-google-drive-integration)

### Document Sync & Ingestion
- **How It Works**: [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#document-sync-watcher)
- **Pipeline**: [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#document-ingestion-pipeline)
- **Testing**: [04-TESTING.md](./04-TESTING.md#test-14-trigger-ingestion)

### Approval Workflow
- **Implementation**: [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#approval-workflow)
- **API**: [05-API-REFERENCE.md](./05-API-REFERENCE.md#approve-document)
- **Testing**: [04-TESTING.md](./04-TESTING.md#test-19-approve-document)

### Vector Indexing
- **Architecture**: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#vector-database-pinecone)
- **Implementation**: [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#vector-indexing-system)
- **API**: [05-API-REFERENCE.md](./05-API-REFERENCE.md#pinecone-api)

---

## 🔧 Common Tasks

### Setting Up Development Environment
→ [01-GETTING-STARTED.md](./01-GETTING-STARTED.md)

### Adding a New Feature
→ [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#feature-addition-patterns)

### Running Tests
→ [04-TESTING.md](./04-TESTING.md#quick-start-testing)

### Debugging Issues
→ [04-TESTING.md](./04-TESTING.md#troubleshooting)

### Understanding API Endpoints
→ [05-API-REFERENCE.md](./05-API-REFERENCE.md)

---

## 📋 Migration from Old Docs

This consolidated documentation replaces the following files:

### Deprecated Files (Archived)

**Root Level**:
- ~~BLUEPRINT.md~~ → Merged into [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md)
- ~~PROGRESS_REPORT.md~~ → Merged into [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md)
- ~~HOW_TO_TEST.md~~ → Merged into [04-TESTING.md](./04-TESTING.md)

**Project Level** (knowbot-kms/):
- ~~ARCHITECTURE_GUIDE.md~~ → Merged into [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)
- ~~FEATURE_ADDITION_GUIDE.md~~ → Merged into [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)
- ~~QUICK_START.md~~ → Merged into [01-GETTING-STARTED.md](./01-GETTING-STARTED.md)
- ~~TESTING_GUIDE.md~~ → Merged into [04-TESTING.md](./04-TESTING.md)
- ~~TESTING_CHECKLIST.md~~ → Merged into [04-TESTING.md](./04-TESTING.md)
- ~~STAGE4_IMPLEMENTATION_LOG.md~~ → Merged into [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md)
- ~~README_GOOGLE_DRIVE.md~~ → Merged into [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md)
- ~~README_INGESTION.md~~ → Merged into [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md)
- ~~README_PINECONE.md~~ → Merged into [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md)
- ~~README_SYNC_WATCHER.md~~ → Merged into [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md)

---

## 🆕 What's New

### Improvements Over Old Docs

✅ **Single Source of Truth**: No conflicting information across multiple files  
✅ **Clear Navigation**: Numbered files show progression  
✅ **Better Organization**: Topics grouped logically  
✅ **Reduced Redundancy**: Information appears once, referenced when needed  
✅ **Easy to Maintain**: Update one file instead of five  
✅ **Searchable**: Better structure for search tools  

---

## 🔍 Finding Information

### By Keyword

Use your text editor's search across all docs files:

- **Authentication** → [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#security-model)
- **Multi-tenant** → [02-ARCHITECTURE.md](./02-ARCHITECTURE.md#multi-tenant-architecture)
- **Google Drive** → [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#google-drive-integration)
- **Pinecone** → [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#vector-indexing-system)
- **Testing** → [04-TESTING.md](./04-TESTING.md)
- **API** → [05-API-REFERENCE.md](./05-API-REFERENCE.md)

### By Stage

- **Stage 1 & 2**: Foundation → [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md#stage-1--2-foundation)
- **Stage 3**: Google Drive → [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#google-drive-integration)
- **Stage 4**: Approval & Indexing → [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#approval-workflow)
- **Stage 5**: Query Engine → [03-DEVELOPMENT-GUIDE.md](./03-DEVELOPMENT-GUIDE.md#query-engine-stage-5)
- **Stage 6**: UI → [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md#stage-6-dual-interface)

---

## 💡 Contributing to Docs

When updating documentation:

1. **Add to existing files** rather than creating new ones
2. **Update the relevant section** in the appropriate doc file
3. **Cross-reference** using relative links like `[link](./02-ARCHITECTURE.md#section)`
4. **Keep consistency** with existing formatting and structure
5. **Update this README** if you add new major sections

---

## 📞 Support

- **Issues**: Check [04-TESTING.md](./04-TESTING.md#troubleshooting)
- **Questions**: Refer to [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md)
- **API Problems**: See [05-API-REFERENCE.md](./05-API-REFERENCE.md#error-codes)

---

## 📅 Last Updated

**February 2026** - Stage 5/6 documentation updated

---

*Happy coding! 🚀*

---

## ✅ Stage 5 Quick Check

Use this checklist to verify Stage 5 is present and wired:

1. API routes exist: `POST /api/query`, `GET /api/knowledge-gaps`, `POST /api/reindex`
2. Supabase migration applied: `supabase/Stage5_Query.sql` (adds `search_text`, `search_vector`, trigger, GIN index)
3. Pinecone indexing metadata includes: `document_title`, `document_status`, `effective_date_epoch`, `heading_context`
4. Knowledge gaps table is populated on `NO_DATA` responses.

---

## ✅ Stage 6 Quick Check

Use this checklist to verify Stage 6 is present and wired:

1. Agent UI entry point exists at `/agent`
2. Admin UI entry point exists at `/admin`
3. Feedback endpoint exists: `POST /api/feedback`
4. Admin analytics endpoint exists: `GET /api/analytics/usage`
5. Knowledge gap resolve endpoint exists: `PATCH /api/knowledge-gaps/[id]`

---

## ✅ Stage 7 Quick Check (Analytics Track)

Use this checklist to verify Stage 7 analytics progress:

1. Query logging is enabled in `/api/query`
2. Analytics endpoints exist: `GET /api/analytics/reports`, `GET /api/analytics/trends`, `GET /api/analytics/insights`, `GET /api/analytics/exports`
3. Reports UI is available at `/admin/reports`
4. Migration applied: `supabase/Stage7_Analytics.sql`
