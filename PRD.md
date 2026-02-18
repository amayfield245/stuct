# The System Agent — Product Requirements Document

**Version:** 0.1.0 (MVP)  
**Date:** 18 February 2026  
**Author:** Brilliant Noise  
**Status:** In Development

---

## 1. Overview

The System Agent is a web application that ingests an organisation's documents, automatically extracts a living knowledge model of people, processes, finances, strategies, and culture, and presents it through interactive visual interfaces. It turns static documents into a queryable, explorable map of how an organisation actually works.

### 1.1 Vision

Every organisation has a system — the real one, not the org chart. The System Agent makes that system visible, explorable, and conversational. It surfaces what's declared *and* what's implied: the gaps between strategy documents and budget allocations, the informal power structures, the cultural signals buried in planning assumptions.

### 1.2 Target Users

- **Consultants** (primary): Brilliant Noise and similar firms who need to rapidly understand a client's organisation
- **Internal teams**: Strategy, operations, and transformation leads who want a living picture of their own organisation
- **Board/leadership**: High-level visibility into organisational structure and health

### 1.3 Key Differentiator

The **culture layer**. Most org-mapping tools stop at declared processes and hierarchies. The System Agent also surfaces how people actually behave — the informal networks, the misalignments between what's said and what's funded, the implicit assumptions in planning documents.

---

## 2. What's Been Built (MVP Phase 1)

### 2.1 Document Ingestion Pipeline

| Feature | Status | Notes |
|---------|--------|-------|
| File upload (MD, CSV, TXT) | ✅ Done | Drag-and-drop or click to upload |
| Large document chunking | ✅ Done | ~100K char chunks, results merged |
| AI extraction (Claude Sonnet) | ✅ Done | Entities, relationships, territories, agents, insights |
| AI extraction (Ollama/local) | ✅ Done | llama3.2 3B tested; 8B+ recommended for production |
| PDF upload | 🔲 Planned | pdf-parse dependency installed but not wired |
| DOCX upload | 🔲 Planned | mammoth dependency installed but not wired |

**Extraction output per document:**
- **Entities**: People, teams, organisations, clients, services, strategies, goals, financial items, processes, systems, locations, context, culture
- **Relationships**: Directed edges between entities with labels and weights
- **Territories**: Known (mapped) and frontier (discovered but unmapped) areas
- **Agents**: Auto-generated agent hierarchy (coordinator + domain explorers)
- **Insights**: Automatically detected inconsistencies, risks, gaps, and observations

**Test results (4 documents, Brilliant Noise 2019 business plan):**
- 140 entities extracted
- 76 relationships mapped
- 34 insights auto-detected (including real data inconsistencies like salary mismatches)
- 18 agents generated
- 42 territories identified

### 2.2 Three Interactive Views

#### Graph View
A force-directed knowledge graph showing all entities and their relationships.

- **Node differentiation**: Different shapes per entity type (circles for people, rounded rects for orgs, diamonds for services, hexagons for financial)
- **Curated colour palette**: Cohesive blues/grays maintaining clean aesthetic
- **Visible directional edges**: Arrows, weight-based thickness, hover labels
- **Filter & search panel**: Toggle entity types on/off, real-time search highlighting, node counts
- **Interactions**: Hover highlights connections (fades others), click for detail panel, double-click to pin/unpin nodes
- **Force clustering**: Nodes of same type/territory gravitate together

#### Hex Map View (Game View)
A honeycomb territory map — known territories in bold blue, frontier territories in faint gray. Inspired by strategy game fog-of-war mechanics.

- **Pointy-top hex tessellation**: Proper honeycomb layout with concentric ring generation
- **Known vs frontier**: Bold blue stroke + white fill (known) vs light gray stroke (frontier)
- **Entity counts**: Shown per territory
- **Auto-fit zoom**: Centres and scales to fit all territories on load
- **Territory deduplication**: API merges duplicate territories from multiple extractions

#### Gen-tic View (Agent Hierarchy)
A tree visualisation of the AI agent hierarchy that manages the knowledge model.

- **Deduplicated agents**: Merges duplicates from multiple extractions (18 raw → 10 unique)
- **d3.tree() layout**: Clean top-down hierarchy with orthogonal connectors
- **Entity counts inside nodes**: Large, bold numbers at a glance
- **Labels below nodes**: Agent name and domain clearly readable
- **Click for detail panel**: Role, status, domain, entity count, managed agents

### 2.3 Conversational Interface

- **Chat panel**: Overlay panel accessible from any view
- **Knowledge-graph-aware**: Pulls entity/relationship context into prompts
- **Accurate answers**: Tested on revenue streams, team dynamics, salary data, org structure
- **Claude Sonnet powered**: Uses extracted knowledge as grounding context

### 2.4 Settings & Configuration

- **AI provider toggle**: Claude / Ollama / None
- **API key input**: User sets their own Claude API key (not env vars)
- **Ollama connection**: Configurable URL and model name
- **Connection testing**: Verify provider connectivity from the UI
- **Per-project settings**: Each project can use different AI configurations

### 2.5 Design System

- **Background**: White (#FFFFFF) / near-white (#FAFAFA)
- **Primary accent**: Bold blue (#0033CC)
- **Text**: Black (#000) headings, dark gray (#333) body
- **No**: Glow effects, gradients, drop shadows, animations
- **Typography**: Inter / system sans-serif
- **Principle**: High contrast through stroke weight, not colour variety

---

## 3. Architecture

### 3.1 Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router) | Same as MakeSense platform |
| Database | Prisma + SQLite (dev) | Supabase PostgreSQL for production |
| AI extraction | Claude Sonnet 4 | Deep extraction with structured JSON output |
| AI chat | Claude Sonnet | Knowledge-graph-augmented responses |
| Local AI | Ollama (llama3.2) | Free, private, nothing leaves the machine |
| Visualisation | D3.js v7 | Force graphs, hex maps, tree layouts |
| Styling | Tailwind CSS | Utility-first, consistent design system |
| Deployment target | Vercel | Same as MakeSense |

### 3.2 Data Model

```
Project
├── Documents (uploaded files + extracted text)
├── Entities (people, orgs, services, strategies...)
│   └── Edges (relationships between entities)
├── Territories (known + frontier organisational areas)
├── Agents (AI agent hierarchy managing the knowledge)
├── Insights (auto-detected observations and risks)
├── ChatMessages (conversation history)
└── Settings (AI provider config per project)
```

### 3.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/[id]` | GET | Project details with counts |
| `/api/projects/[id]/documents` | GET/POST | List/upload documents |
| `/api/projects/[id]/documents/[docId]/extract` | POST | Trigger AI extraction |
| `/api/projects/[id]/graph` | GET | Nodes + edges for graph view |
| `/api/projects/[id]/territories` | GET | Territories for hex map |
| `/api/projects/[id]/agents` | GET | Agent hierarchy for gen-tic view |
| `/api/projects/[id]/insights` | GET | Auto-detected insights |
| `/api/projects/[id]/chat` | POST | Send message, get AI response |
| `/api/projects/[id]/settings` | GET/PUT | AI provider configuration |
| `/api/projects/[id]/settings/test` | POST | Test AI provider connection |

---

## 4. What Comes Next

### Phase 2: Polish & Robustness (Next 2-4 weeks)

| Feature | Priority | Description |
|---------|----------|-------------|
| PDF/DOCX extraction | High | Wire up existing pdf-parse and mammoth dependencies |
| Entity detail views | High | Rich detail panels with related entities, source documents, edit capability |
| Insight management | High | Acknowledge, dismiss, annotate insights; filter by severity |
| Search & filtering | High | Global search across entities, full-text in documents |
| Re-extraction | Medium | Re-run extraction on updated documents, merge/diff results |
| Entity editing | Medium | Manual corrections to extracted entities and relationships |
| Export | Medium | Export knowledge graph as JSON, CSV, or visual report |
| Ollama 8B+ testing | Medium | Test larger models for production-quality local extraction |
| Error handling | Medium | Graceful failures, retry logic, progress indicators |
| Mobile responsive | Low | Views usable on tablet/mobile |

### Phase 3: Multi-User & Deployment (Weeks 4-8)

| Feature | Priority | Description |
|---------|----------|-------------|
| Authentication | High | User accounts, login/signup |
| Access control | High | BN consultants see multiple client orgs; admins control access |
| Supabase migration | High | Move from SQLite to PostgreSQL |
| Vercel deployment | High | Production hosting with CI/CD |
| Multi-project dashboard | Medium | Overview of all projects with status |
| Collaboration | Medium | Multiple users viewing/editing same project |
| Audit trail | Medium | Track who changed what and when |
| API rate limiting | Medium | Protect against abuse |

### Phase 4: Intelligence & Culture Layer (Weeks 8-16)

| Feature | Priority | Description |
|---------|----------|-------------|
| Culture signals | High | Detect implicit cultural patterns (e.g. who's funded vs who's praised) |
| Temporal analysis | High | Track how the organisation changes over time with new documents |
| Cross-document inference | High | Connect insights across multiple documents automatically |
| Anomaly detection | Medium | Flag when new documents contradict existing knowledge |
| Recommendations | Medium | Suggest areas to investigate, documents to request |
| Custom agent roles | Medium | User-defined agents for specific analysis tasks |
| Benchmark comparison | Low | Compare org structure against industry patterns |

### Phase 5: MakeSense Integration (Weeks 12-20)

| Feature | Priority | Description |
|---------|----------|-------------|
| Shared auth | High | Single sign-on with MakeSense platform |
| Embedded views | High | System Agent views as MakeSense components |
| Shared data layer | High | Unified Supabase schema |
| Project linking | Medium | Connect System Agent projects to MakeSense workspaces |
| API integration | Medium | MakeSense can trigger extractions, query knowledge graphs |
| White-label | Low | Client-facing version without BN branding |

---

## 5. Business Model (Draft)

### Cost Structure
- **Extraction cost**: ~$0.50-1.00 per document (Claude Sonnet)
- **Estimated project cost**: $25-50 per 50-document project
- **Ollama alternative**: $0 per extraction (local compute only)

### Pricing (TBD)
- Per-project pricing likely
- Free tier with Ollama (local only)
- Paid tier with Claude for deep extraction
- Enterprise tier with multi-user, SSO, custom agents

---

## 6. Known Limitations

1. **Entity deduplication**: Same person mentioned differently across documents may create duplicates (e.g. "Ant" vs "Antony Mayfield")
2. **Extraction quality varies**: CSV files extract well; unstructured prose is harder to parse consistently
3. **No versioning**: Re-extracting a document adds entities rather than updating existing ones
4. **Single-user**: No auth or access control yet
5. **SQLite only**: Not suitable for concurrent multi-user access
6. **No PDF/DOCX yet**: Dependencies installed but upload pipeline only handles text-based formats

---

## 7. File Structure

```
system-agent-app/
├── prisma/
│   └── schema.prisma          # Data model
├── src/
│   ├── app/
│   │   ├── api/projects/      # All API routes
│   │   ├── project/[id]/      # Project detail page
│   │   ├── settings/          # Settings page
│   │   ├── globals.css        # Design system
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/
│   │   ├── GraphView.tsx      # Force-directed knowledge graph
│   │   ├── HexMapView.tsx     # Honeycomb territory map
│   │   ├── AgentTreeView.tsx  # Agent hierarchy tree
│   │   ├── ChatView.tsx       # Conversational interface
│   │   ├── InsightsPanel.tsx  # Auto-detected insights
│   │   ├── UploadPanel.tsx    # Document upload
│   │   └── EntityDetail.tsx   # Entity detail panel
│   └── lib/
│       └── prisma.ts          # Prisma client singleton
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── PRD.md                     # This document
```

---

*Built by Brilliant Noise. Part of the MakeSense (WT) platform.*
