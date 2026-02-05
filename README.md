# IKMS - BPO Knowledge Management & Agent Assist Platform

A central Knowledge Operating System for BPOs that integrates with Google Drive, indexes SOPs into an AI-queryable format, enforces strict governance, and delivers instant, hallucination-free answers to agents.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Supabase account
- Pinecone account
- Google Cloud account
- OpenAI account

### Installation

```bash
# Clone repository
git clone <repo-url>
cd IKMS/knowbot-kms

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development
npm run dev
```

**Full setup guide**: [docs/01-GETTING-STARTED.md](./docs/01-GETTING-STARTED.md)

---

## 📚 Documentation

Complete documentation is available in the `/docs` folder:

- **[00-PROJECT-OVERVIEW.md](./docs/00-PROJECT-OVERVIEW.md)** - Vision, tech stack, progress
- **[01-GETTING-STARTED.md](./docs/01-GETTING-STARTED.md)** - Setup & installation
- **[02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)** - System design & patterns
- **[03-DEVELOPMENT-GUIDE.md](./docs/03-DEVELOPMENT-GUIDE.md)** - Implementation details
- **[04-TESTING.md](./docs/04-TESTING.md)** - Testing procedures
- **[05-API-REFERENCE.md](./docs/05-API-REFERENCE.md)** - Complete API docs

**Start here**: [docs/README.md](./docs/README.md)

---

## ✨ Key Features

### ✅ Implemented
- **Multi-Tenant Security** - Row-level security + namespace isolation
- **Google Drive Integration** - OAuth 2.0, automatic file sync
- **Document Ingestion** - Parse, redact PII, auto-categorize
- **Approval Workflow** - Draft → Review → Live → Archived
- **Vector Indexing** - Semantic search with Pinecone
- **Version Control** - Full version history & audit trail

### ⏳ In Progress
- **Query Engine** - Hybrid search + hallucination prevention
- **Agent Interface** - Clean search cockpit
- **Admin Dashboard** - Sync status, approval queue, analytics

---

## 🏗️ Architecture

```
Google Drive → Sync Watcher → Ingestion Pipeline → Approval Workflow
                                                          ↓
                                                    Vector Indexing
                                                          ↓
                                                   Query Engine (Stage 5)
```

**Full architecture**: [docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md)

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Inngest (job queue)
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **Vector DB**: Pinecone with namespace isolation
- **Integrations**: Google Drive API, OpenAI, LlamaParse

---

## 📊 Project Status

**Overall Completion**: ~65% (78/120 hours)

- ✅ **Stage 1**: Database schema & governance (Complete)
- ✅ **Stage 2**: Multi-tenant security & auth (Complete)
- ✅ **Stage 3**: Google Drive sync & ingestion (Complete)
- ✅ **Stage 4**: Approval workflow & indexing (Complete)
- ⏳ **Stage 5**: Query engine (In Progress)
- ⏳ **Stage 6**: UI completion (Planned)

**Progress details**: [docs/00-PROJECT-OVERVIEW.md](./docs/00-PROJECT-OVERVIEW.md#project-progress)

---

## 🧪 Testing

### Quick Health Check

```bash
# Start services
npm run dev                    # Terminal 1
npx inngest-cli dev           # Terminal 2

# Run tests
npm run test:health           # Or visit: http://localhost:3000/test-system
```

**Testing guide**: [docs/04-TESTING.md](./docs/04-TESTING.md)

---

## 🔌 API Reference

Key endpoints:

- **Documents**: `/api/documents` - List, approve, reject
- **Google Drive**: `/api/google-drive/sync` - Trigger sync
- **OAuth**: `/api/google-oauth/authorize` - Connect Google Drive
- **Pinecone**: `/api/pinecone/test` - Test vector DB

**Full API docs**: [docs/05-API-REFERENCE.md](./docs/05-API-REFERENCE.md)

---

## 🤝 Contributing

1. Read the [Architecture Guide](./docs/02-ARCHITECTURE.md#feature-addition-patterns)
2. Follow [Safe Feature Addition Patterns](./docs/02-ARCHITECTURE.md#pattern-1-adding-a-new-dashboard-section)
3. Write tests ([Testing Guide](./docs/04-TESTING.md))
4. Submit PR with documentation updates

---

## 🐛 Troubleshooting

Common issues and solutions: [docs/04-TESTING.md#troubleshooting](./docs/04-TESTING.md#troubleshooting)

---

## 📝 License

[Your License Here]

---

## 🔗 Links

- **Documentation**: [/docs](./docs)
- **Supabase**: [app.supabase.com](https://app.supabase.com)
- **Pinecone**: [app.pinecone.io](https://app.pinecone.io)
- **Inngest**: [app.inngest.com](https://app.inngest.com)

---

*For detailed information, see the [complete documentation](./docs/README.md).*
