/// <reference types="@blueos" />
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
  audioManager: any;
  storage: any;
  file: any;
  connectionManager: any;
  findLocalAudio: (callback: (uri: string | null) => void) => void;
  getPeerStatus: (callback: (connected: boolean) => void) => void;
}

declare const Promise: typeof Promise
