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
  };
  library: Array<unknown>;
}

declare const Promise: typeof Promise
