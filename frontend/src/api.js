const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export function uploadPaper(file) {
  const formData = new FormData()
  formData.append('paper', file)

  return request('/papers/upload', {
    method: 'POST',
    body: formData
  })
}

export function summarizePaper(paperId) {
  return request(`/papers/${paperId}/summarize`, {
    method: 'POST'
  })
}

export function askQuestion(paperId, question) {
  return request(`/papers/${paperId}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ question })
  })
}
