import io
import re
import PyPDF2
import openpyxl
from docx import Document as DocxDocument
from typing import List, Dict

def parse_questionnaire(file_bytes: bytes, filename: str) -> List[Dict[str, int | str]]:
    ext = filename.rsplit('.', 1)[-1].lower()
    questions = []
    
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
