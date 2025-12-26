# DocSense - Ask questions. Get cited answers.

<div align="center">

![DocSense Logo](https://img.shields.io/badge/DocSense-Research--First%20AI-E11D48?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik03IDIxaDEwYTIgMiAwIDAwMi0yVjkuNDE0YTEgMSAwIDAwLS4yOTMtLjcwN2wtNS40MTQtNS40MTRBMSAxIDAgMDAxMi41ODYgM0g3YTIgMiAwIDAwLTIgMnYxNGEyIDIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==)

**A research-first application that answers questions directly from your documents with page-level citations.**

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Redis](https://img.shields.io/badge/Redis-Queue-DC382D?style=flat-square&logo=redis)](https://redis.io/)

</div>

---

## ✨ What is DocSense?

**DocSense** is an AI-powered research assistant that lets you ask questions about your documents and get precise answers with page-level citations. Unlike generic chatbots, DocSense prioritizes accuracy and traceability - every answer points you back to the exact source.

### Key Features

- **💬 Ask Natural Questions** - Query your documents conversationally
- **📄 Page-Level Citations** - Every answer includes `[1] [2]` citations linking to exact pages
- **⚡ Real-Time Streaming** - Watch answers generate with reasoning steps visible
- **🔍 PDF Viewer** - Click any citation to see the source with smooth animations
- **📚 Multi-Document Search** - Upload and query across multiple PDFs
- **🌙 Dark/Light Mode** - Professional interface with 60-30-10 color scheme

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd DocSense

# Create .env file with your Gemini API key
echo "GOOGLE_API_KEY=your-gemini-api-key" > .env

# Start all services
docker-compose up --build

# Access the app
open http://localhost:3000
```

### Option 2: Manual Setup

#### Prerequisites

- Node.js 18+
- Python 3.11+
- Redis Server

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# Start Redis (in separate terminal)
redis-server

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start worker (in separate terminal)
python -m app.queue.worker
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Access the app
open http://localhost:3000
```

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │ SSE │                 │     │                 │
│   Next.js 14    │◄────│    FastAPI      │◄────│   Redis Queue   │
│   Frontend      │     │    Backend      │     │   (RQ Worker)   │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
    React + Zustand         Pydantic Models         LangGraph Agent
    Framer Motion           SSE Streaming           Gemini AI Model
    TailwindCSS             PDF Processing          Tool Execution
```

### How It Works

1. **Upload PDFs** → Documents are processed and indexed for search
2. **Ask a Question** → Your query is analyzed and relevant sections are found
3. **Get Cited Answers** → AI generates an answer with inline citations `[1]`
4. **Verify Sources** → Click any citation to view the exact PDF page

---

## 🔧 Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Google Gemini API key | **Required** |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PDF_DIRECTORY` | Path to PDF storage | `./pdfs` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## 📁 Project Structure

```
DocSense/
├── frontend/                 # Next.js 14 Application
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── stores/               # Zustand state management
│   └── lib/                  # Utilities
│
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # REST + SSE endpoints
│   │   ├── langgraph/        # AI agent with tools
│   │   ├── pdf/              # PDF extraction
│   │   ├── queue/            # RQ worker
│   │   └── streaming/        # Redis pub/sub
│   └── pdfs/                 # Document storage
│
├── docker-compose.yml        # One-command startup
└── README.md
```

---

## 📚 Technology Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Zustand** - State management with persistence
- **Framer Motion** - Smooth animations
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - UI components

### Backend
- **FastAPI** - High-performance API
- **LangGraph** - AI agent orchestration
- **LangChain + Gemini** - LLM integration
- **Redis Queue (RQ)** - Async job processing
- **PyPDF2** - PDF text extraction

---

## 🎨 Design Philosophy

**60-30-10 Color Rule Applied:**
- **60%** - Deep charcoal / Warm off-white (backgrounds)
- **30%** - Warm slate gray (cards, borders)
- **10%** - Rose accent (CTAs, citations, highlights)

This creates a professional, research-focused interface that's easy on the eyes during long research sessions.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">

**DocSense** - *Ask questions. Get cited answers.*

Built with ❤️ using Next.js, FastAPI, and Gemini AI

</div>
