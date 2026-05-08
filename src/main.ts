// SockJS (dùng cho STOMP WebSocket) viết cho Node.js context và đọc biến `global`.
// Browser không có biến này -> ReferenceError. Polyfill ngay từ entry để mọi
// lazy-load module sau đó (sockjs-client) đều thấy.
(window as any).global = window;

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
