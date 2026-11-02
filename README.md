# AI Research Paper Analyzer

Use this app to analyze research-paper PDFs, ask questions grounded in the paper, and download a detailed report.

## Before you start

Install:

- Node.js **20.9 or newer** (includes npm)
- Python **3.10 or newer**
- A Groq API key (needed for AI analysis and Q&A)

## One-time setup (Windows)

Open **PowerShell** in the project folder, the one containing `package.json`, and run these commands one at a time:

```powershell
npm install
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Create your backend settings file:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
if (-not (Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
```

Open `backend/.env` in a text editor. Replace `replace_with_your_groq_api_key` with your actual Groq API key, then save the file. If the file already exists, keep it and just check the key. Keep the key private. The frontend backend URL is in `.env.local` as `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.

If `py` is not recognized, use `python -m venv .venv` instead.

## Start the app

Each time you use the app, open **two PowerShell windows** in the project folder.

### Window 1: start the backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Leave this window open. The backend is running when you see that Uvicorn started. You can also open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health); it should show `"status":"ok"`.

### Window 2: start the website

```powershell
npm run dev
```

Leave this window open too. Open [http://localhost:3000](http://localhost:3000) in your browser.

When you are finished, press **Ctrl+C** in both PowerShell windows to stop the app.

## Use the app

1. Choose a PDF and select **Analyze paper**.
2. Review the summary, findings, methods, limitations, and essential Q&A.
3. Ask a follow-up question. Expand **View source evidence** to see the quote and page used to check the answer.
4. Use **History** on the left to reopen one of your 10 recent chats. To continue an older chat, upload its PDF again.
5. Add your name if you want it printed on the report, then select **Download PDF**.

## If something goes wrong

- **The page cannot reach the analysis service:** Make sure Window 1 is still running, then refresh the website.
- **The API says the Groq key is missing:** Check that the key is saved in `backend/.env`, then stop and restart Window 1.
- **Port 3000 or 8000 is busy:** Close the other app using that port, then restart the corresponding window.
- **A scanned PDF has no readable text:** Install Tesseract OCR and its language data. Regular text PDFs do not need OCR.
- **The PDF will not upload:** It must be under 100 MB, 1,000 pages, and 2,000,000 extracted characters. Unlock password-protected PDFs before uploading.

## Optional developer commands

Run the checks:

```powershell
npm run typecheck
npm run backend:test
```

Build the frontend:

```powershell
npm run build
npm start
```

For scanned PDFs, install Tesseract OCR separately.
