import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../api/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = route.data['roles'] as string[];

  if (authService.isLoggedIn() && authService.hasAnyRole(expectedRoles)) {
    return true;
  }

  // Redirect về landing page phù hợp với role để tránh loop guard
  const fallback = authService.hasAnyRole(['ROLE_STUDENT']) ? '/student-shop' : '/dashboard';
  router.navigate([fallback]);
  return false;
};
