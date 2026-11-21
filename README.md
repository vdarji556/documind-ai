# AI Document Chatbot using RAG

A full-stack AI-powered document question-answering application built using **React, FastAPI, LangChain, FAISS, and Large Language Models (LLMs)**.

The application allows users to upload PDF documents and ask questions based on their content using **Retrieval-Augmented Generation (RAG)**.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, FastAPI |
| AI Framework | LangChain |
| Vector Database | FAISS |
| Retrieval | Semantic Search + BM25 |
| LLM | Groq API |
| Embeddings | Google Gemini Embeddings |
| Document Processing | PyPDF |

## Features

- PDF document upload and text extraction
- AI-powered document question answering
- Retrieval-Augmented Generation pipeline
- Hybrid retrieval using FAISS and BM25
- React-based chat interface
- FastAPI REST endpoints
- Session-based document interaction

## How RAG Works

1. User uploads a PDF document.
2. Backend extracts the document text.
3. Text is divided into smaller chunks.
4. Embeddings are generated for semantic search.
5. FAISS stores and searches document vectors.
6. BM25 helps retrieve relevant text.
7. Relevant document context is sent to the LLM.
8. The LLM generates an answer based on the retrieved content.

## Installation

### Backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**Windows:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Linux / Codespaces:**
```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the required API credentials in your local environment:

```env
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key
```

Start the backend:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the frontend using the URL displayed by Vite.

## Project Status

**Work in progress.**

The project is being configured and tested. Planned improvements include free/local model integration, improved PDF validation, and deployment documentation.

## GitHub

**Repository:** https://github.com/vdarji556/react-python-rag-chatbot

## Original Project Attribution

This project is based on the open-source React + Python RAG application by **HERE AND NOW AI**.

Original repository: https://github.com/hereandnowai/react-python-rag-app

The original MIT license and copyright notices are retained. This repository is being adapted for learning, experimentation, and portfolio development.

## License

MIT License — see the `LICENSE` file for details.