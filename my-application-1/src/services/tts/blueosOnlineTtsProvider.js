/**
 * Adapter contract for @blueos.ai.speech. The installed Studio SDK currently
 * lacks its declaration; the provider is injected with the SDK module after
 * T0 confirms the createTts options and chunk callback shape.
 */
export class BlueosOnlineTtsProvider {
  constructor(speech, credentials = {}) { this.speech = speech; this.credentials = credentials }
  configure(credentials) { this.credentials = credentials || {} }
  getStatus() {
    return {
      apiAvailable: !!(this.speech && typeof this.speech.createTts === 'function'),
      credentialsConfigured: !!(this.credentials.appId && this.credentials.appKey)
    }
  }
  requestOptions(text, model) {
    return {
      text,
      model,
      play: false,
      // The SDK may read credentials from its configured session; passing them
      // here also supports SDK versions that require per-request auth fields.
      appId: this.credentials.appId,
      appKey: this.credentials.appKey
    }
  }
  withTimeout(promise, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TTS_PROBE_TIMEOUT')), timeoutMs)
      promise.then((value) => { clearTimeout(timer); resolve(value) }, (error) => { clearTimeout(timer); reject(error) })
    })
  }
  probe() {
    if (!this.speech || typeof this.speech.createTts !== 'function') return Promise.resolve({ reachable: false, reason: 'TTS_API_UNAVAILABLE' })
    if (!this.credentials.appId || !this.credentials.appKey) return Promise.resolve({ reachable: false, reason: 'TTS_CREDENTIALS_NOT_CONFIGURED' })
    const model = this.speech.TtsModel && this.speech.TtsModel.LongDefault
    try {
      return this.withTimeout(Promise.resolve(this.speech.createTts(this.requestOptions('测试', model)))).then((result) => ({ reachable: !!result, reason: result ? 'TTS_PROBE_OK' : 'TTS_PROBE_EMPTY' })).catch((error) => ({ reachable: false, reason: error && error.message === 'TTS_PROBE_TIMEOUT' ? 'TTS_PROBE_TIMEOUT' : 'TTS_PROBE_FAILED' }))
    } catch (error) { return Promise.resolve({ reachable: false, reason: 'TTS_PROBE_FAILED' }) }
  }
  synthesize(segment, options) {
    if (!this.speech || typeof this.speech.createTts !== 'function') return Promise.reject(new Error('TTS_API_UNAVAILABLE'))
    const model = options && options.model || (this.speech.TtsModel && this.speech.TtsModel.LongDefault)
    return Promise.resolve(this.speech.createTts(this.requestOptions(segment.text, model))).then((result) => {
      if (!result || !result.audioChunks) throw new Error('TTS_AUDIO_CHUNKS_UNAVAILABLE')
      const format = String(result.format || result.audioFormat || '').toLowerCase()
      if (!['mp3', 'wav', 'pcm', 'opus'].includes(format)) throw new Error('TTS_AUDIO_FORMAT_UNAVAILABLE')
      return { ...result, format }
    })
  }
}
