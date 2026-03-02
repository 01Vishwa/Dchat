# QuestAI — Structured Questionnaire Answering Tool

## Focused Implementation Plan

> **Principle:** A smaller complete system is better than a larger incomplete one.
> **Stack:** Simple Next.js UI + FastAPI Python backend + n8n workflows + LangChain RAG + Supabase DB

---

## Table of Contents

1. [Company & Context](#1-company--context)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [Backend API (FastAPI)](#5-backend-api-fastapi)
6. [n8n Workflows (Orchestration)](#6-n8n-workflows-orchestration)
7. [Frontend (Next.js)](#7-frontend-nextjs)
8. [File Structure](#8-file-structure)
9. [Phase-by-Phase Implementation](#9-phase-by-phase-implementation)
10. [Sample Data](#10-sample-data)
11. [Nice-to-Have (2 Picked)](#11-nice-to-have)
12. [Trade-offs](#12-trade-offs)
13. [Deliverables](#13-deliverables)

---

## 1. Company & Context

**MediSync** — A cloud-based SaaS platform providing electronic health records (EHR) management and telehealth services to mid-size healthcare clinics across the United States. Founded in 2019, serves 200+ clinics, handles PHI for ~500K patients.

**Industry:** HealthTech / Healthcare SaaS

**Scenario:** MediSync regularly receives HIPAA vendor security assessments. The tool automates completing these using approved internal documentation.

---

## 2. Architecture

```
┌──────────────────────────────┐
│     Next.js Frontend         │
│     (Simple UI — Vercel)     │
│                              │
│  • Login / Signup            │
│  • Upload files              │
│  • Review & edit answers     │
│  • Export DOCX               │
└──────────┬───────────────────┘
           │ calls
           ▼
┌──────────────────────────────┐
│     n8n Workflows            │
│     (Orchestration Layer)    │
│                              │
│  WF1: Parse + Ingest         │──► calls FastAPI endpoints
│  WF2: Generate Answers       │──► calls FastAPI endpoints
│  WF3: Export DOCX            │──► calls FastAPI endpoints
│                              │
│  Connects frontend triggers  │
│  to backend processing       │
└──────────┬───────────────────┘
           │ HTTP calls
           ▼
┌──────────────────────────────┐
│     FastAPI Backend          │
│     (Python — all logic)     │
│                              │
│  • /parse    → parse docs    │
│  • /ingest   → chunk + embed │
│  • /generate → LangChain RAG │
│  • /export   → DOCX creation │
│                              │
│  Uses:                       │
│  • LangChain (RAG pipeline)  │
│  • Supabase client (DB)      │
│  • OpenAI (LLM + embeddings) │
│  • PyPDF2, openpyxl,         │
│    python-docx (file I/O)    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│     Supabase                 │
│  • Auth (email/password)     │
│  • PostgreSQL + pgvector     │
│  • Storage (file uploads)    │
│  • RLS policies              │
└──────────────────────────────┘
```

### How the Parts Connect

| Layer        | Role                                | Talks To           |
|--------------|-------------------------------------|---------------------|
| **Next.js**  | Simple UI — forms, tables, buttons  | n8n webhooks        |
| **n8n**      | Orchestrates multi-step flows       | FastAPI endpoints   |
| **FastAPI**  | All business logic + AI in Python   | Supabase + OpenAI   |
| **Supabase** | Auth, DB, storage — single source   | —                   |

### Why This Architecture

- **FastAPI** handles ALL Python logic (parsing, LangChain, export) in one place — no scattered scripts
- **n8n** orchestrates the multi-step workflows visually — connects frontend triggers to backend steps
- **LangChain** provides clean RAG abstractions (embeddings, vector store, retrieval chain) instead of raw API calls
- **Next.js** is just a simple UI layer — minimal logic, just forms and tables
- **Supabase** is the single database — auth, data, vectors, file storage

---

## 3. Tech Stack

| Layer          | Technology                              | Purpose                                |
|----------------|-----------------------------------------|----------------------------------------|
| Frontend       | Next.js 14 + TypeScript + Tailwind CSS  | Simple UI — 5 pages                    |
| Auth           | Supabase Auth                           | Signup, login, session                 |
| Backend        | FastAPI (Python 3.11+)                  | All business logic + AI                |
| RAG Framework  | LangChain + LangChain-OpenAI           | Embeddings, vector retrieval, QA chain |
| Orchestration  | n8n (3 workflows)                       | Multi-step workflow coordination       |
| Database       | Supabase PostgreSQL + pgvector          | Data + vector similarity search        |
| Storage        | Supabase Storage                        | File uploads                           |
| AI - LLM       | OpenAI GPT-4o-mini (via LangChain)     | Answer generation                      |
| AI - Embeddings | OpenAI text-embedding-3-small (via LangChain) | 1536-dim vectors for RAG        |
| Doc Processing | PyPDF2, openpyxl, python-docx           | Parse uploads + generate DOCX          |
| Deploy         | Vercel + Railway/Render + n8n.cloud + Supabase | All free/cheap tiers            |

### Python Dependencies (FastAPI backend)

```
fastapi
uvicorn
supabase
langchain
langchain-openai
langchain-community
PyPDF2
openpyxl
python-docx
python-multipart
```

---

## 4. Database Schema (Supabase)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Reference Documents
CREATE TABLE reference_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Chunks with Embeddings
CREATE TABLE doc_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doc_id UUID REFERENCES reference_docs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INT,
    chunk_text TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector search function (used by LangChain retriever)
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding VECTOR(1536),
    match_user_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    doc_id UUID,
    chunk_text TEXT,
    filename TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT dc.id, dc.doc_id, dc.chunk_text, rd.filename,
           1 - (dc.embedding <=> query_embedding) AS similarity
    FROM doc_chunks dc
    JOIN reference_docs rd ON rd.id = dc.doc_id
    WHERE dc.user_id = match_user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Questionnaire Runs
CREATE TABLE runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    questionnaire_filename TEXT,
    status TEXT DEFAULT 'pending',  -- pending | processing | completed
    total_questions INT DEFAULT 0,
    answered_count INT DEFAULT 0,
    not_found_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions & Answers
CREATE TABLE qa_pairs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    question_number INT,
    question_text TEXT,
    generated_answer TEXT,
    edited_answer TEXT,
    citations JSONB DEFAULT '[]',
    confidence FLOAT DEFAULT 0,
    evidence_snippets JSONB DEFAULT '[]',
    is_found BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE reference_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_docs" ON reference_docs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_chunks" ON doc_chunks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_runs" ON runs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_qa" ON qa_pairs FOR ALL
    USING (run_id IN (SELECT id FROM runs WHERE user_id = auth.uid()));
```

---

## 5. Backend API (FastAPI)

### Endpoints

| Method | Endpoint              | Purpose                                  | Called By   |
|--------|-----------------------|------------------------------------------|-------------|
| POST   | `/api/parse`          | Parse questionnaire → questions JSON     | n8n WF1     |
| POST   | `/api/ingest`         | Chunk + embed reference docs (LangChain) | n8n WF1     |
| POST   | `/api/generate`       | RAG answer generation (LangChain)        | n8n WF2     |
| POST   | `/api/export`         | Generate DOCX from run data              | n8n WF3     |
| GET    | `/api/health`         | Health check                             | monitoring  |

### `/api/parse` — Parse Questionnaire

```python
@app.post("/api/parse")
async def parse_questionnaire(file: UploadFile, user_id: str):
    """
    Accepts PDF/XLSX/DOCX. Returns extracted questions.
    
    Logic:
    - Detect file type by extension
    - PDF:  PyPDF2 → extract text → split by numbered patterns
    - XLSX: openpyxl → read rows from first column
    - DOCX: python-docx → extract paragraphs matching Q patterns
    - Insert run into Supabase
    - Insert each question as qa_pair
    
    Returns: { run_id, questions: [{number, text}] }
    """
```

### `/api/ingest` — Chunk & Embed Reference Docs (LangChain)

```python
@app.post("/api/ingest")
async def ingest_references(files: List[UploadFile], user_id: str):
    """
    Uses LangChain for chunking + embedding.
    
    Logic:
    - For each file:
      - Extract text content
      - LangChain RecursiveCharacterTextSplitter(chunk_size=1000, overlap=200)
      - LangChain OpenAIEmbeddings(model="text-embedding-3-small")
      - Store chunks + embeddings in Supabase doc_chunks table
    
    Returns: { doc_ids: [], total_chunks: int }
    """
```

**LangChain usage:**
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " "]
)
chunks = text_splitter.split_text(doc_text)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectors = embeddings.embed_documents(chunks)
```

### `/api/generate` — RAG Answer Generation (LangChain)

```python
@app.post("/api/generate")
async def generate_answers(run_id: str, user_id: str, question_ids: List[str] = None):
    """
    Core RAG pipeline using LangChain.
    
    For each question:
    1. Embed question using LangChain OpenAIEmbeddings
    2. Supabase RPC match_chunks() → top 5 similar chunks
    3. If matches found (similarity > 0.3):
       - Build LangChain prompt with retrieved context
       - LangChain ChatOpenAI(model="gpt-4o-mini") generates answer
       - Extract citations from answer text
       - Confidence = average similarity of retrieved chunks
       - Store evidence snippets (top 3 chunks)
    4. If no matches:
       - Answer = "Not found in references."
       - confidence = 0, is_found = false
    5. Update qa_pairs in Supabase
    
    Returns: { run_id, status, summary: {answered, not_found, avg_confidence} }
    """
```

**LangChain RAG pattern:**
```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")

# Embed question
q_vector = embeddings_model.embed_query(question_text)

# Retrieve from Supabase pgvector
chunks = supabase.rpc("match_chunks", {
    "query_embedding": q_vector,
    "match_user_id": user_id,
    "match_count": 5,
    "match_threshold": 0.3
}).execute()

# Build prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a compliance expert for MediSync, a healthcare SaaS company.
Answer the question using ONLY the provided reference material.
Cite sources as [filename] after each relevant claim.
If the information is insufficient, state what is missing."""),
    ("human", """Question: {question}

Reference Material:
{context}

Provide a clear, concise answer with citations:""")
])

# Generate
chain = prompt | llm
context = "\n---\n".join([
    f"From [{c['filename']}]:\n{c['chunk_text']}" 
    for c in chunks.data
])
response = chain.invoke({"question": question_text, "context": context})
```

### `/api/export` — Generate DOCX

```python
@app.post("/api/export")
async def export_docx(run_id: str):
    """
    Generates downloadable DOCX file.
    
    Uses python-docx to create:
    - Title: "Questionnaire Response — MediSync"
    - Summary: total, answered, not found, avg confidence
    - For each Q/A:
      - Question (bold)
      - Answer (uses edited_answer if exists, else generated_answer)
      - Citations
      - Confidence level (High/Medium/Low)
    
    Returns: FileResponse (DOCX binary)
    """
```

---

## 6. n8n Workflows (Orchestration)

n8n sits between frontend and backend — **orchestrates multi-step flows** by calling FastAPI endpoints in sequence.

### WF1: Parse + Ingest

```
Webhook POST /parse-and-ingest
│
│  Receives from frontend: { questionnaire (base64), references (base64[]), user_id }
│
├── Step 1: HTTP Request → FastAPI POST /api/parse
│   (sends questionnaire file + user_id)
│   ← receives { run_id, questions[] }
│
├── Step 2: HTTP Request → FastAPI POST /api/ingest
│   (sends reference files + user_id)
│   ← receives { doc_ids[], total_chunks }
│
└── Respond to Webhook: { run_id, question_count, chunks_created }
```

### WF2: Generate Answers

```
Webhook POST /generate
│
│  Receives: { run_id, user_id, question_ids? }
│
├── HTTP Request → FastAPI POST /api/generate
│   (sends run_id, user_id, optional question_ids)
│   ← receives { run_id, status, summary }
│
└── Respond to Webhook: { run_id, status, summary }
```

### WF3: Export DOCX

```
Webhook POST /export
│
│  Receives: { run_id }
│
├── HTTP Request → FastAPI POST /api/export
│   ← receives binary DOCX
│
└── Respond to Webhook: binary DOCX file
```

### Why n8n Is Thin Here

n8n's role is **workflow orchestration** — it receives webhook calls from the frontend, calls FastAPI in the right sequence, and returns results. The heavy logic (parsing, LangChain RAG, DOCX generation) all lives in FastAPI Python. This keeps:
- **n8n workflows simple** (2-3 nodes each)
- **Python logic centralized** in FastAPI (testable, debuggable, version controlled)
- **Frontend decoupled** from backend details

### n8n Credentials

| Credential | Type | Purpose |
|---|---|---|
| HTTP Header Auth | Custom header | `X-API-Key` for FastAPI authentication |

---

## 7. Frontend (Next.js)

### Design Principle: Keep It Simple

- No complex state management (just `useState` + `useEffect`)
- No component library — Tailwind CSS utility classes only
- Pages fetch from Supabase or call n8n webhooks via API routes
- Auth handled entirely by Supabase — zero custom auth logic

### Pages (5 total)

| Page             | Route              | What It Shows                              |
|------------------|--------------------|---------------------------------------------|
| Login            | `/login`           | Email + password form                       |
| Signup           | `/signup`          | Email + password form                       |
| Dashboard        | `/dashboard`       | List of past runs + "New" button            |
| Upload           | `/upload`          | File inputs → triggers parse + ingest       |
| Review & Export  | `/review/[runId]`  | Q/A table, edit, confidence, evidence, export |

### API Routes (proxy to n8n)

| Route                    | Proxies To            | Purpose                    |
|--------------------------|-----------------------|----------------------------|
| `POST /api/parse`        | n8n WF1 webhook       | Upload + parse + ingest    |
| `POST /api/generate`     | n8n WF2 webhook       | Trigger RAG generation     |
| `POST /api/export`       | n8n WF3 webhook       | Get DOCX binary            |

### Components (5 simple ones)

| Component            | What It Does                                       |
|---------------------|----------------------------------------------------|
| `AuthForm.tsx`       | Reusable email/password form for login + signup    |
| `FileUpload.tsx`     | Simple file input with drag-and-drop               |
| `QATable.tsx`        | Table of questions + answers with inline edit       |
| `ConfidenceBadge.tsx`| Color dot: green >70%, yellow 40-70%, red <40%     |
| `CoverageSummary.tsx`| Stats bar: total / answered / not found            |

### Review Page Layout

```
┌─────────────────────────────────────────────────────┐
│  Coverage: 12 total │ 10 answered │ 2 not found     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Q1: How is patient data encrypted...?               │
│    Answer: AES-256 at rest, TLS 1.3... [sec.txt]     │
│    🟢 92%  │  ▶ Evidence  │  [Edit]                  │
│                                                      │
│  Q2: Describe incident response...                   │
│    Answer: 4-phase approach... [incident.txt]         │
│    🟡 67%  │  ▶ Evidence  │  [Edit]                  │
│                                                      │
│  Q12: HIPAA compliance...                            │
│    Answer: Not found in references.                   │
│    🔴 0%                                             │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [Save Edits]                        [Export DOCX]   │
└─────────────────────────────────────────────────────┘
```

---

## 8. File Structure

```
questionnaire-tool/
│
├── frontend/                          # Next.js (simple UI)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout + nav
│   │   │   ├── page.tsx               # Landing → redirect to /login
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── upload/page.tsx
│   │   │   ├── review/[runId]/page.tsx
│   │   │   └── api/
│   │   │       ├── parse/route.ts     # proxy → n8n WF1
│   │   │       ├── generate/route.ts  # proxy → n8n WF2
│   │   │       └── export/route.ts    # proxy → n8n WF3
│   │   ├── lib/
│   │   │   ├── supabase/client.ts     # Browser Supabase client
│   │   │   ├── supabase/server.ts     # Server Supabase client
│   │   │   └── n8n.ts                 # Webhook call helper
│   │   └── components/
│   │       ├── AuthForm.tsx
│   │       ├── FileUpload.tsx
│   │       ├── QATable.tsx
│   │       ├── ConfidenceBadge.tsx
│   │       └── CoverageSummary.tsx
│   ├── middleware.ts                   # Auth guard
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
├── backend/                            # FastAPI (all logic)
│   ├── main.py                         # FastAPI app + route definitions
│   ├── services/
│   │   ├── parser.py                   # Parse PDF/XLSX/DOCX → questions
│   │   ├── ingest.py                   # LangChain chunk + embed
│   │   ├── rag.py                      # LangChain RAG pipeline
│   │   └── export.py                   # python-docx DOCX generation
│   ├── config.py                       # Env vars + Supabase client init
│   ├── requirements.txt
│   └── Dockerfile                      # For Railway/Render deploy
│
├── n8n_workflows/                      # Exported workflow JSONs
│   ├── wf1_parse_and_ingest.json
│   ├── wf2_generate_answers.json
│   └── wf3_export_docx.json
│
├── sample_data/
│   ├── questionnaire.xlsx              # 12 HIPAA questions
│   └── references/
│       ├── security_policy.txt
│       ├── data_handling.txt
│       ├── incident_response.txt
│       ├── access_control.txt
│       └── infrastructure.txt
│
├── supabase/
│   └── migrations/001_schema.sql       # Schema from Section 4
│
└── README.md
```

---

## 9. Phase-by-Phase Implementation

---

### PHASE 0: Setup (~15 min)

| Step | Action                                          |
|------|-------------------------------------------------|
| 0.1  | Create Supabase project → get URL + keys        |
| 0.2  | Run schema SQL in Supabase SQL editor            |
| 0.3  | Create Storage bucket `documents` (private)      |
| 0.4  | Scaffold Next.js: `npx create-next-app frontend` |
| 0.5  | Install frontend deps: `@supabase/supabase-js`, `@supabase/ssr` |
| 0.6  | Create FastAPI project: `backend/` with `requirements.txt` |
| 0.7  | Install backend deps: `pip install -r requirements.txt` |
| 0.8  | Set up n8n cloud account → add HTTP credential   |
| 0.9  | Create `.env` files for frontend + backend       |

**Frontend `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
N8N_WEBHOOK_BASE_URL=https://xxx.app.n8n.cloud/webhook
```

**Backend `.env`:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=sk-xxx
API_KEY=xxx
```

**Deliverable:** All services running locally, DB schema deployed.

---

### PHASE 1: Auth + Upload + Parse + Ingest (~45 min)

#### 1A: Supabase Auth + Frontend Pages (~15 min)

| File                    | What                                           |
|-------------------------|-------------------------------------------------|
| `lib/supabase/client.ts`| `createBrowserClient(url, anonKey)`            |
| `lib/supabase/server.ts`| `createServerClient(url, anonKey, {cookies})`  |
| `middleware.ts`          | Redirect unauthenticated → `/login`            |
| `login/page.tsx`         | Email/password → `supabase.auth.signInWithPassword()` |
| `signup/page.tsx`        | Email/password → `supabase.auth.signUp()`      |
| `layout.tsx`             | Nav bar with logout button                     |
| `components/AuthForm.tsx`| Shared form component for login/signup         |

#### 1B: Upload Page + FileUpload Component (~10 min)

| Feature                | Detail                                         |
|------------------------|-------------------------------------------------|
| Questionnaire upload    | Single file input: .pdf, .xlsx, .docx          |
| Reference docs upload   | Multi-file input: .txt, .pdf, .docx            |
| Submit button           | Sends files to Next.js API route `/api/parse`  |
| Loading state           | Show spinner during processing                 |

#### 1C: FastAPI Parse Endpoint (~10 min)

```python
# backend/services/parser.py
import io, re
import PyPDF2
import openpyxl
from docx import Document as DocxDocument

def parse_questionnaire(file_bytes: bytes, filename: str):
    ext = filename.rsplit('.', 1)[-1].lower()
    
    if ext == 'pdf':
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = " ".join(page.extract_text() for page in reader.pages)
        parts = re.split(r'\d+[\.\)]\s', text)
        questions = [p.strip() for p in parts if p.strip()]
        
    elif ext == 'xlsx':
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes))
        ws = wb.active
        questions = [row[0].value for row in ws.iter_rows(min_row=2) if row[0].value]
        
    elif ext == 'docx':
        doc = DocxDocument(io.BytesIO(file_bytes))
        questions = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    else:
        raise ValueError(f"Unsupported file type: {ext}")
    
    return [{"number": i+1, "text": q} for i, q in enumerate(questions)]
```

#### 1D: FastAPI Ingest Endpoint with LangChain (~10 min)

```python
# backend/services/ingest.py
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " "]
)
embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")

async def ingest_document(text, filename, user_id, doc_id, supabase):
    chunks = text_splitter.split_text(text)
    vectors = embeddings_model.embed_documents(chunks)
    
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        supabase.table("doc_chunks").insert({
            "doc_id": doc_id,
            "user_id": user_id,
            "chunk_index": i,
            "chunk_text": chunk,
            "embedding": vector
        }).execute()
    
    return len(chunks)
```

#### 1E: n8n WF1 + Next.js API Route (~5 min)

- n8n workflow: Webhook → HTTP POST FastAPI `/api/parse` → HTTP POST FastAPI `/api/ingest` → Respond
- Next.js `api/parse/route.ts`: forward form data to n8n webhook URL

**Deliverable:** User can sign up, log in, upload files, questions parsed + references embedded.

---

### PHASE 2: RAG Generate + Review/Edit + Export (~50 min)

#### 2A: FastAPI RAG Endpoint with LangChain (~20 min)

```python
# backend/services/rag.py
import re
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import ChatPromptTemplate

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")

SYSTEM_PROMPT = """You are a compliance expert for MediSync, a healthcare SaaS company.
Answer the question using ONLY the provided reference material.
Cite sources as [filename] after each relevant claim.
If the provided information is insufficient to fully answer, say "Not found in references." """

async def generate_answer(question_text, user_id, supabase):
    # 1. Embed question
    q_vector = embeddings_model.embed_query(question_text)
    
    # 2. Retrieve from Supabase pgvector
    result = supabase.rpc("match_chunks", {
        "query_embedding": q_vector,
        "match_user_id": user_id,
        "match_count": 5,
        "match_threshold": 0.3
    }).execute()
    chunks = result.data
    
    # 3. No matches → not found
    if not chunks:
        return {
            "answer": "Not found in references.",
            "citations": [],
            "confidence": 0.0,
            "evidence_snippets": [],
            "is_found": False
        }
    
    # 4. Build context + generate via LangChain
    context = "\n---\n".join(
        f"From [{c['filename']}]:\n{c['chunk_text']}" for c in chunks
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "Question: {question}\n\nReference Material:\n{context}\n\nAnswer with citations:")
    ])
    chain = prompt | llm
    response = chain.invoke({"question": question_text, "context": context})
    answer = response.content
    
    # 5. Extract citations + confidence
    citations = list(set(re.findall(r'\[([^\]]+\.txt)\]', answer)))
    confidence = sum(c['similarity'] for c in chunks) / len(chunks)
    evidence = [{"text": c['chunk_text'], "source": c['filename'],
                 "similarity": c['similarity']} for c in chunks[:3]]
    
    return {
        "answer": answer,
        "citations": citations,
        "confidence": round(confidence, 2),
        "evidence_snippets": evidence,
        "is_found": True
    }
```

#### 2B: n8n WF2 + Next.js trigger (~5 min)

- n8n: Webhook → HTTP POST FastAPI `/api/generate` → Respond
- Next.js: "Generate Answers" button on upload page calls `/api/generate`

#### 2C: Review Page + Components (~15 min)

| Component              | What It Renders                                    |
|------------------------|----------------------------------------------------|
| `CoverageSummary.tsx`  | Bar: total / answered / not found / avg confidence |
| `QATable.tsx`          | List of Q/A cards with edit + evidence toggle      |
| `ConfidenceBadge.tsx`  | 🟢 >70% / 🟡 40-70% / 🔴 <40%                     |

**Review page flow:**
1. Fetch run + qa_pairs from Supabase on page load
2. Display in QATable
3. "Edit" → inline textarea → save `edited_answer` to Supabase
4. "Export" → `/api/export` → download DOCX

#### 2D: FastAPI Export Endpoint (~5 min)

```python
# backend/services/export.py
from docx import Document

def generate_docx(run_data, qa_pairs):
    doc = Document()
    doc.add_heading("Questionnaire Response — MediSync", level=1)
    doc.add_paragraph(f"Generated: {run_data['created_at'][:10]}")
    
    # Summary
    doc.add_heading("Summary", level=2)
    doc.add_paragraph(
        f"Total: {run_data['total_questions']} | "
        f"Answered: {run_data['answered_count']} | "
        f"Not Found: {run_data['not_found_count']}"
    )
    
    # Each Q/A
    for qa in qa_pairs:
        doc.add_heading(f"Q{qa['question_number']}: {qa['question_text']}", level=2)
        answer = qa.get('edited_answer') or qa.get('generated_answer', '')
        doc.add_paragraph(f"Answer: {answer}")
        if qa.get('citations'):
            doc.add_paragraph(f"Citations: {', '.join(qa['citations'])}")
        conf = qa.get('confidence', 0)
        level = "High" if conf > 0.7 else "Medium" if conf > 0.4 else "Low"
        doc.add_paragraph(f"Confidence: {level} ({int(conf*100)}%)")
        doc.add_paragraph("─" * 50)
    
    path = f"/tmp/export_{run_data['id']}.docx"
    doc.save(path)
    return path
```

#### 2E: n8n WF3 + Dashboard Page (~5 min)

- n8n: Webhook → HTTP POST FastAPI `/api/export` → return binary
- Dashboard: fetch runs from Supabase, list with links to `/review/[runId]`

**Deliverable:** Full end-to-end: upload → generate → review/edit → export DOCX.

---

### PHASE 3: Nice-to-Have + Sample Data + Deploy (~20 min)

#### 3A: Confidence Score (already done)
- Calculated in `rag.py` as avg similarity
- Displayed via `ConfidenceBadge.tsx`

#### 3B: Evidence Snippets (~5 min)
- Already stored in `qa_pairs.evidence_snippets` JSONB
- Add expandable section in `QATable.tsx`: snippet text + source + similarity %

#### 3C: Sample Data (~5 min)
- Create `questionnaire.xlsx` with 12 rows
- Create 5 `.txt` reference files (~300-500 words each)

#### 3D: Deploy + End-to-End Test (~10 min)

| Service     | Deploy To         | How                            |
|-------------|-------------------|--------------------------------|
| Frontend    | Vercel             | `vercel --prod`                |
| Backend     | Railway / Render   | Push `backend/Dockerfile`      |
| Workflows   | n8n.cloud          | Import 3 JSON files            |
| Database    | Supabase           | Already cloud-hosted           |

Test: Signup → Upload sample data → Generate → Review → Edit → Export DOCX

**Deliverable:** Live app with sample data, all features working.

---

## 10. Sample Data

### Questionnaire (12 Questions — HIPAA Vendor Assessment)

| #  | Question                                                              |
|----|-----------------------------------------------------------------------|
| 1  | How is patient data encrypted at rest and in transit?                 |
| 2  | Describe your incident response plan and notification procedures.     |
| 3  | Who has access to production databases containing PHI?                |
| 4  | How do you handle data retention and deletion requests?               |
| 5  | What physical security measures protect your data centers?            |
| 6  | Describe your employee security awareness training program.           |
| 7  | How do you manage third-party vendor access to patient data?          |
| 8  | What is your disaster recovery and business continuity plan?          |
| 9  | How do you perform vulnerability assessments and penetration testing? |
| 10 | Describe your access control and authentication mechanisms.           |
| 11 | What logging and monitoring systems are in place for PHI access?      |
| 12 | How do you ensure compliance with HIPAA Security Rule requirements?   |

**Q12 intentionally NOT covered** → demonstrates "Not found in references."

### Reference Documents (5 files, ~300-500 words each)

| File                     | Covers Questions   |
|--------------------------|--------------------|
| `security_policy.txt`    | Q1, Q9, Q11        |
| `data_handling.txt`      | Q4, Q7             |
| `incident_response.txt`  | Q2, Q6             |
| `access_control.txt`     | Q3, Q10            |
| `infrastructure.txt`     | Q5, Q8             |

---

## 11. Nice-to-Have (2 Picked)

### 1. Confidence Score
- Calculated in `rag.py` as average cosine similarity of retrieved chunks
- Displayed as color badge: 🟢 >70% │ 🟡 40-70% │ 🔴 <40%
- Zero extra logic — byproduct of the RAG retrieval step

### 2. Evidence Snippets
- Top 3 chunks stored in `qa_pairs.evidence_snippets` JSONB
- Expandable panel per question: source text + filename + similarity %
- Zero extra API calls — already captured during generation

---

## 12. Trade-offs

| Decision                | Chose                             | Alternative                 | Why                                                  |
|-------------------------|-----------------------------------|-----------------------------|------------------------------------------------------|
| Backend                 | FastAPI (Python)                  | Express / Flask             | Async, fast, best AI/doc library ecosystem           |
| RAG framework           | LangChain                         | Raw OpenAI API calls        | Clean abstractions, easy to swap models later        |
| Orchestration           | n8n (thin layer)                  | Direct frontend→backend     | Visual workflows, meets workflow URL requirement     |
| Vector DB               | Supabase pgvector                 | Pinecone / Weaviate         | Single service for auth + data + vectors             |
| LLM                     | GPT-4o-mini                       | GPT-4o                      | ~10x cheaper, good enough for this use case          |
| Frontend                | Simple Next.js (5 pages)          | Complex SPA / Streamlit     | Simplicity > polish for MVP                          |
| Export                  | DOCX only                         | DOCX + PDF                  | python-docx is reliable, PDF adds complexity         |
| Nice-to-have            | Confidence + Evidence (2)         | All 5                       | Free byproducts of RAG — max value, zero complexity  |
| n8n role                | Thin orchestrator                 | Heavy logic in n8n          | Python in FastAPI is testable + version controlled   |

### What I Would Improve With More Time

1. **Hybrid retrieval** — vector + BM25 keyword for better recall
2. **Semantic chunking** — split by sections/headings not fixed windows
3. **Streaming responses** — SSE for real-time answer generation
4. **PDF export** — alongside DOCX
5. **Real-time progress** — Supabase Realtime for per-question status
6. **Caching** — cache embeddings for repeated questions

---

## 13. Deliverables

| Item              | What                                        |
|-------------------|---------------------------------------------|
| Live app          | `https://questai.vercel.app`                |
| GitHub repo       | Full source code + sample data              |
| n8n Workflow URL  | 3 workflows at n8n.cloud                    |
| README            | Company, architecture, trade-offs           |

### README Outline

```
# QuestAI — Structured Questionnaire Answering Tool

## What I Built
RAG-powered tool that automates HIPAA vendor assessment
completion using internal reference documents.

## Industry & Company
Healthcare SaaS — MediSync (EHR + telehealth, 200+ clinics, 500K patients)

## Architecture
Next.js (UI) → n8n (orchestration) → FastAPI + LangChain (RAG backend) → Supabase (DB)

## How to Run
1. Clone repo
2. Set up Supabase → run migration
3. cd backend && pip install -r requirements.txt && uvicorn main:app
4. cd frontend && npm install && npm run dev
5. Import n8n workflows + set credentials

## Assumptions
- Reference docs are English text
- Questionnaire has clearly numbered questions
- Users upload questionnaire + references per session

## Trade-offs
- FastAPI + LangChain centralizes AI logic in Python
- n8n is a thin orchestrator, not heavy logic
- GPT-4o-mini over GPT-4o for cost
- DOCX-only export
- pgvector over dedicated vector DB

## Would Improve
- Hybrid retrieval (vector + BM25)
- Streaming answer generation
- Semantic chunking
- PDF export
```

---

## Estimated Timeline

| Phase       | Description                                    | Time     |
|-------------|------------------------------------------------|----------|
| **Phase 0** | Setup (Supabase + FastAPI + Next.js + n8n)     | ~15 min  |
| **Phase 1** | Auth + Upload + Parse + Ingest (LangChain)     | ~45 min  |
| **Phase 2** | RAG Generate + Review/Edit + Export            | ~50 min  |
| **Phase 3** | Nice-to-have + Sample data + Deploy            | ~20 min  |
| **Total**   |                                                | **~2h 10min** |

---

*Stack: Next.js (simple UI) + FastAPI (backend) + LangChain (RAG) + n8n (orchestration) + Supabase (DB)*
*FastAPI endpoints: 4 │ n8n workflows: 3 │ UI pages: 5 │ Components: 5 │ Nice-to-haves: 2*
