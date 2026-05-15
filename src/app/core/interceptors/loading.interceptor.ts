import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../api/loading.service';

/**
 * Đính kèm vào HttpContext của request để bỏ qua thanh loading toàn cục.
 * Dùng cho các call nền (polling, websocket fallback...) tránh nháy bar liên tục.
 *
 * Ví dụ:
 *   this.http.get(url, { context: new HttpContext().set(SKIP_LOADING, true) })
 */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }

  const loading = inject(LoadingService);
  loading.increment();
  return next(req).pipe(finalize(() => loading.decrement()));
};
