# DChat — Technical Documentation

Detailed technical documentation for the DChat AI-powered questionnaire answering tool.

---

## UI Screenshots

### Authentication
![Login](Login.png)

### Dashboard
| Dashboard v1 | Dashboard v2 |
|:---:|:---:|
| ![Dashboard v1](DashBoard_v1.png) | ![Dashboard v2](Dashboard_v2.png) |

### Review & Edit
| Review Questions | Edit Answers |
|:---:|:---:|
| ![Review Questions](review_question.png) | ![Edit Answers](Edit.png) |

### Citations
![Citations](Citation.png)

---

## n8n Workflow Architecture

DChat uses [n8n](https://n8n.io) as the orchestration layer between the Next.js frontend and the FastAPI backend. The workflow handles 5 distinct operations through webhook endpoints.

### Workflow Overview

![n8n Workflow](n8n_workflow.png)

The workflow consists of **21 nodes** organized into 5 logical groups:

---

### 1. AI Chat Agent (Conversational RAG)

A fully autonomous AI agent that answers user questions by retrieving context from uploaded documents.

```
When chat message received → AI Agent → Return Chat Response
                                ↕
              OpenAI Chat Model (gpt-4o-mini)
              Simple Memory (buffer window)
              Retrieve from Supabase (vector search via match_documents)
                  └── OpenAI Embeddings for Retrieval
```

| Node | Type | Purpose |
|---|---|---|
| When chat message received | Chat Trigger | Receives user chat messages |
| AI Agent | LangChain Agent | Orchestrates LLM + tools + memory |
| OpenAI Chat Model | LLM | GPT-4o-mini for response generation |
| Simple Memory | Buffer Window Memory | Maintains conversation context |
| Retrieve from Supabase | Vector Store Tool | Searches `documents` table using `match_documents` function |
| OpenAI Embeddings for Retrieval | Embeddings | Generates query embeddings for similarity search |
| Return Chat Response | Respond to Webhook | Returns AI response + session ID |

---

### 2. Document Upload & Indexing

Handles document upload, chunking, embedding, and vector storage in Supabase.

```
Document Upload Webhook → Store in Supabase → Return Upload Confirmation
                              ↕
                    OpenAI Embeddings
                    Load Document
                        └── Chunk Text (recursive character splitter, overlap: 200)
```

| Node | Type | Purpose |
|---|---|---|
| Document Upload Webhook | Webhook (POST) | Receives document binary data |
| Store in Supabase | Vector Store (Insert) | Stores embeddings in `documents` table |
| OpenAI Embeddings | Embeddings | Generates document chunk embeddings |
| Load Document | Document Loader | Extracts text from binary files |
| Chunk Text | Text Splitter | Recursive character splitter (overlap: 200 chars) |
| Return Upload Confirmation | Respond to Webhook | Returns success confirmation |

---

### 3. Parse & Ingest Questionnaire

Proxies questionnaire parsing and reference document ingestion to FastAPI.

```
Parse Questionnaire Webhook → Call FastAPI Parse → Return Parse Results
       (POST /parse-and-ingest)     (POST localhost:8000/api/parse)
```

| Node | Type | Purpose |
|---|---|---|
| Parse Questionnaire Webhook | Webhook (POST) | Receives questionnaire + references as multipart form data |
| Call FastAPI Parse | HTTP Request | Forwards to FastAPI `/api/parse` with binary files + `user_id` |
| Return Parse Results | Respond to Webhook | Returns `run_id`, `question_count`, `chunks_created` |

---

### 4. Generate Answers (RAG Pipeline)

Triggers the RAG answer generation pipeline for all questions in a run.

```
Generate Answers Webhook → Call FastAPI Generate → Return Generation Results
       (POST /generate)          (POST localhost:8000/api/generate)
```

| Node | Type | Purpose |
|---|---|---|
| Generate Answers Webhook | Webhook (POST) | Receives `run_id` and `user_id` as JSON body |
| Call FastAPI Generate | HTTP Request | Forwards to FastAPI `/api/generate` |
| Return Generation Results | Respond to Webhook | Returns `status`, `run_id`, `summary` |

---

### 5. Export DOCX

Generates and returns a downloadable DOCX file for a completed run.

```
Export DOCX Webhook → Call FastAPI Export → Return DOCX File
    (POST /export)      (POST localhost:8000/api/export)
```

| Node | Type | Purpose |
|---|---|---|
| Export DOCX Webhook | Webhook (POST) | Receives `run_id` as JSON body |
| Call FastAPI Export | HTTP Request | Forwards to FastAPI `/api/export`, expects binary file response |
| Return DOCX File | Respond to Webhook | Returns DOCX binary with proper Content-Type and Content-Disposition headers |

---

## Webhook Endpoints Summary

| Webhook Path | Method | Input | Output | FastAPI Route |
|---|---|---|---|---|
| `/webhook/chat` | Chat Trigger | Chat message | AI response + session ID | — (handled by n8n AI Agent) |
| `/webhook/upload-document` | POST | Binary file | Success confirmation | — (stored directly in Supabase) |
| `/webhook/parse-and-ingest` | POST | Multipart (questionnaire + references + user_id) | run_id, question_count, chunks | `/api/parse` |
| `/webhook/generate` | POST | JSON (run_id, user_id) | status, run_id, summary | `/api/generate` |
| `/webhook/export` | POST | JSON (run_id) | DOCX binary file | `/api/export` |

---

## Credentials Required

| Credential | Used By | Notes |
|---|---|---|
| OpenAI API | Chat Model, Embeddings (×3) | Referenced as "n8n free OpenAI API credits" |
| Supabase API | Store in Supabase, Retrieve from Supabase | Project URL + service role key |

---

## Setup Instructions

1. Import `n8n/n8n_workflow_fixed.json` into your n8n instance
2. Configure credentials:
   - **OpenAI API** — Set your API key
   - **Supabase** — Set project URL and service role key
3. Update HTTP Request URLs if not running FastAPI on `localhost:8000`
4. Activate the workflow
5. Set `N8N_WEBHOOK_BASE_URL` in the frontend `.env.local` to your n8n webhook base URL

---

## Data Flow Diagram

```mermaid
graph LR
    subgraph Frontend["Next.js Frontend"]
        A1[Upload Page] --> A2[API Route /api/parse]
        A3[Review Page] --> A4[API Route /api/generate]
        A3 --> A5[API Route /api/export]
    end

    subgraph N8N["n8n Orchestration"]
        B1[Parse Webhook]
        B2[Generate Webhook]
        B3[Export Webhook]
        B4[Chat Trigger]
        B5[Upload Webhook]
    end

    subgraph Backend["FastAPI Backend"]
        C1[/api/parse]
        C2[/api/generate]
        C3[/api/export]
    end

    subgraph DB["Supabase"]
        D1[(PostgreSQL + pgvector)]
    end

    A2 --> B1 --> C1 --> D1
    A4 --> B2 --> C2 --> D1
    A5 --> B3 --> C3 --> D1
    B4 --> D1
    B5 --> D1
```
