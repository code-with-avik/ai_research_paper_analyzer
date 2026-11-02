import { useState } from 'react'
import './App.css'
import { askQuestion, summarizePaper, uploadPaper } from './api'

function App() {
  const [file, setFile] = useState(null)
  const [paperId, setPaperId] = useState('')
  const [preview, setPreview] = useState('')
  const [summary, setSummary] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loadingState, setLoadingState] = useState({
    upload: false,
    summarize: false,
    ask: false
  })

  const setLoading = (key, value) => {
    setLoadingState((current) => ({ ...current, [key]: value }))
  }

  const handleUpload = async (event) => {
    event.preventDefault()

    if (!file) {
      setError('Please choose a PDF file first.')
      return
    }

    setError('')
    setSummary('')
    setAnswer('')
    setLoading('upload', true)

    try {
      const result = await uploadPaper(file)
      setPaperId(result.paperId)
      setPreview(result.preview)
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setLoading('upload', false)
    }
  }

  const handleSummarize = async () => {
    if (!paperId) {
      setError('Upload a paper before generating a summary.')
      return
    }

    setError('')
    setLoading('summarize', true)

    try {
      const result = await summarizePaper(paperId)
      setSummary(result.summary)
    } catch (summaryError) {
      setError(summaryError.message)
    } finally {
      setLoading('summarize', false)
    }
  }

  const handleAsk = async (event) => {
    event.preventDefault()

    if (!paperId) {
      setError('Upload a paper before asking questions.')
      return
    }

    if (!question.trim()) {
      setError('Please enter a question.')
      return
    }

    setError('')
    setLoading('ask', true)

    try {
      const result = await askQuestion(paperId, question)
      setAnswer(result.answer)
    } catch (askError) {
      setError(askError.message)
    } finally {
      setLoading('ask', false)
    }
  }

  return (
    <main className="container">
      <h1>AI Research Paper Analyzer</h1>
      <p className="intro">
        Upload an academic PDF, generate a summary, and ask follow-up questions.
      </p>

      <section className="card">
        <h2>1) Upload PDF</h2>
        <form onSubmit={handleUpload} className="stack">
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <button type="submit" disabled={loadingState.upload}>
            {loadingState.upload ? 'Uploading…' : 'Upload Paper'}
          </button>
        </form>
        {paperId && <p className="success">Paper uploaded. ID: {paperId}</p>}
        {preview && <p className="result">{preview}</p>}
      </section>

      <section className="card">
        <h2>2) Generate Summary</h2>
        <button onClick={handleSummarize} disabled={loadingState.summarize || !paperId}>
          {loadingState.summarize ? 'Summarizing…' : 'Generate Summary'}
        </button>
        {summary && <p className="result">{summary}</p>}
      </section>

      <section className="card">
        <h2>3) Ask a Question</h2>
        <form onSubmit={handleAsk} className="stack">
          <textarea
            rows="4"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: What is the main contribution of this paper?"
          />
          <button type="submit" disabled={loadingState.ask || !paperId}>
            {loadingState.ask ? 'Asking…' : 'Ask Question'}
          </button>
        </form>
        {answer && <p className="result">{answer}</p>}
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  )
}

export default App
