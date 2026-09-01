/** Progress persistence boundary for the confirmed BlueOS storage API. */
export class ProgressStore {
  constructor(storage) { this.storage = storage }

  save(state) {
    return this.storage.set('playback-state', JSON.stringify(state))
  }

  load() {
    const value = this.storage.get('playback-state')
    return value ? JSON.parse(value) : null
  }
}
