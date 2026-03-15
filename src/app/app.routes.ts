import { Routes } from '@angular/router';
import { loginGuard, authGuard } from './core/guards/auth.guard';
import { AdminLayout } from './layouts/admin-layout/admin-layout';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: AdminLayout,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      // Các route cần đăng nhập sẽ thêm ở đây
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./features/resources/resources.component').then((m) => m.ResourcesComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
