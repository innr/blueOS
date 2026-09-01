export const PREFETCH_CONFIG = { segmentTargetMs: 300000, targetAheadMs: 1800000, lowWatermarkMs: 300000, maxConcurrentSynthesis: 1 }

export class PrefetchManager {
  constructor(provider, cache, probe, config = PREFETCH_CONFIG) {
    this.provider = provider; this.cache = cache; this.probe = probe; this.config = config
    this.running = false; this.busy = false; this.online = false
  }
  async start(bookId) {
    if (bookId) this.bookId = bookId
    if (this.probeInFlight) return this.probeInFlight
    this.probeInFlight = (async () => {
      let result
      try {
        result = await this.provider.probe()
      } catch (error) {
        result = { reachable: false, reason: 'TTS_PROBE_FAILED', error }
      }
      this.online = !!result.reachable
      this.running = this.online
      this.pauseReason = this.online ? null : (result.reason || 'TTS_UNREACHABLE')
      return result
    })()
    try { return await this.probeInFlight } finally { this.probeInFlight = null }
  }
  async prefetch(segment) {
    if (!this.running || this.busy || !this.online) return null
    this.busy = true
    let handle
    try {
      handle = await this.cache.begin(segment)
      const result = await this.provider.synthesize(segment, { targetMs: this.config.segmentTargetMs })
      const chunks = result.audioChunks
      if (chunks && typeof chunks.then === 'function') {
        await this.cache.append(handle, await chunks)
      } else if (chunks && (typeof chunks[Symbol.asyncIterator] === 'function' || typeof chunks[Symbol.iterator] === 'function')) {
        for await (const chunk of chunks) await this.cache.append(handle, chunk)
      } else {
        throw new Error('TTS_AUDIO_CHUNKS_UNAVAILABLE')
      }
      if (!handle.bytes) throw new Error('TTS_EMPTY_AUDIO')
      if (result.expectedBytes && result.expectedBytes !== handle.bytes) throw new Error('TTS_AUDIO_LENGTH_MISMATCH')
      return await this.cache.complete(handle, segment, { format: result.format, sampleRate: result.sampleRate, channels: result.channels, durationMs: result.durationMs || this.config.segmentTargetMs })
    } catch (error) {
      if (handle) await this.cache.remove(segment)
      throw error
    } finally { this.busy = false }
  }
  pause(reason) { this.running = false; this.pauseReason = reason }
  async resume() { return this.start(this.bookId) }
  async onNetworkChanged(type) {
    if (type === 'none') {
      this.online = false
      this.pause('NETWORK_OFFLINE')
      return { reachable: false, reason: 'NETWORK_OFFLINE' }
    }
    if (!this.bookId || this.pauseReason === 'DISPOSED') return { reachable: false, reason: 'NOT_STARTED' }
    if (this.online && this.running) return { reachable: true, reason: 'ALREADY_RUNNING' }
    // A network callback only proves transport availability. Probe the real TTS
    // endpoint before issuing synthesis requests after reconnect.
    return this.resume()
  }
  getState() {
    return {
      running: this.running,
      online: this.online,
      busy: this.busy,
      probing: !!this.probeInFlight,
      pauseReason: this.pauseReason || null,
      bookId: this.bookId || null,
      targetAheadMs: this.config.targetAheadMs,
      lowWatermarkMs: this.config.lowWatermarkMs
    }
  }
  dispose() { this.pause('DISPOSED') }
}
