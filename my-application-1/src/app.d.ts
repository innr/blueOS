/// <reference types="@blueos" />
type Router = typeof import('@blueos.app.appmanager.router');

declare const global: {
  router: Router;
  player: {
    chapter: number;
    chapterName: string;
    progress: number;
    currentTime: string;
  };
}

declare const Promise: typeof Promise
