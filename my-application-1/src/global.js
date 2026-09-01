/**
 * 将常用的 Feature API 挂载到 global 下，方便项目使用
 * 如果需要增加全局变量，请同步更新 app.d.ts，可用于代码提示、错误检测
 */
import router from '@blueos.app.appmanager.router'
global.router = router
global.player = {
  chapter: 18,
  chapterName: '山中岁月长',
  progress: 44,
  currentTime: '12:36'
}
