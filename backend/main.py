import os
import uuid
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.retrievers import BM25Retriever
from langchain_core.embeddings import Embeddings

class MockEmbeddings(Embeddings):
    """Fallback embedding class if Gemini fails."""
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [[0.0] * 768 for _ in texts]
    def embed_query(self, text: str) -> List[float]:
        return [0.0] * 768

# Load environment configuration
load_dotenv()

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Debug environment variables (masked)
gemini_key = os.getenv("GEMINI_API_KEY", "")
if gemini_key:
    logger.info(f"GEMINI_API_KEY is set (length: {len(gemini_key)})")
else:
    logger.warning("GEMINI_API_KEY is NOT set!")

app = FastAPI(title="RAG Backend API")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://rag.ruthranraghavan.com", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# 1. Global Setup (Models & In-Memory Store)
# ──────────────────────────────────────────────
groq_api_key = os.getenv("GROQ_API_KEY", "dummy_key")
llm = ChatGroq(model=os.getenv("MODEL_NAME", "llama-3.1-8b-instant"), api_key=groq_api_key)

# Global status to track startup errors
STARTUP_ERROR: Optional[str] = None

def get_robust_embeddings():
    """Tries multiple Gemini embedding models to find one that works."""
    global STARTUP_ERROR
    api_key = os.getenv("GEMINI_API_KEY", "")
    
    if not api_key or api_key == "dummy_key":
        msg = "GEMINI_API_KEY is missing or set to dummy_key!"
        logger.error(msg)
        STARTUP_ERROR = msg
        return MockEmbeddings()

    # List of models to attempt. 
    potential_models = [
        "models/gemini-embedding-001",
        "models/text-embedding-004",
        "models/embedding-001",
        "gemini-embedding-001",
        "text-embedding-004",
    ]
    
    errors = []
    for model_name in potential_models:
        try:
            logger.info(f"Attempting to initialize Gemini embeddings with model: {model_name}")
            test_embeddings = GoogleGenerativeAIEmbeddings(model=model_name, google_api_key=api_key)
            # Trigger an actual API call to verify it works
            test_embeddings.embed_query("test")
            logger.info(f"Successfully initialized embeddings with model: {model_name}")
            STARTUP_ERROR = None # Reset error if we found a working model
            return test_embeddings
        except Exception as e:
            err_msg = f"{model_name} failed: {str(e)}"
            logger.warning(err_msg)
            errors.append(err_msg)
            continue
            
    STARTUP_ERROR = " | ".join(errors)
    logger.error(f"Failed to initialize any Gemini embedding model. Falling back to MockEmbeddings. Errors: {STARTUP_ERROR}")
    return MockEmbeddings()

# Initialize globally
embeddings = get_robust_embeddings()

# In-memory session store mapping session_id -> { "chunks": [], "vectordb": FAISS, "keyword_retriever": BM25Retriever }
SESSION_STORE: Dict[str, Dict[str, Any]] = {}

SYSTEM_PROMPT = (
    "You are a helpful AI assistant powered by HERE AND NOW AI. "
    "Answer questions based ONLY on the provided context. "
    "Provide specific details like dates, names, and numbers when available. "
    "If the context does not contain enough information, say so politely."
)

# ──────────────────────────────────────────────
# 2. PDF Processing & Retrieval Logic
# ──────────────────────────────────────────────

def initialize_session_state() -> Dict[str, Any]:
    """Load default mcp.pdf into session state."""
    if STARTUP_ERROR:
        logger.warning(f"Using baseline session with embedding warnings: {STARTUP_ERROR}")
    
    pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp.pdf")
    if not os.path.exists(pdf_path):
        return {"chunks": [], "vectordb": None, "keyword_retriever": None}

    try:
        docs = PyPDFLoader(pdf_path).load()
        chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(docs)
        
        if not chunks:
            logger.warning("No text found in mcp.pdf. Returning empty session.")
            return {"chunks": [], "vectordb": None, "keyword_retriever": None}

        vectordb = FAISS.from_documents(chunks, embeddings)
        keyword_retriever = BM25Retriever.from_documents(chunks, k=4)
        
        return {"chunks": chunks, "vectordb": vectordb, "keyword_retriever": keyword_retriever}
    except Exception as e:
        logger.error(f"Failed to fully initialize session state for baseline PDF: {e}")
        return {"chunks": [], "vectordb": None, "keyword_retriever": None}


def hybrid_retrieve(query: str, state: dict, k: int = 4) -> str:
    """Keyword (BM25) + vector (FAISS) search, deduplicated."""
    if not state["vectordb"] or not state["keyword_retriever"]:
        return ""
        
    keyword_results = state["keyword_retriever"].invoke(query)
    vector_results  = state["vectordb"].similarity_search(query, k=k)
    seen, merged = set(), []
    for doc in keyword_results + vector_results:
        if doc.page_content not in seen:
            seen.add(doc.page_content)
            merged.append(doc)
    return "\n\n".join(d.page_content for d in merged)


# ──────────────────────────────────────────────
# 3. Request/Response Models
# ──────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: List[ChatMessage] = []

class SessionResponse(BaseModel):
    session_id: str


# ──────────────────────────────────────────────
# 4. API Endpoints
# ──────────────────────────────────────────────

@app.get("/api/session", response_model=SessionResponse)
async def create_session():
    """Start a new user session containing the baseline MCP document."""
    session_id = str(uuid.uuid4())
    try:
        SESSION_STORE[session_id] = initialize_session_state()
        return {"session_id": session_id}
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        # We return a specific error message in the exception to help debug
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_pdf(session_id: str = Form(...), file: UploadFile = File(...)):
    """Upload a new PDF and merge it into the active session state."""
    if session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session not found. Please refresh the page.")
        
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    state = SESSION_STORE[session_id]
    
    # Save file temporarily
    temp_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())
            
        # Parse and Chunk
        docs = PyPDFLoader(temp_path).load()
        new_chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(docs)
        
        if not new_chunks:
            return {"status": "success", "message": "No text found in PDF."}
            
        # Initialize or Update State
        if not state["chunks"]:
            state["chunks"] = new_chunks
            state["vectordb"] = FAISS.from_documents(new_chunks, embeddings)
        else:
            state["chunks"].extend(new_chunks)
            state["vectordb"].add_documents(new_chunks)
            
        # Re-initialize BM25
        state["keyword_retriever"] = BM25Retriever.from_documents(state["chunks"], k=4)
        
        return {"status": "success", "message": "Document successfully indexed!", "chunks_added": len(new_chunks)}
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Generate a response using hybrid RAG."""
    session_id = request.session_id
    if session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session not found. Please refresh the page.")
        
    state = SESSION_STORE[session_id]
    user_message = request.message
    
    context = hybrid_retrieve(user_message, state)
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    
    # Include recent history (last 6 turns limit)
    for turn in request.history[-6:]:
        messages.append({"role": turn.role, "content": turn.content})
        
    messages.append({
        "role": "user",
        "content": (
            f"Context:\n{context}\n\n"
            f"Question: {user_message}"
        ),
    })
    
    try:
        response = llm.invoke(messages)
        return {"response": response.content}
    except Exception as e:
        print(f"Error calling LLM: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating response from LLM.")

# Entrypoint for Render.com uvicorn running
# Run locally with: uvicorn main:app --reload
