/**
 * Small adapter around BlueOS audioPlayer.
 *
 * Keeping the platform object behind this boundary makes the page independent
 * of SDK property names and gives us one place to restore a millisecond
 * playback position when switching cached segments.
 */
export class WatchAudioPlayer {
  constructor(api) {
    this.api = api
    this.uri = null
    this.handlers = {}
  }

  prepare(uri, positionMs = 0) {
    if (!uri) throw new Error('AUDIO_URI_REQUIRED')
    this.uri = uri
    this.api.src = uri
    if (positionMs > 0) this.api.currentTime = positionMs / 1000
  }

  play() { return this.api.play() }
  resume() { return this.play() }
  pause() { return this.api.pause() }
  stop() { return this.api.stop() }
  release() {
    try { this.stop() } catch (error) {}
    this.uri = null
  }

  seek(positionMs) {
    this.api.currentTime = Math.max(0, Number(positionMs) || 0) / 1000
  }

  currentTimeMs() {
    return Math.max(0, Number(this.api.currentTime) || 0) * 1000
  }

  durationMs() {
    return Math.max(0, Number(this.api.duration) || 0) * 1000
  }

  on(event, callback) {
    const property = 'on' + event.charAt(0).toUpperCase() + event.slice(1)
    this.handlers[event] = callback
    this.api[property] = callback
  }

  onTimeUpdate(callback) { this.on('timeUpdate', callback) }
  onEnded(callback) { this.on('ended', callback) }
  onError(callback) { this.on('error', callback) }

  bind(handlers = {}) {
    Object.keys(handlers).forEach((event) => this.on(event, handlers[event]))
  }
}
