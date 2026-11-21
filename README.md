# DocuMind AI – RAG-Based PDF Chatbot

A full-stack AI-powered document question-answering application built using **React, FastAPI, LangChain, Hugging Face, FAISS, BM25, and Groq LLMs**.

DocuMind AI allows users to upload PDF documents, extract information from regular and scanned PDFs, and ask natural-language questions about their content using **Retrieval-Augmented Generation (RAG)**.

The application combines semantic search, keyword-based retrieval, and Large Language Models to generate context-aware responses.

## Features

- **PDF Upload & Processing:** Upload PDF documents and extract their content.
- **OCR Support:** Extract text from scanned PDFs and images embedded within PDF pages using Tesseract OCR.
- **AI Document Chat:** Ask questions about uploaded documents using natural language.
- **Retrieval-Augmented Generation:** Generate answers using document context.
- **Hybrid Search:** Combine FAISS semantic search with BM25 keyword retrieval.
- **Local Embeddings:** Generate embeddings using Hugging Face Sentence Transformers without a paid embedding API.
- **Context-Aware Conversations:** Maintain conversation history within individual sessions.
- **Document Summarization:** Generate summaries of uploaded PDFs.
- **Document Analysis:** Request explanations, suggestions, and improvements based on document content.
- **REST API:** FastAPI endpoints for session creation, document uploads, and AI chat.
- **React Frontend:** Interactive chat interface built with React and Vite.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, FastAPI |
| AI Framework | LangChain |
| Large Language Model | Groq API (GPT-OSS 20B) |
| Embeddings | Hugging Face Sentence Transformers |
| Embedding Model | all-MiniLM-L6-v2 |
| Vector Store | FAISS |
| Keyword Retrieval | BM25 |
| Document Processing | PyMuPDF |
| OCR | Tesseract OCR, pytesseract |
| Text Splitting | RecursiveCharacterTextSplitter |
| API Validation | Pydantic |
| Configuration | python-dotenv |

## System Architecture

```text
              React Frontend
                    |
                    v
              FastAPI Backend
                    |
                    v
               PDF Upload
                    |
                    v
          PDF Text Extraction
                    |
          +---------+---------+
          |                   |
          v                   v
       PyMuPDF          Tesseract OCR
     (Normal Text)     (Image-Based Text)
          |                   |
          +---------+---------+
                    |
                    v
              Extracted Text
                    |
                    v
              Text Chunking
                    |
                    v
        Hugging Face Embeddings
                    |
                    v
           FAISS Vector Store
                    |
                    v
             User Question
                    |
                    v
           Hybrid Retrieval
              FAISS + BM25
                    |
                    v
            Relevant Context
                    |
                    v
               Groq LLM
                    |
                    v
             AI Response
                    |
                    v
              React Chat UI
```

## How RAG Works

1. **Document Upload:** The user uploads a PDF through the React interface.
2. **Text Extraction:** PyMuPDF extracts selectable text, while Tesseract OCR reads text from scanned pages and images.
3. **Text Chunking:** The extracted content is divided into smaller overlapping chunks.
4. **Embedding Generation:** Hugging Face Sentence Transformers converts text chunks into numerical vector representations.
5. **Vector Indexing:** FAISS indexes document embeddings for semantic similarity search.
6. **Keyword Indexing:** BM25 prepares keyword-based retrieval.
7. **Question Processing:** The user submits a natural-language question.
8. **Context Retrieval:** For larger documents, FAISS and BM25 retrieve relevant chunks. Smaller documents can use their full extracted text.
9. **LLM Generation:** Relevant document context and conversation history are sent to the Groq-hosted LLM.
10. **Response:** The generated answer is displayed in the React chat interface.

## Installation and Setup

### Prerequisites

- Python
- Node.js and npm
- Git
- Groq API key
- Tesseract OCR

### 1. Clone the Repository

```bash
git clone https://github.com/vdarji556/react-python-rag-chatbot.git
cd react-python-rag-chatbot
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the environment.

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux / WSL / Codespaces:**

```bash
source .venv/bin/activate
```

Install Python dependencies:

```bash
python -m pip install -r requirements.txt
```

### 3. Install Tesseract OCR

**Ubuntu / WSL:**

```bash
sudo apt update
sudo apt install -y tesseract-ocr tesseract-ocr-hin
```

Verify the installation:

```bash
tesseract --version
tesseract --list-langs
```

Make sure the English (`eng`) and Hindi (`hin`) language data are available.

For Windows, install Tesseract OCR separately and ensure its executable is accessible through the system PATH.

### 4. Configure Environment Variables

Create a `.env` file inside the `backend` directory:

```env
GROQ_API_KEY=your_groq_api_key
MODEL_NAME=openai/gpt-oss-20b
```

**Security:** Never commit your `.env` file or real API keys to GitHub.

### 5. Start the Backend

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend URL:

http://localhost:8000

Interactive API documentation:

http://localhost:8000/docs

### 6. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the URL displayed by Vite, typically:

http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/session` | Create a new document chat session |
| POST | `/api/upload` | Upload, extract, and index a PDF |
| POST | `/api/chat` | Ask questions about the uploaded PDF |

### Example Chat Request

```json
{
  "session_id": "your-session-id",
  "message": "Summarize this document",
  "history": []
}
```

### Example Chat Response

```json
{
  "response": "The document discusses..."
}
```

## Project Structure

```text
react-python-rag-chatbot/
|
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- .env
|
|-- frontend/
|   |-- src/
|   |-- package.json
|
|-- README.md
|-- LICENSE
```

*The directory structure is simplified to show the main components.*

## Current Limitations

- Supports PDF document uploads; direct JPG/PNG uploads are not yet implemented.
- OCR extracts text from images but does not provide complete visual understanding of photographs, charts, or diagrams.
- OCR accuracy depends on scan quality and language.
- Sessions and vector indexes are stored in memory and are lost when the backend restarts.
- Very large documents may require improved retrieval and context management.
- PDF processing and embeddings can consume significant CPU and memory.

## Future Improvements

- Direct JPG and PNG upload support.
- Vision-language model integration for charts, diagrams, and images.
- Persistent vector database and conversation storage.
- User authentication and document management.
- Improved OCR performance and duplicate-text handling.
- Cloud deployment.
- Automated testing and evaluation of RAG responses.

## Project Status

**Active Development – Core Implementation Completed**

The application includes PDF processing, OCR integration, local embeddings, hybrid retrieval, and LLM-powered chat. End-to-end testing, performance optimization, and deployment improvements are ongoing.

