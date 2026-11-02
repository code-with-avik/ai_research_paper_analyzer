import { randomUUID } from 'node:crypto'
import { answerQuestion, summarizePaper } from '../services/aiService.js'
import { extractPdfText } from '../services/pdfService.js'
import { getPaperText, savePaper } from '../services/paperStore.js'

export async function uploadPaper(req, res) {
  const text = await extractPdfText(req.file)

  if (!text) {
    const error = new Error('Could not extract readable text from this PDF.')
    error.status = 400
    throw error
  }

  const paperId = randomUUID()
  savePaper(paperId, text)

  res.status(201).json({
    paperId,
    message: 'PDF uploaded and text extracted successfully.',
    preview: `${text.slice(0, 400)}${text.length > 400 ? '...' : ''}`
  })
}

export async function summarizeUploadedPaper(req, res) {
  const text = getPaperText(req.params.paperId)

  if (!text) {
    const error = new Error('Paper not found. Upload a paper first.')
    error.status = 404
    throw error
  }

  const summary = await summarizePaper(text)
  res.json({ summary })
}

export async function askAboutPaper(req, res) {
  const text = getPaperText(req.params.paperId)

  if (!text) {
    const error = new Error('Paper not found. Upload a paper first.')
    error.status = 404
    throw error
  }

  const question = req.body?.question?.trim()
  if (!question) {
    const error = new Error('Question is required.')
    error.status = 400
    throw error
  }

  const answer = await answerQuestion(text, question)
  res.json({ answer })
}
