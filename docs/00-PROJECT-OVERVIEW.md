# Project Overview: IKMS - BPO Knowledge Management & Agent Assist Platform

## Vision Statement

A central Knowledge Operating System for BPOs that integrates with existing document stores (Google Drive), indexes SOPs into an AI-queryable format, enforces strict governance (Approvals/Versioning), and delivers instant, hallucination-free answers to agents.

## Target Market

BPO Centers (India/Global) dealing with complex, rapidly changing SOPs and documentation requiring:
- Real-time accuracy
- Compliance tracking
- Version control
- Multi-tenant isolation
- Zero-hallucination protocol

## Core Differentiators

1. **Zero-Hallucination Protocol** - Strict similarity thresholds with "silence is golden" approach
2. **Google Drive Native Integration** - No workflow disruption, seamless sync
3. **Governance-First Workflows** - Draft → Review → Approve → Index pipeline
4. **Time Machine Queries** - Historical audit capability for compliance
5. **Gap Analytics** - Identify unanswered questions to improve knowledge base

---

## Technology Stack

### Frontend
- **Next.js 16.1.1** (React 19.2.3) - Server-side rendering, fast routing
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling

### Backend & Infrastructure
- **Next.js API Routes** - Serverless functions
- **Inngest** - Background job queue for async operations
- **Node.js** - Runtime environment

### Database Layer
- **Supabase (PostgreSQL)** - Primary database
  - User authentication
  - Row-Level Security (RLS) for multi-tenancy
  - Document metadata storage
  - Versioning & approval tracking

### Vector Database
- **Pinecone** - Semantic search engine
  - Namespace-based tenant isolation
  - 1536-dimension embeddings (OpenAI)
  - Cosine similarity search

### Document Processing
- **LlamaParse** - Advanced PDF/DOCX parsing
  - Table extraction
  - Complex formatting preservation
  - Markdown conversion

### Integrations
- **Google Drive API** - OAuth 2.0, file sync, webhooks
- **OpenAI API** - Embedding generation (text-embedding-3-small)
- **Microsoft Presidio** (Optional) - Advanced PII redaction

### Security & Compliance
- **Supabase Auth** - Authentication & session management
- **Row-Level Security (RLS)** - Database-level tenant isolation
- **Pinecone Namespaces** - Vector-level tenant isolation
- **PII Redaction** - Regex-based with Presidio upgrade path

---

## Project Progress

**Overall Completion: ~100%** (120/120 estimated hours)

### ✅ Completed Stages

#### Stage 1: KMS Workflow & Governance Logic (12h)
- ✅ Document lifecycle states (DRAFT, REVIEW, LIVE, ARCHIVED)
- ✅ Database schema with version control
- ✅ Approval workflow tables
- ✅ Knowledge gap tracking
- ✅ Sync logging infrastructure

#### Stage 2: Foundation & Multi-Tenant Security (15h)
- ✅ Next.js infrastructure
- ✅ Supabase integration
- ✅ Row-Level Security (RLS) policies
- ✅ Pinecone namespace wrapper with enforced tenant isolation
- ✅ Authentication system (Supabase Auth)
- ✅ TypeScript type definitions

#### Stage 3: Google Drive Sync Engine (30h)
- ✅ OAuth 2.0 connector with token management
- ✅ Folder selection UI
- ✅ Sync watcher with polling (5-min intervals)
- ✅ Change detection (new/updated/deleted files)
- ✅ Webhook handler (optional real-time sync)
- ✅ Inngest background jobs
- ✅ Document ingestion pipeline
  - File download from Google Drive
  - Content hashing for duplicate detection
  - LlamaParse integration with fallback
  - PII redaction (regex-based + Presidio option)
  - ML auto-tagging (keyword-based + OpenAI option)
  - Draft document creation

#### Stage 4: Governance & Indexing (15h)
- ✅ Document list API with filtering/pagination
- ✅ Approval/rejection API endpoints
- ✅ Vector indexing pipeline (chunking + embeddings)
- ✅ Document viewer UI components
- ✅ Approval interface UI
- ✅ Status management workflow

#### Stage 5: Query Engine & Hallucination Guardrails (25h)
- ✅ Hybrid search (keyword + semantic)
- ✅ Silence protocol (similarity threshold < 0.75)
- ✅ LLM answer generation with context-only constraints
- ✅ Knowledge gap logging on NO_DATA responses
- ✅ Time machine query (historical date filtering)


#### Stage 6: Dual Interface (UI) (25h)
- ✅ Agent View ("The Cockpit")
- ✅ Admin View ("The Control Center")

---

## System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                       Google Drive                          │
│              (SOPs, Policies, Documents)                    │
└────────────────────┬────────────────────────────────────────┘
                     │ OAuth + Webhooks
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sync Watcher (Inngest)                   │
│         Detects: New Files | Updates | Deletions            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Ingestion Pipeline (Inngest)                   │
│  Download → Parse → Redact PII → Tag → Save as DRAFT        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Approval Workflow                         │
│         Manager Reviews → Approve/Reject                    │
└────────────────────┬────────────────────────────────────────┘
                     │ Approved
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Vector Indexing (Inngest)                        │
│    Chunk → Generate Embeddings → Upsert to Pinecone        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Query Engine (Stage 5)                     │
│      Semantic Search + Keyword Match + LLM Answer           │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Overview

### Core Tables

**tenants** - Multi-tenant organizations
- Stores tenant metadata, settings, Google Drive folder ID

**documents** - Document records
- Links to Google Drive files
- Tracks current status and version

**document_versions** - Version history
- Stores parsed markdown content
- Tracks word count, PII stats, parser metadata
- Versioned with auto-incrementing numbers

**document_categories** - Categorization system
- Tenant-specific categories
- Color-coded for UI

**document_version_categories** - Many-to-many linking

### Governance Tables

**approval_workflow_steps** - Configurable workflow
- Define approval stages per tenant

**document_approvals** - Approval audit trail
- Records who approved/rejected and when

**knowledge_gaps** - Gap analysis
- Logs queries with no answers

### Integration Tables

**google_oauth_tokens** - Google Drive authentication
- Stores access/refresh tokens
- Auto-refresh logic

**sync_logs** - Audit trail
- Tracks all sync and ingestion operations

---

## Multi-Tenant Security Model

### Database Level (Supabase RLS)
- Every table has `tenant_id` column
- RLS policies enforce tenant isolation
- Users can only access their tenant's data
- Service role bypasses RLS for admin operations

### Vector Database Level (Pinecone)
- Each tenant gets a unique namespace (tenant_id)
- Queries automatically scoped to namespace
- Impossible to query another tenant's vectors
- Namespace wrapper enforces this at code level

### Application Level
- JWT tokens contain tenant_id claim
- All API routes validate tenant_id from session
- Client-provided tenant_id never trusted
- Server-side utilities enforce tenant context

---

## Key Features Implemented

### 1. Google Drive Integration
- OAuth 2.0 connection flow
- Folder selection UI
- Automatic file sync (polling + webhooks)
- Change detection (new/updated/deleted)

### 2. Document Ingestion
- Multi-format support (PDF, DOCX, TXT)
- Advanced parsing with LlamaParse
- PII redaction (email, phone, SSN, credit cards)
- Automatic category suggestion
- Content deduplication via hashing

### 3. Version Control
- Automatic version numbering
- Single LIVE version constraint
- Version history tracking
- Approval workflow integration

### 4. Approval System
- Draft → Review → Live → Archived lifecycle
- Manager approval interface
- Rejection with reasons
- Approval history timeline

### 5. Vector Indexing
- Intelligent markdown chunking (512 tokens)
- OpenAI embeddings generation
- Batch upsert to Pinecone
- Old version cleanup

---

## Deployment Strategy

### Level 1: Web App (Current)
- **Method**: Browser-based interface
- **URL**: `company.knowbot.ai`
- **Setup**: Admin connects Google Drive via OAuth
- **Usage**: Agents open in browser tab
- **Pros**: Zero IT installation, immediate deployment

### Level 2: Chrome Extension (Phase 2 Roadmap)
- **Method**: Browser extension with side panel
- **Setup**: Deploy via Chrome Web Store or enterprise policy
- **Usage**: Alt+K opens overlay inside CRM
- **Pros**: No context switching, higher adoption

---

## Next Milestones

### Immediate (Stage 7 - Post-MVP Enhancements)
1. Advanced reporting and analytics (Sprint 1-3 in progress)
2. Chrome extension development
3. Advanced ML features (clustering, duplicate detection)
4. Multi-language support
5. Custom ML model training per tenant

### Medium-Term (Post-MVP)
1. Chrome extension development
2. Advanced ML features (clustering, duplicate detection)
3. Multi-language support
4. Custom ML model training per tenant

---

## Success Metrics

### Technical
- ✅ Zero cross-tenant data leaks (enforced by RLS + namespaces)
- ✅ Sub-second query response times
- ⏳ >90% ingestion success rate
- ⏳ <5% false positive rate (hallucinations)

### Business
- Real-time sync (<5 min latency)
- Governance compliance (100% approval tracking)
- Historical audit capability (time machine)
- Gap analysis insights (top unanswered questions)

### User Experience
- One-click Google Drive connection
- Automatic document sync
- Zero-maintenance knowledge base
- Instant, accurate answers

---

## Risk Mitigation

### High Risk - Mitigated
- **Cross-tenant data leaks**: RLS + namespace isolation at multiple layers
- **Hallucinations**: Strict similarity thresholds + silence protocol
- **Google API quota**: Rate limiting + error handling + retry logic

### Medium Risk - Monitoring
- **Document parsing quality**: LlamaParse with fallback mechanisms
- **Performance at scale**: Indexing for 50+ documents (needs testing)
- **Background job reliability**: Inngest with retries + logging

### Low Risk
- **Database schema**: Well-designed, tested with constraints
- **Authentication**: Production-ready Supabase Auth
- **Frontend framework**: Stable Next.js 16

---

## Team & Resources

### Required Expertise
- Full-stack development (Next.js, TypeScript)
- PostgreSQL & database design
- Vector databases (Pinecone)
- API integrations (Google Drive, OpenAI)
- DevOps (deployment, monitoring)

### Development Environment
- **OS**: Windows (current), Mac/Linux supported
- **Node.js**: v18+
- **Database**: Supabase (cloud-hosted PostgreSQL)
- **IDE**: VS Code recommended

### External Services
- Supabase (database + auth)
- Pinecone (vector database)
- Google Cloud Platform (Drive API)
- OpenAI (embeddings)
- LlamaParse (document parsing)
- Inngest (background jobs)

---

## Documentation Index

- **Getting Started**: `01-GETTING-STARTED.md`
- **Architecture Details**: `02-ARCHITECTURE.md`
- **Development Guide**: `03-DEVELOPMENT-GUIDE.md`
- **Testing Guide**: `04-TESTING.md`
- **API Reference**: `05-API-REFERENCE.md`

---

*Last Updated: February 5, 2026*
*Project Start: December 2024*
*Current Phase: Stage 6 Complete, Post-MVP Enhancements*
