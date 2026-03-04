# DChat — Structured Questionnaire Answering Tool

An AI-powered tool that automates completing vendor security assessments using internal reference documents. Built with a RAG (Retrieval-Augmented Generation) pipeline.

---

## What The App Does

1. **Sign up / Log in** — Supabase Auth with email/password
2. **Upload a questionnaire** (PDF, XLSX, or DOCX) + reference documents
3. **Auto-generate answers** using a RAG pipeline (LangChain + OpenAI + pgvector)
4. **Review & edit** generated answers with confidence scores and evidence snippets
5. **Export** a structured DOCX document preserving original question order with answers, citations, and confidence levels

### Architecture

```
Next.js Frontend → n8n (Orchestration) → FastAPI Backend → Supabase (Auth + DB + pgvector)
                                              ↕
                                      LangChain + OpenAI
```

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | UI — 7 pages |
| Auth | Supabase Auth | Signup, login, session management |
| Backend | FastAPI (Python) | All business logic + AI |
| RAG | LangChain + OpenAI GPT-4o-mini | Embeddings, retrieval, answer generation |
| Orchestration | n8n (3 workflows) | Multi-step workflow coordination |
| Database | Supabase PostgreSQL + pgvector | Data + vector similarity search |

---

## Feature Status

### Phase 1: Core Workflow — ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Sign up and log in | ✅ Done | Supabase Auth, email/password, middleware-protected routes |
| Upload questionnaire (PDF/XLSX/DOCX) | ✅ Done | `FileUpload` component, backend `parser.py` |
| Upload/store reference documents | ✅ Done | Multi-file upload, chunked & embedded via `ingest.py` |
| Parse questionnaire into individual questions | ✅ Done | Supports PDF, XLSX, DOCX formats |
| Retrieve relevant content from references | ✅ Done | pgvector similarity search via LangChain |
| Generate answer per question | ✅ Done | `rag.py` — LangChain + OpenAI GPT-4o-mini |
| Citation per answer | ✅ Done | Source document name + similarity score attached |
| "Not found in references" fallback | ✅ Done | Returned when no relevant chunks found |
| Structured web view (Question / Answer / Citations) | ✅ Done | `QATable` + `QuestionNav` sidebar for navigation |

### Phase 2: Review & Export — ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Review and edit answers before export | ✅ Done | Inline editing on the review page |
| Export as downloadable document | ✅ Done | DOCX via `export.py` + `python-docx` |
| Preserve original question order | ✅ Done | Questions exported in order |
| Keep original questions unchanged | ✅ Done | Only answers inserted alongside |
| Insert answers below/alongside questions | ✅ Done | Structured DOCX layout |
| Include citations with each answer | ✅ Done | Citations appended per answer in export |

### Nice-to-Have Features — 4 of 5 Implemented

| # | Feature | Status | Details |
|---|---|---|---|
| 1 | Confidence Score | ✅ Done | Avg cosine similarity, color-coded `ConfidenceBadge` |
| 2 | Evidence Snippets | ✅ Done | Top 3 retrieved chunks shown per answer with source & similarity % |
| 3 | Partial Regeneration | ✅ Done | `question_ids` param in `/generate` endpoint + UI regenerate button |
| 4 | Version History | ✅ Done | Dashboard shows all past runs with status, dates, and stats |
| 5 | Coverage Summary | ✅ Done | `CoverageSummary` component — total, answered, not-found, coverage %, avg confidence |

> **5 of 5 nice-to-have features are now implemented.**

---

## What's Missing / Known Gaps

| Area | Gap | Impact |
|---|---|---|
| Backend auth | JWT tokens are not validated server-side; trusts `user_id` from request body | Security risk in production |
| PDF export | Only DOCX export is available, no PDF option | Minor — DOCX covers the requirement |
| Streaming responses | No SSE/WebSocket for real-time per-question progress | UX — user sees a loading spinner until all answers complete |
| Batch DB inserts | Chunks are inserted in a loop, not batched | Performance on large reference docs |
| File cleanup | Exported DOCX files are not auto-deleted after download | Disk space over time |
| Hybrid retrieval | Vector-only search; no BM25 keyword fallback | Retrieval recall could be better |
| Semantic chunking | Fixed character-window chunking, not section-aware | Chunk quality varies by document structure |

---

## Next Phase Improvements

1. **Backend auth hardening** — Validate JWT tokens on every backend endpoint
2. **Streaming generation** — SSE for real-time per-question answer progress
3. **PDF export** — Add PDF alongside DOCX downloads
4. **Hybrid retrieval** — Combine pgvector with BM25 keyword search
5. **Semantic chunking** — Split documents by headings/sections instead of fixed windows
6. **Batch operations** — Batch insert chunks and answers for performance
7. **File lifecycle** — Auto-cleanup temp/exported files

---

## How to Run Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Database Setup

Run `setup_db.sql` in your Supabase SQL Editor to create all tables, the vector search function, and RLS policies.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 4. Sample Data

```bash
cd sample_data
python create_xlsx.py
```

This generates `questionnaire.xlsx` (12 HIPAA questions). The 5 reference `.txt` files are in `sample_data/references/`.

---

## Assumptions

- Reference documents are English text documents (TXT, PDF, DOCX)
- Questionnaires have clearly structured questions (numbered rows in XLSX, numbered paragraphs in PDF/DOCX)
- Users upload both a questionnaire and reference documents per session
- One question = one answer (no multi-part sub-questions)
- Internet connectivity for OpenAI API calls

## Trade-offs

| Decision | Chose | Alternative | Why |
|---|---|---|---|
| Backend | FastAPI (Python) | Express / Flask | Async, fast, best AI/doc library support |
| RAG | LangChain | Raw OpenAI API | Clean abstractions, easy to swap components |
| Vector DB | Supabase pgvector | Pinecone / Weaviate | Single service for auth + data + vectors |
| LLM | GPT-4o-mini | GPT-4o | ~10x cheaper, sufficient quality for this use case |
| Export | DOCX only | DOCX + PDF | python-docx is reliable, PDF adds complexity |
| Orchestration | n8n (thin layer) | Direct frontend→backend | Visual workflows, separates concerns |

---

## Project Structure

```
DChat/
├── backend/
│   ├── main.py              # FastAPI app — 4 endpoints
│   ├── config.py             # Supabase client configuration
│   ├── requirements.txt
│   └── services/
│       ├── parser.py         # Questionnaire parsing (PDF/XLSX/DOCX)
│       ├── ingest.py         # Chunking + embedding (LangChain)
│       ├── rag.py            # RAG answer generation (LangChain + OpenAI)
│       ├── export.py         # DOCX generation (python-docx)
│       └── auth.py           # Authentication helper
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages (login, signup, dashboard, upload, review)
│       ├── components/       # UI components (QATable, CoverageSummary, QuestionNav, etc.)
│       ├── lib/supabase/     # Supabase client helpers
│       └── middleware.ts     # Auth route protection
├── n8n/
│   └── n8n_workflow_fixed.json  # n8n orchestration workflow
├── sample_data/
│   ├── create_xlsx.py        # Generates questionnaire.xlsx
│   ├── questionnaire.xlsx    # 12 HIPAA assessment questions
│   └── references/           # 5 reference documents (~400 words each)
├── db/
│   └── setup_db.sql          # Supabase database migration
└── README.md
```