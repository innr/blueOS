import { loadIndex, saveIndex } from './cacheIndex.js'

export class BlueosCacheStore {
  constructor(file, storage) {
    this.file = file
    this.storage = storage
    this.index = loadIndex(storage)
  }

  begin(segment) {
    const uri = 'internal://cache/tts/' + segment.id + '.part'
    return new Promise((resolve, reject) => {
      let settled = false
      const succeed = () => { if (!settled) { settled = true; resolve({ uri, bytes: 0 }) } }
      const fail = (error) => { if (!settled) { settled = true; reject(error) } }
      this.file.mkdir({ uri: 'internal://cache/tts/', recursive: true, success: succeed, complete: succeed, fail })
    })
  }

  append(handle, chunk) {
    let buffer = chunk
    if (chunk && chunk.data) buffer = chunk.data
    if (buffer instanceof ArrayBuffer) buffer = new Uint8Array(buffer)
    else if (ArrayBuffer.isView(buffer)) buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    else if (Array.isArray(buffer)) buffer = Uint8Array.from(buffer)
    if (!buffer || typeof buffer.byteLength !== 'number') return Promise.reject(new Error('CACHE_CHUNK_INVALID'))
    return new Promise((resolve, reject) => {
      this.file.writeArrayBuffer({ uri: handle.uri, buffer, append: true, success: () => { handle.bytes += buffer.byteLength; resolve() }, fail: reject })
    })
  }

  complete(handle, segment, metadata = {}) {
    const format = String(metadata.format || 'mp3').toLowerCase()
    if (!handle || !handle.bytes) return Promise.reject(new Error('CACHE_EMPTY_SEGMENT'))
    if (!['mp3', 'wav', 'pcm', 'opus'].includes(String(format).toLowerCase())) return Promise.reject(new Error('CACHE_UNSUPPORTED_FORMAT'))
    if (metadata && metadata.expectedBytes && metadata.expectedBytes !== handle.bytes) return Promise.reject(new Error('CACHE_LENGTH_MISMATCH'))
    const uri = 'internal://files/tts/' + segment.bookId + '/' + segment.chapterId + '/' + String(segment.sequence).padStart(4, '0') + '.' + format
    return new Promise((resolve, reject) => {
      let settled = false
      let moving = false
      const fail = (error) => { if (!settled) { settled = true; reject(error) } }
      const move = () => {
        if (settled || moving) return
        moving = true
        this.file.move({
          srcUri: handle.uri,
          dstUri: uri,
          success: () => {
            if (settled) return
            settled = true
            const ready = { ...segment, ...metadata, format, uri, sizeBytes: handle.bytes, status: 'ready' }
            this.index.segments = this.index.segments.filter((item) => item.id !== ready.id).concat(ready)
            saveIndex(this.storage, this.index)
            resolve(ready)
          },
          fail
        })
      }
      this.file.mkdir({
        uri: 'internal://files/tts/' + segment.bookId + '/' + segment.chapterId + '/',
        recursive: true,
        fail,
        success: move,
        complete: move
      })
    })
  }

  remove(segment) {
    const uri = segment.uri || 'internal://cache/tts/' + segment.id + '.part'
    return new Promise((resolve) => {
      const remove = this.file.del || this.file.delete
      if (typeof remove !== 'function') {
        this.index.segments = this.index.segments.filter((item) => item.id !== segment.id)
        saveIndex(this.storage, this.index)
        resolve()
        return
      }
      remove.call(this.file, { uri, complete: () => {
        this.index.segments = this.index.segments.filter((item) => item.id !== segment.id)
        saveIndex(this.storage, this.index)
        resolve()
      }, fail: () => {
        this.index.segments = this.index.segments.filter((item) => item.id !== segment.id)
        saveIndex(this.storage, this.index)
        resolve()
      } })
    })
  }

  listReady(bookId) { return this.index.segments.filter((item) => item.bookId === bookId && item.status === 'ready') }
}
