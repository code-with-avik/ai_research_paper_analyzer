# AI Research Paper Analyzer (Starter)

This repository contains a starter full-stack project for analyzing research papers in PDF format.

## What is implemented

- **React frontend** (`frontend/`) with a clean, responsive UI for:
  - Uploading a PDF
  - Generating a summary
  - Asking follow-up questions
- **Node.js + Express backend** (`backend/`) with REST endpoints:
  - `POST /api/papers/upload`
  - `POST /api/papers/:paperId/summarize`
  - `POST /api/papers/:paperId/ask`
  - `GET /api/health`
- **PDF text extraction** using `pdf-parse`
- **AI summarization and Q&A** integration using OpenAI API
- **Loading indicators and error handling** on both client and server
- **Environment-based configuration** for API keys and runtime settings

## What requires additional configuration

- You must provide a valid OpenAI API key in `backend/.env` before summarization and Q&A can work.
- The uploaded paper text is currently stored in memory, so it is reset when the backend restarts.

## Project structure

- `frontend/` - React app (Vite)
- `backend/` - Express API

## Setup

### 1) Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2) Configure environment variables

Create `backend/.env` from `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Then set at least:

- `OPENAI_API_KEY=your_real_key`

(Optional frontend config):

```bash
cp frontend/.env.example frontend/.env
```

### 3) Run backend

```bash
cd backend
npm run dev
```

Backend runs at `http://localhost:4000` by default.

### 4) Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173` by default.

## Notes for student developers

- The backend code is organized into `controllers`, `routes`, and `services` for clarity.
- You can swap out the AI provider logic by editing `backend/src/services/aiService.js`.
- Add persistence (database/object storage) if you want uploaded papers to survive server restarts.
