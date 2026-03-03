import os
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

load_dotenv()

# GitHub Models configuration (OpenAI-compatible endpoint)
LLM_API_KEY = os.environ.get("GITHUB_TOKEN", os.environ.get("OPENAI_API_KEY", ""))
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://models.github.ai/inference")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " "]
)
embeddings_model = OpenAIEmbeddings(
    model=EMBEDDING_MODEL,
    base_url=LLM_BASE_URL,
    api_key=LLM_API_KEY,
)

def ingest_document(text: str, filename: str, user_id: str, doc_id: str, supabase):
    chunks = text_splitter.split_text(text)
    
    # Fast path if no chunks
    if not chunks:
        return 0
        
    vectors = embeddings_model.embed_documents(chunks)
    
    # Batch insert all chunks at once for performance
    rows = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        rows.append({
            "doc_id": doc_id,
            "user_id": user_id,
            "chunk_index": i,
            "chunk_text": chunk,
            "embedding": vector
        })
    
    supabase.table("doc_chunks").insert(rows).execute()
    
    return len(chunks)
