import OpenAI from 'openai'

let openaiClient

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not configured on the backend.')
    error.status = 503
    throw error
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  return openaiClient
}

function getOutputText(response) {
  return response.output_text || 'The AI API returned an empty response.'
}

function truncateText(text, limit = 12000) {
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

export async function summarizePaper(text) {
  const client = getClient()
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content:
          'You summarize academic research papers for students. Keep it concise with key findings, methods, and limitations.'
      },
      {
        role: 'user',
        content: `Summarize this research paper:\n\n${truncateText(text)}`
      }
    ]
  })

  return getOutputText(response)
}

export async function answerQuestion(text, question) {
  const client = getClient()
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content:
          'Answer questions about the paper. If the answer is not in the paper, clearly say that.'
      },
      {
        role: 'user',
        content: `Paper text:\n${truncateText(text)}\n\nQuestion: ${question}`
      }
    ]
  })

  return getOutputText(response)
}
