import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../api/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const handledReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(handledReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Bỏ qua endpoint /auth/login - 401 ở đây là sai mật khẩu, không phải token hết hạn
      const isLoginEndpoint = req.url.includes('/auth/login');
      if (err.status === 401 && !isLoginEndpoint && authService.isLoggedIn()) {
        authService.logout();
      }
      return throwError(() => err);
    }),
  );
};
