# IKMS Documentation Quick Reference

**One-page guide to navigate the documentation**

---

## 📚 Documentation Files

| File | Purpose | When to Use |
|------|---------|-------------|
| [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md) | Vision, progress, tech stack | First read, project updates |
| [01-GETTING-STARTED](./docs/01-GETTING-STARTED.md) | Setup & installation | First-time setup |
| [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md) | System design | Understanding design |
| [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) | Implementation details | Building features |
| [04-TESTING](./docs/04-TESTING.md) | Testing procedures | Running tests |
| [05-API-REFERENCE](./docs/05-API-REFERENCE.md) | API documentation | Calling endpoints |

---

## 🚀 Common Tasks

| Task | Documentation | Section |
|------|---------------|---------|
| **First-time setup** | [01-GETTING-STARTED](./docs/01-GETTING-STARTED.md) | Steps 1-11 |
| **Run quick test** | [04-TESTING](./docs/04-TESTING.md) | Quick Start Testing |
| **Connect Google Drive** | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) | Google Drive Integration |
| **Approve document** | [05-API-REFERENCE](./docs/05-API-REFERENCE.md) | POST /api/documents/[id]/approve |
| **Add new feature** | [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md) | Feature Addition Patterns |
| **Debug issue** | [04-TESTING](./docs/04-TESTING.md) | Troubleshooting |
| **Check progress** | [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md) | Project Progress |

---

## 🎯 Quick Starts by Role

### Developer
1. [01-GETTING-STARTED](./docs/01-GETTING-STARTED.md) → Setup
2. [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md) → Understand design
3. [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) → Build features
4. [05-API-REFERENCE](./docs/05-API-REFERENCE.md) → API calls

### Tester
1. [04-TESTING](./docs/04-TESTING.md) → Quick Start Testing
2. [04-TESTING](./docs/04-TESTING.md) → Stage-by-Stage Testing
3. [04-TESTING](./docs/04-TESTING.md) → Troubleshooting

### Manager
1. [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md) → Progress & milestones
2. [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md) → System overview
3. [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md) → Risk assessment

---

## 🔧 Development Commands

```bash
# Start services
npm run dev                    # Next.js (Terminal 1)
npx inngest-cli dev           # Inngest (Terminal 2)

# Testing
npm run test:env              # Check environment
npm run test:health           # Health check

# Access points
http://localhost:3000         # App
http://localhost:8288         # Inngest
http://localhost:3000/test-system  # Test UI
```

---

## 📍 Key Locations

### Code
- **API Routes**: `/knowbot-kms/app/api/`
- **Components**: `/knowbot-kms/components/`
- **Utils**: `/knowbot-kms/utils/`
- **Database**: `/supabase/*.sql`

### Documentation
- **All Docs**: `/docs/`
- **Main README**: `/README.md`
- **Changelog**: `/CHANGELOG.md`

---

## 🔍 Finding Information

### By Keyword
| Keyword | Document | Section |
|---------|----------|---------|
| **Authentication** | [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md) | Security Model |
| **Multi-tenant** | [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md) | Multi-Tenant Architecture |
| **Google Drive** | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) | Google Drive Integration |
| **Pinecone** | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) | Vector Indexing |
| **Ingestion** | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) | Document Ingestion Pipeline |
| **Approval** | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) | Approval Workflow |
| **Testing** | [04-TESTING](./docs/04-TESTING.md) | All sections |

### By Stage
| Stage | Status | Documentation |
|-------|--------|---------------|
| **Stage 1-2** | ✅ Complete | [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md#stage-1--2) |
| **Stage 3** | ✅ Complete | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md#google-drive-integration) |
| **Stage 4** | ✅ Complete | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md#approval-workflow) |
| **Stage 5** | ✅ Complete | [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md#query-engine-stage-5) |
| **Stage 6** | ✅ Complete | [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md#stage-6-dual-interface) |
| **Stage 7** | ⏳ In Progress | [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md#next-milestones) |

---

## 🚨 Quick Troubleshooting

| Problem | Solution | Details |
|---------|----------|---------|
| **Can't connect to DB** | Check `.env.local` | [04-TESTING](./docs/04-TESTING.md#database-issues) |
| **Pinecone fails** | Verify API key | [04-TESTING](./docs/04-TESTING.md#pinecone-issues) |
| **OAuth fails** | Check redirect URI | [04-TESTING](./docs/04-TESTING.md#google-oauth-issues) |
| **Sync not working** | Verify folder ID | [04-TESTING](./docs/04-TESTING.md#sync-issues) |
| **Inngest not running** | Restart dev server | [04-TESTING](./docs/04-TESTING.md#inngest-issues) |

---

## 📞 Support

- **Documentation Issue?** → Check [docs/README.md](./docs/README.md)
- **Setup Problem?** → See [04-TESTING](./docs/04-TESTING.md#troubleshooting)
- **API Question?** → Check [05-API-REFERENCE](./docs/05-API-REFERENCE.md)
- **Architecture Question?** → See [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md)

---

## 🎓 Learning Path

### Day 1: Setup
- Read [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md)
- Follow [01-GETTING-STARTED](./docs/01-GETTING-STARTED.md)
- Run health checks

### Day 2: Understanding
- Read [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md)
- Review data flow diagrams
- Understand multi-tenant security

### Day 3: Development
- Read [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md)
- Study implementation patterns
- Review API in [05-API-REFERENCE](./docs/05-API-REFERENCE.md)

### Day 4: Testing
- Follow [04-TESTING](./docs/04-TESTING.md)
- Run all test procedures
- Verify end-to-end workflow

### Day 5+: Building
- Add features using patterns from [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md)
- Reference [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md) for implementation
- Test using [04-TESTING](./docs/04-TESTING.md)

---

## 🎯 Essential Reading

**Must Read** (Everyone):
- [00-PROJECT-OVERVIEW](./docs/00-PROJECT-OVERVIEW.md)
- [01-GETTING-STARTED](./docs/01-GETTING-STARTED.md)

**Should Read** (Developers):
- [02-ARCHITECTURE](./docs/02-ARCHITECTURE.md)
- [03-DEVELOPMENT-GUIDE](./docs/03-DEVELOPMENT-GUIDE.md)

**Reference** (As Needed):
- [04-TESTING](./docs/04-TESTING.md)
- [05-API-REFERENCE](./docs/05-API-REFERENCE.md)

---

*Keep this file handy for quick navigation!*
*Last Updated: February 5, 2026*
