const papers = new Map()

export function savePaper(paperId, text) {
  papers.set(paperId, text)
}

export function getPaperText(paperId) {
  return papers.get(paperId)
}
