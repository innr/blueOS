/// <reference types="@blueos" />
declare module '@blueos.ai.speech' {
  const speech: any;
  export default speech;
}
type Router = typeof import('@blueos.app.appmanager.router');

declare const global: {
  router: Router;
  player: {
    bookId: string;
    chapterId: string;
    positionMs: number;
    status: string;
    chapter: number;
    chapterName: string;
    progress: number;
    currentTime: string;
    localUri: string | null;
  };
  library: Array<unknown>;
  audioPlayer: any;
  watchAudioPlayer: any;
  audioManager: any;
  storage: any;
  file: any;
  connectionManager: any;
  findCachedAudio: (callback: (uri: string | null) => void) => void;
  findCachedSegment: (callback: (segment: any | null) => void) => void;
  findCachedSegmentAt: (positionMs: number, callback: (segment: any | null) => void) => void;
  getSegmentOffsetMs: (segment: any | null) => number;
  findNextCachedAudio: (uri: string | null, callback: (segment: any | null) => void) => void;
  getPeerStatus: (callback: (connected: boolean) => void) => void;
  probeNetwork: (callback: (online: boolean, type: string) => void) => void;
  prefetchChapter: (bookId: string, chapterId: string, text: string, positionMs?: number) => Promise<Array<unknown>>;
  configureTts: (appId: string, appKey: string) => void;
  getTtsStatus: () => { apiAvailable: boolean; credentialsConfigured: boolean };
  ttsProvider: any;
  cacheStore: any;
  prefetchManager: any;
  network: any;
  networkProbe: any;
  prefetchInFlight: Promise<Array<unknown>> | null;
}

declare const Promise: typeof Promise
