# DChat: AI-Powered Questionnaire Answering Tool
**Comprehensive Project Report**

---

## 1. Executive Summary
DChat is an advanced, AI-powered internal tool designed to automate the process of completing extensive vendor security questionnaires and technical assessments. By leveraging a Retrieval-Augmented Generation (RAG) pipeline, DChat allows organizations to upload large spreadsheets or PDFs containing hundreds of compliance questions (e.g., HIPAA or SOC2 assessments) alongside internal reference documents. The system then autonomously retrieves relevant information from the knowledge base, synthesizes accurate answers, provides citations, assigns a confidence score, and allows for human-in-the-loop review before exporting back to a structured format.

## 2. Problem Statement
Enterprise organizations frequently receive lengthy security and compliance questionnaires from prospective clients or partners. Completing these assessments manually is tedious, error-prone, and requires subject matter experts to repeatedly search through multiple internal wikis, policies, and architecture documents. The lack of a centralized, interactive knowledge retrieval system creates a bottleneck in deal closures and compliance audits.

### Project Output
A full-stack, end-to-end web application that:
- Ingests diverse questionnaire formats (XLSX, PDF, DOCX).
- Processes unstructured corporate documents into a searchable vector database.
- Uses large language models (LLMs) to automatically generate cited responses.
- Provides a clean UI for users to review, edit, and export the finalized answers.

## 3. System Architecture & Tech Stack
The DChat architecture is decoupled into a frontend interface, an orchestration layer, a backend processing API, and a unified database/storage layer.

### 3.1 Technology Stack
- **Frontend Layer:** Next.js 16 (React 18), Tailwind CSS, TypeScript.
- **Backend API Layer:** FastAPI (Python), Uvicorn.
- **AI & RAG Pipeline:** LangChain, OpenAI / GitHub Models, PyPDF2, openpyxl, python-docx.
- **Orchestration:** n8n (multi-step workflow coordination via webhooks).
- **Database & Auth:** Supabase (PostgreSQL + pgvector extension for similarities, Supabase Auth SSR for security).

### 3.2 High-Level Data Flow
1. **Authentication:** Users authenticate via the Next.js frontend using Supabase SSR.
2. **File Ingestion:** The user uploads a questionnaire and reference documents.
3. **Orchestration:** The Next.js API proxy routes the request to n8n (or directly to FastAPI if n8n is bypassed).
4. **Backend Processing:** FastAPI receives the binary files. It parses the questionnaire into individual questions and uses LangChain to chunk and embed the reference documents into 1536-dimensional vectors.
5. **Vector Storage:** Embeddings are written to Supabase `doc_chunks` utilizing the `pgvector` extension.
6. **Answer Generation (RAG):** For each parsed question, FastAPI generates an embedding, runs a cosine similarity search (`match_chunks`) against the vector store, retrieves the top 5 most relevant chunks (with a threshold > 0.3), and sends the context + question to the LLM (GPT-4o-mini).
7. **Human Review:** Generated answers, confidence scores, and citations are returned to the frontend, where the user can manually edit them.
8. **Export:** The finalized data is compiled back into a structured DOCX format, preserving the original question numbering and flow.

## 4. Core Features and Implementation
### 4.1 Document Parsing and Indexing
The system handles various inputs. It slices large reference files into overlapping text blocks (using LangChain’s `RecursiveCharacterTextSplitter` with an overlap of 200 characters). This overlap ensures semantic continuity across chunk boundaries when searching for answers.

### 4.2 Conversational AI Agent
An independent n8n workflow contains an AI Agent node with a buffer window memory, allowing users to ask ad-hoc questions against the knowledge base outside the structured questionnaire pipeline. This agent is equipped with a `match_documents` tool to query the vector database dynamically.

### 4.3 Human-in-the-Loop Review System
DChat features a bespoke dashboard (`QATable` and `QuestionNav` components) that surfaces the automatically generated answers along with their corresponding sources.
- **Confidence Badge:** Calculates the average cosine similarity of the retrieved chunks. A low confidence score visually flags the answer for manual review.
- **Evidence Snippets:** Shows the exact text blocks the LLM used to derive its answer, enhancing auditability and trust.

### 4.4 Data Security and Isolation
Given the sensitive nature of compliance data, DChat relies on Supabase Row Level Security (RLS). Every table—`reference_docs`, `doc_chunks`, `runs`, and `qa_pairs`—has policies bound to `auth.uid()`, ensuring that one user or tenant cannot access another's uploaded documents, generated answers, or vector embeddings.

## 5. Trade-offs and Architectural Decisions
- **FastAPI over Node.js for Backend:** Chosen because the Python ecosystem (LangChain, PyPDF2, python-docx) is significantly more mature for AI and document processing tasks than TypeScript.
- **pgvector vs. Dedicated Vector DB:** Using Supabase pgvector consolidates relational data (runs, questions) and vector embeddings into a single Postgres instance, dramatically simplifying infrastructure deployment and eliminating complex synchronization.
- **Optional n8n Orchestration:** n8n was included to provide a visual workflow for the pipeline. However, the frontend proxies are designed to gracefully fall back to direct FastAPI calls if the `N8N_WEBHOOK_BASE_URL` is unavailable, ensuring high availability.

## 6. Future Enhancements
In subsequent phases, DChat will be enhanced with:
1. **OAuth Integration:** Single Sign-On (SSO) for corporate users to streamline onboarding.
2. **Hybrid Retrieval:** Integrating BM25 keyword search alongside vector similarity to improve results for highly specific technical acronyms or exact part numbers.
3. **Semantic Chunking:** Advancing the text splitter to divide documents logically by markdown headers or PDF sections rather than arbitrary character counts.
4. **Streaming Responses:** Implementing Server-Sent Events (SSE) to display responses word-by-word as the LLM generates them, drastically improving perceived performance.

## 7. Conclusion
DChat successfully demonstrates a production-ready application of Generative AI. By effectively combining a Next.js frontend, a robust Python FastAPI backend, and a carefully tuned RAG pipeline, the system dramatically reduces the cognitive load and manual effort required to complete lengthy, repetitive security questionnaires.
