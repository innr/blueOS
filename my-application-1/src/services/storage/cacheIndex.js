export const CACHE_INDEX_KEY = 'tts-cache-index-v1'

export function loadIndex(storage) {
  try {
    const raw = storage.getSync({ key: CACHE_INDEX_KEY })
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.segments)) return { schemaVersion: 1, segments: [] }
    return parsed
  } catch (error) { return { schemaVersion: 1, segments: [] } }
}

export function saveIndex(storage, index) {
  storage.set({ key: CACHE_INDEX_KEY, value: JSON.stringify({ ...index, schemaVersion: 1 }) })
}

export function readyAheadMs(index, currentSegmentId, positionMs) {
  const segments = index.segments || []
  const current = segments.find((item) => item.id === currentSegmentId)
  if (!current) return 0
  const afterCurrent = Math.max(0, (current.durationMs || 0) - positionMs)
  return segments
    .filter((item) => item.status === 'ready' && item.bookId === current.bookId && item.chapterId === current.chapterId && item.sequence >= current.sequence)
    .reduce((sum, item) => sum + (item.id === currentSegmentId ? afterCurrent : item.durationMs || 0), 0)
}
