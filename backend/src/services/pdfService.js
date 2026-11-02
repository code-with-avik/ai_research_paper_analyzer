import { PDFParse } from 'pdf-parse'

const PDF_MIME_TYPE = 'application/pdf'

export async function extractPdfText(file) {
  if (!file) {
    const error = new Error('Please upload a PDF file.')
    error.status = 400
    throw error
  }

  if (file.mimetype !== PDF_MIME_TYPE) {
    const error = new Error('Only PDF files are supported.')
    error.status = 400
    throw error
  }

  const parser = new PDFParse({ data: file.buffer })

  try {
    const parsed = await parser.getText()
    return (parsed.text || '').trim()
  } finally {
    await parser.destroy()
  }
}
