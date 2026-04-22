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
    path: 'forgot-password',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
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
      {
        path: 'admin/categories',
        loadComponent: () =>
          import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'admin/organization-units',
        loadComponent: () =>
          import('./features/organization-units/organization-units.component').then(
            (m) => m.OrganizationUnitsComponent,
          ),
      },
      {
        path: 'admin/resource-items',
        loadComponent: () =>
          import('./features/resource-items/resource-item.component').then(
            (m) => m.ResourceItemComponent,
          ),
      },
      {
        path: 'admin/bookings',
        loadComponent: () =>
          import('./features/bookings/booking-board/booking-board.component').then(
            (m) => m.BookingBoardComponent,
          ),
      },
      {
        path: 'my-bookings',
        loadComponent: () =>
          import('./features/bookings/my-bookings/my-bookings.component').then(
            (m) => m.MyBookingsComponent,
          ),
      },
      {
        path: 'admin/users',
        loadComponent: () =>
          import('./features/user/user.component').then((m) => m.UserComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
