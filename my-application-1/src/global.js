/**
 * 将常用的 Feature API 挂载到 global 下，方便项目使用
 * 如果需要增加全局变量，请同步更新 app.d.ts，可用于代码提示、错误检测
 */
import router from '@blueos.app.appmanager.router'
import audioPlayer from '@blueos.media.audio.audioPlayer'
import audioManager from '@blueos.media.audio.audioManager'
import storage from '@blueos.storage.storage'
import file from '@blueos.storage.file'
import connectionManager from '@blueos.bluexlink.connectionManager'
import network from '@blueos.network.networkManager'
import speech from '@blueos.ai.speech'
import { createNetworkProbe } from './services/network/networkProbe.js'
import { BlueosOnlineTtsProvider } from './services/tts/blueosOnlineTtsProvider.js'
import { BlueosCacheStore } from './services/storage/cacheStore.js'
import { PrefetchManager } from './services/tts/prefetchManager.js'
import { segmentText } from './services/tts/textSegmenter.js'
import { createCacheSegment } from './services/tts/cacheSegment.js'
import { WatchAudioPlayer } from './services/audio/watchAudioPlayer.js'
import { books, initialPlayback } from './data/library.js'
global.router = router
global.audioPlayer = audioPlayer
global.audioManager = audioManager
global.storage = storage
global.file = file
global.connectionManager = connectionManager
global.network = network
global.networkProbe = createNetworkProbe(network)
global.ttsProvider = new BlueosOnlineTtsProvider(speech, {
  // Inject through a secure Studio build configuration; never commit secrets.
  appId: '',
  appKey: ''
})
global.cacheStore = new BlueosCacheStore(file, storage)
global.prefetchManager = new PrefetchManager(global.ttsProvider, global.cacheStore, global.networkProbe)
global.watchAudioPlayer = new WatchAudioPlayer(audioPlayer)
global.prefetchInFlight = null
global.networkProbe.subscribe((type) => {
  // Network availability is not equivalent to TTS availability. The manager
  // probes the provider again before resuming synthesis after reconnect.
  global.prefetchManager.onNetworkChanged(type).catch(() => {})
})
global.library = books
global.player = {
  ...initialPlayback,
  localUri: null,
  chapter: 18,
  chapterName: '山中岁月长',
  progress: 44,
  currentTime: '12:36'
}
global.findCachedSegmentAt = (positionMs, callback) => {
  const ready = global.cacheStore.listReady(global.player.bookId)
    .filter((item) => item.chapterId === global.player.chapterId && item.uri)
    .sort((a, b) => a.sequence - b.sequence)
  const target = Math.max(0, Number(positionMs) || 0)
  const defaultDuration = global.prefetchManager.config.segmentTargetMs || 300000
  let cursor = 0
  let segment = null
  let expectedSequence = 0
  for (const item of ready) {
    if (item.sequence !== expectedSequence) break
    const duration = item.durationMs || defaultDuration
    if (target < cursor + duration) { segment = item; break }
    cursor += duration
    expectedSequence += 1
  }
  if (segment) global.player.localUri = segment.uri
  callback(segment || null)
}
global.getSegmentOffsetMs = (segment) => {
  if (!segment) return 0
  const defaultDuration = global.prefetchManager.config.segmentTargetMs || 300000
  return global.cacheStore.listReady(global.player.bookId)
    .filter((item) => item.chapterId === segment.chapterId && item.sequence < segment.sequence)
    .reduce((total, item) => total + (item.durationMs || defaultDuration), 0)
}
global.findCachedSegment = (callback) => {
  global.findCachedSegmentAt(global.player.positionMs, callback)
}
global.findCachedAudio = (callback) => {
  global.findCachedSegment((segment) => callback(segment ? segment.uri : null))
}
global.findNextCachedAudio = (uri, callback) => {
  const book = global.library.find((item) => item.id === global.player.bookId)
  const chapterOrder = book && Array.isArray(book.chapters) ? book.chapters.map((item) => item.id) : [global.player.chapterId]
  const order = (item) => {
    const chapterIndex = chapterOrder.indexOf(item.chapterId)
    return (chapterIndex < 0 ? Number.MAX_SAFE_INTEGER : chapterIndex) * 100000 + item.sequence
  }
  const ready = global.cacheStore.listReady(global.player.bookId)
    .filter((item) => item.uri)
    .sort((a, b) => order(a) - order(b))
  const current = ready.find((item) => item.uri === uri)
  const next = current ? ready.find((item) => order(item) > order(current)) : ready[0]
  if (next) global.player.localUri = next.uri
  callback(next || null)
}
global.phoneBridge = null
global.connectPhone = (packageName, fingerprint, onMessage) => {
  const bridge = global.connectionManager.instance({ package: packageName, fingerprint })
  bridge.onMessage = onMessage
  global.phoneBridge = bridge
  return bridge
}
global.getPeerStatus = (callback) => {
  try {
    global.connectionManager.getPeerDeviceStatus({
      success: (result) => callback(result && result.status === 1),
      fail: () => callback(false)
    })
  } catch (error) {
    callback(false)
  }
}
global.probeNetwork = (callback) => {
  global.networkProbe.getType((type) => callback(type !== 'none', type))
}
global.prefetchChapter = (bookId, chapterId, text, positionMs = global.player.positionMs || 0) => {
  if (global.prefetchInFlight) return global.prefetchInFlight
  global.prefetchInFlight = (async () => {
    const book = global.library.find((item) => item.id === bookId)
    const chapters = book && Array.isArray(book.chapters) ? book.chapters : [{ id: chapterId, content: text }]
    const startIndex = Math.max(0, chapters.findIndex((item) => item.id === chapterId))
    const entries = chapters.slice(startIndex)
    if (!entries.length) return []
    const ready = []
    const probe = await global.prefetchManager.start(bookId)
    if (!probe.reachable) return ready
    const targetAheadMs = global.prefetchManager.config.targetAheadMs || 1800000
    const segmentTargetMs = global.prefetchManager.config.segmentTargetMs || 300000
    let aheadMs = 0
    for (const entry of entries) {
      const source = entry.id === chapterId && text ? text : entry.content
      const segments = segmentText(source)
      for (const part of segments) {
        const segment = createCacheSegment(bookId, entry.id, part, {})
        const segmentStartMs = entry.id === chapterId ? part.sequence * segmentTargetMs : 0
        const cached = global.cacheStore.listReady(bookId).find((item) => item.id === segment.id)
        const duration = cached && cached.durationMs || segmentTargetMs
        const remaining = entry.id === chapterId
          ? Math.max(0, duration - Math.max(0, positionMs - segmentStartMs))
          : duration
        if (cached) {
          aheadMs += remaining
          if (aheadMs >= targetAheadMs) return ready
          continue
        }
        const result = await global.prefetchManager.prefetch(segment)
        if (!result) return ready
        ready.push(result)
        const generatedDuration = result.durationMs || segmentTargetMs
        aheadMs += entry.id === chapterId
          ? Math.max(0, generatedDuration - Math.max(0, positionMs - segmentStartMs))
          : generatedDuration
        if (aheadMs >= targetAheadMs) return ready
      }
    }
    return ready
  })().finally(() => { global.prefetchInFlight = null })
  return global.prefetchInFlight
}
global.configureTts = (appId, appKey) => {
  global.ttsProvider.configure({ appId, appKey })
  global.prefetchManager.provider = global.ttsProvider
}
global.getTtsStatus = () => global.ttsProvider.getStatus()
