# DChat — Structured Questionnaire Answering Tool

An AI-powered tool that automates completing vendor security assessments using internal reference documents. Built with a RAG (Retrieval-Augmented Generation) pipeline.

---

A full-stack application where users can:

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

### Nice-to-Have Features Implemented (4 of 5)

- **Confidence Score** — Average cosine similarity from pgvector, displayed as color-coded badge
- **Evidence Snippets** — Top 3 retrieved chunks shown per answer with source and similarity %
- **Version History** — Dashboard shows all past runs with status, dates, and stats
- **Coverage Summary** — Total questions, answered count, not-found count, coverage %, avg confidence

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

## What I Would Improve With More Time

1. **Hybrid retrieval** — Combine vector search with BM25 keyword search for better recall
2. **Semantic chunking** — Split by document sections/headings instead of fixed character windows
3. **Streaming responses** — Server-Sent Events for real-time per-question progress
4. **PDF export** — Add PDF alongside DOCX
5. **Backend auth validation** — Verify JWT tokens on the backend instead of trusting `user_id` from request body
6. **Batch DB inserts** — Insert all chunks in one call instead of a loop
7. **File cleanup** — Auto-delete exported DOCX files after download

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
│       └── export.py         # DOCX generation (python-docx)
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages (login, signup, dashboard, upload, review)
│       ├── components/       # UI components (QATable, CoverageSummary, etc.)
│       ├── lib/supabase/     # Supabase client helpers
│       └── middleware.ts     # Auth route protection
├── sample_data/
│   ├── create_xlsx.py        # Generates questionnaire.xlsx
│   ├── questionnaire.xlsx    # 12 HIPAA assessment questions
│   └── references/           # 5 reference documents (~400 words each)
└── setup_db.sql              # Supabase database migration
```