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
import { books, initialPlayback } from './data/library.js'
global.router = router
global.audioPlayer = audioPlayer
global.audioManager = audioManager
global.storage = storage
global.file = file
global.connectionManager = connectionManager
global.library = books
global.player = {
  ...initialPlayback,
  localUri: null,
  chapter: 18,
  chapterName: '山中岁月长',
  progress: 44,
  currentTime: '12:36'
}
global.findLocalAudio = (callback) => {
  global.file.list({
    uri: 'internal://mass/',
    success: (result) => {
      const files = (result && result.fileList) || []
      const audio = files.find((item) => /\.mp3$/i.test(item.uri || ''))
      if (audio) global.player.localUri = audio.uri
      callback(audio ? audio.uri : null)
    },
    fail: () => callback(null)
  })
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
