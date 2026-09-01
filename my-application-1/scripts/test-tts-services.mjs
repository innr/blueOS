import assert from 'node:assert/strict'
import { segmentText } from '../src/services/tts/textSegmenter.js'
import { createCacheSegment } from '../src/services/tts/cacheSegment.js'
import { PrefetchManager } from '../src/services/tts/prefetchManager.js'
import { WatchAudioPlayer } from '../src/services/audio/watchAudioPlayer.js'
import { BlueosCacheStore } from '../src/services/storage/cacheStore.js'
import { BlueosOnlineTtsProvider } from '../src/services/tts/blueosOnlineTtsProvider.js'
import { createNetworkProbe } from '../src/services/network/networkProbe.js'

const parts = segmentText('第一句。第二句。'.repeat(400), 1200)
assert.ok(parts.length > 1)
assert.equal(parts[0].textStart, 0)
assert.equal(parts.at(-1).textEnd, parts.at(-1).text.length + parts.at(-1).textStart)

const unconfigured = new BlueosOnlineTtsProvider({ createTts: () => ({}) })
assert.equal((await unconfigured.probe()).reason, 'TTS_CREDENTIALS_NOT_CONFIGURED')
const invalidFormat = new BlueosOnlineTtsProvider({ createTts: () => ({ audioChunks: [] }) }, { appId: 'id', appKey: 'key' })
await assert.rejects(() => invalidFormat.synthesize({ text: '测试' }), /TTS_AUDIO_FORMAT_UNAVAILABLE/)

let networkCallback
const network = {
  getType: ({ success }) => success({ type: 'wifi' }),
  subscribe: ({ callback }) => { networkCallback = callback },
  unsubscribe: () => { networkCallback = null }
}
const networkProbe = createNetworkProbe(network)
await new Promise((resolve) => networkProbe.getType((type) => { assert.equal(type, 'wifi'); resolve() }))
networkProbe.subscribe((type) => { assert.equal(type, 'none') })
networkCallback({ type: 'none' })
networkProbe.unsubscribe()

let probeReachable = true
let syntheses = 0
const provider = {
  probe: async () => ({ reachable: probeReachable, reason: probeReachable ? 'OK' : 'OFFLINE' }),
  synthesize: async () => {
    syntheses += 1
    return { format: 'mp3', audioChunks: [new Uint8Array([1, 2, 3])], durationMs: 300000 }
  }
}
const cached = []
const cache = {
  begin: async () => ({ bytes: 0 }),
  append: async (handle, chunk) => { handle.bytes += chunk.byteLength },
  complete: async (handle, segment, metadata) => {
    const result = { ...segment, ...metadata, sizeBytes: handle.bytes, status: 'ready' }
    cached.push(result)
    return result
  },
  remove: async () => {}
}
const manager = new PrefetchManager(provider, cache, {})
assert.equal((await manager.start('book')).reachable, true)
let probeCount = 0
const dedupeManager = new PrefetchManager({ probe: () => new Promise((resolve) => { probeCount += 1; setTimeout(() => resolve({ reachable: true }), 5) }) }, cache, {})
await Promise.all([dedupeManager.start('book'), dedupeManager.start('book')])
assert.equal(probeCount, 1)
const segment = createCacheSegment('book', 'chapter', parts[0], {})
assert.equal((await manager.prefetch(segment)).status, 'ready')
assert.equal(syntheses, 1)
await manager.onNetworkChanged('none')
assert.equal(manager.getState().running, false)
probeReachable = true
await manager.onNetworkChanged('wifi')
assert.equal(manager.getState().online, true)

const files = new Map()
const fileApi = {
  mkdir: ({ complete }) => complete(),
  writeArrayBuffer: ({ uri, buffer, append, success }) => {
    const previous = append ? files.get(uri) || new Uint8Array() : new Uint8Array()
    const merged = new Uint8Array(previous.length + buffer.length)
    merged.set(previous)
    merged.set(buffer, previous.length)
    files.set(uri, merged)
    success()
  },
  move: ({ srcUri, dstUri, success }) => { files.set(dstUri, files.get(srcUri)); files.delete(srcUri); success(dstUri) },
  del: ({ uri, complete }) => { files.delete(uri); complete() }
}
const storageApi = { getSync: () => null, set: () => {} }
const store = new BlueosCacheStore(fileApi, storageApi)
const stored = createCacheSegment('book', 'chapter', parts[1], {})
const handle = await store.begin(stored)
await store.append(handle, { data: new Uint8Array([9, 8]) })
const ready = await store.complete(handle, stored, { format: 'mp3', durationMs: 300000 })
assert.equal(store.listReady('book')[0].uri, ready.uri)

const backend = { currentTime: 0, duration: 10, play() {}, pause() {}, stop() {} }
const player = new WatchAudioPlayer(backend)
player.prepare('internal://files/tts/book/chapter/0000.mp3', 1500)
assert.equal(backend.currentTime, 1.5)
player.seek(2500)
assert.equal(player.currentTimeMs(), 2500)
player.resume()

console.log(`TTS service tests passed (${parts.length} segments, ${cached.length} cached)`)
