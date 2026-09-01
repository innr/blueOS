export function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

export function segmentText(text, targetChars = 1200) {
  const normalized = normalizeText(text)
  if (!normalized) return []
  const result = []
  let start = 0
  while (start < normalized.length) {
    const limit = Math.min(start + targetChars, normalized.length)
    let end = limit
    if (limit < normalized.length) {
      const punctuation = normalized.slice(start, limit).lastIndexOf('。')
      if (punctuation >= targetChars * 0.5) end = start + punctuation + 1
    }
    result.push({ sequence: result.length, text: normalized.slice(start, end), textStart: start, textEnd: end })
    start = end
  }
  return result
}
