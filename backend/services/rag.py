import re
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

# GitHub Models configuration (OpenAI-compatible endpoint)
LLM_API_KEY = os.environ.get("GITHUB_TOKEN", os.environ.get("OPENAI_API_KEY", ""))
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://models.github.ai/inference")
LLM_MODEL = os.environ.get("LLM_MODEL", "openai/gpt-4.1")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")

llm = ChatOpenAI(
    model=LLM_MODEL,
    temperature=0.2,
    base_url=LLM_BASE_URL,
    api_key=LLM_API_KEY,
)

embeddings_model = OpenAIEmbeddings(
    model=EMBEDDING_MODEL,
    base_url=LLM_BASE_URL,
    api_key=LLM_API_KEY,
)

DEFAULT_SYSTEM_PROMPT = """You are a compliance expert for MediSync, a healthcare SaaS company that provides
electronic health records (EHR) management and telehealth services.
Answer the question using ONLY the provided reference material.
Cite sources as [filename] after each relevant claim.
If the provided information is insufficient to fully answer, say "Not found in references."
"""

SYSTEM_PROMPT = os.environ.get("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT)

def generate_answer(question_text: str, user_id: str, supabase) -> dict:
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
    
    # 3. No matches -> not found
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
    try:
        response = chain.invoke({"question": question_text, "context": context})
        answer = response.content
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return {
             "answer": "Error generating answer. Please try again later.",
             "citations": [],
             "confidence": 0.0,
             "evidence_snippets": [],
             "is_found": False
        }
    
    # 5. Extract citations + confidence
    citations = list(set(re.findall(r'\[([^\]]+\.txt|[^\]]+\.pdf|[^\]]+\.docx)\]', answer)))
    
    # average similarity of matched chunks
    confidence = sum(c['similarity'] for c in chunks) / len(chunks)
    
    # Top 3 chunks as evidence
    evidence = [{"text": c['chunk_text'], "source": c['filename'], "similarity": c['similarity']} for c in chunks[:3]]
    
    return {
        "answer": answer,
        "citations": citations,
        "confidence": round(confidence, 2),
        "evidence_snippets": evidence,
        "is_found": True
    }
