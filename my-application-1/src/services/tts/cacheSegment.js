export const CACHE_SCHEMA_VERSION = 1

export function segmentId(bookId, chapterId, sequence) {
  return bookId + ':' + chapterId + ':' + sequence
}

export function createCacheSegment(bookId, chapterId, segment, metadata) {
  return {
    schemaVersion: CACHE_SCHEMA_VERSION,
    id: segmentId(bookId, chapterId, segment.sequence),
    bookId, chapterId, sequence: segment.sequence,
    textStart: segment.textStart, textEnd: segment.textEnd,
    text: segment.text, status: 'downloading',
    uri: metadata.uri || null, durationMs: metadata.durationMs || 0,
    sizeBytes: metadata.sizeBytes || 0, audioSha256: metadata.audioSha256 || null,
    format: metadata.format || null, sampleRate: metadata.sampleRate || 0,
    channels: metadata.channels || 0
  }
}
