/**
 * BlueOS audio boundary. The concrete backend must be supplied by the SDK
 * integration after the supported feature name and callback signatures are
 * confirmed on the target watch.
 */
export class AudioPlayer {
  constructor(backend) {
    this.backend = backend
    this.chapterId = null
  }

  load(chapterId, uri) {
    this.chapterId = chapterId
    return this.backend.load(uri)
  }

  play() { return this.backend.play() }
  pause() { return this.backend.pause() }
  stop() { return this.backend.stop() }
  seek(positionMs) { return this.backend.seek(positionMs) }
  setVolume(value) { return this.backend.setVolume(value) }
  on(event, callback) { return this.backend.on(event, callback) }
}
