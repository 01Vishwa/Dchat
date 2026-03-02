from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.background import BackgroundTask
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from contextlib import asynccontextmanager

from config import get_supabase
from services.parser import parse_questionnaire
from services.ingest import ingest_document
from services.rag import generate_answer
from services.export import generate_docx

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup things like DB connection logic if needed
    yield
    # Cleanup logic

app = FastAPI(title="DChat QA API", lifespan=lifespan)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/parse")
async def parse_and_ingest(
    user_id: str = Form(...),
    questionnaire: UploadFile = File(...),
    references: List[UploadFile] = File(...)
):
    """
    Combined Parse + Ingest Endpoint.
    1. Parses the questionnaire
    2. Stores the run and questions in Supabase
    3. Ingests all reference documents using LangChain
    """
    try:
        supabase = get_supabase()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # --- 1. Parse Questionnaire ---
    quest_bytes = await questionnaire.read()
    try:
        questions = parse_questionnaire(quest_bytes, questionnaire.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse questionnaire: {str(e)}")

    # Store run
    run_response = supabase.table("runs").insert({
        "user_id": user_id,
        "questionnaire_filename": questionnaire.filename,
        "total_questions": len(questions)
    }).execute()
    
    if not run_response.data:
        raise HTTPException(status_code=500, detail="Failed to create run record")
        
    run_id = run_response.data[0]['id']

    # Store questions
    qa_inserts = []
    for q in questions:
        qa_inserts.append({
            "run_id": run_id,
            "question_number": q['number'],
            "question_text": q['text']
        })
    if qa_inserts:
        supabase.table("qa_pairs").insert(qa_inserts).execute()

    # --- 2. Ingest Reference Documents ---
    doc_ids = []
    total_chunks = 0
    
    for ref_file in references:
        ref_bytes = await ref_file.read()
        ref_text = ""
        
        # Simple text extraction based on file type
        ext = ref_file.filename.split('.')[-1].lower()
        if ext == 'txt':
            ref_text = ref_bytes.decode('utf-8', errors='ignore')
        elif ext == 'pdf':
            import io, PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(ref_bytes))
            ref_text = " ".join(page.extract_text() for page in reader.pages)
        elif ext == 'docx':
            import io
            from docx import Document as DocxDocument
            doc = DocxDocument(io.BytesIO(ref_bytes))
            ref_text = "\n".join(p.text for p in doc.paragraphs)
        else:
            print(f"Skipping unsupported reference type: {ref_file.filename}")
            continue

        if not ref_text.strip():
            continue

        # Create reference doc entry
        doc_resp = supabase.table("reference_docs").insert({
            "user_id": user_id,
            "filename": ref_file.filename
        }).execute()
        
        if doc_resp.data:
            doc_id = doc_resp.data[0]['id']
            doc_ids.append(doc_id)
            
            # Chunk and embed
            chunks_created = ingest_document(ref_text, ref_file.filename, user_id, doc_id, supabase)
            total_chunks += chunks_created

    return {
        "run_id": run_id,
        "question_count": len(questions),
        "chunks_created": total_chunks,
        "doc_ids": doc_ids
    }

class GenerateRequest(BaseModel):
    run_id: str
    user_id: str
    question_ids: Optional[List[str]] = None

@app.post("/api/generate")
async def generate_answers(req: GenerateRequest):
    """
    RAG pipeline generation for all questions linked to a given run.
    1. Fetches questions for the run
    2. Runs RAG via LangChain pg_vector
    3. Updates the answer fields in Supabase
    """
    try:
        supabase = get_supabase()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Fetch questions for run
    query = supabase.table("qa_pairs").select("*").eq("run_id", req.run_id)
    if req.question_ids:
        query = query.in_("id", req.question_ids)
        
    qa_resp = query.execute()
    
    if not qa_resp.data:
        raise HTTPException(status_code=404, detail="No questions found for this run")
        
    questions = qa_resp.data
    answered = 0
    not_found = 0
    conf_sum = 0
    
    # Process each question
    for q in questions:
        # Generate the answer
        res = generate_answer(q['question_text'], req.user_id, supabase)
        
        # Update qa_pairs with generated answer
        supabase.table("qa_pairs").update({
            "generated_answer": res['answer'],
            "citations": res['citations'],
            "confidence": res['confidence'],
            "evidence_snippets": res['evidence_snippets'],
            "is_found": res['is_found']
        }).eq("id", q['id']).execute()
        
        # Update run stats tracking
        if res['is_found']:
            answered += 1
            conf_sum += res['confidence']
        else:
            not_found += 1
            
    # Update Run table overall totals
    avg_confidence = conf_sum / max(answered, 1)  # avoid division by 0
    supabase.table("runs").update({
        "status": "completed",
        "answered_count": answered,
        "not_found_count": not_found
    }).eq("id", req.run_id).execute()
    
    return {
        "run_id": req.run_id,
        "status": "completed",
        "summary": {
            "answered": answered,
            "not_found": not_found,
            "avg_confidence": round(avg_confidence, 2)
        }
    }

class ExportRequest(BaseModel):
    run_id: str

@app.post("/api/export")
async def export_docx_endpoint(req: ExportRequest):
    """
    Generates and returns a DOCX file for a given run ID.
    1. Fetches run metadata
    2. Fetches all Q/A pairs for the run
    3. Calls generate_docx and returns the file
    """
    try:
        supabase = get_supabase()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Fetch run
    run_resp = supabase.table("runs").select("*").eq("id", req.run_id).execute()
    if not run_resp.data:
        raise HTTPException(status_code=404, detail="Run not found")
        
    run_data = run_resp.data[0]

    # Fetch QAs
    qa_resp = supabase.table("qa_pairs").select("*").eq("run_id", req.run_id).order("question_number").execute()
    qa_pairs = qa_resp.data or []

    try:
        file_path = generate_docx(run_data, qa_pairs)
        return FileResponse(
            path=file_path, 
            filename=f"DChat_Response_{req.run_id[:8]}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(lambda: os.remove(file_path) if os.path.exists(file_path) else None)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docx generation failed: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
