import { Routes } from '@angular/router';
import { loginGuard, authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
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
        title: 'Tra cứu tài nguyên',
      },
      {
        path: 'student-shop',
        loadComponent: () =>
          import('./features/student-shop/student-shop.component').then(
            (m) => m.StudentShopComponent,
          ),
        title: 'Tra cứu tài nguyên',
      },
      {
        path: 'resources/:id',
        loadComponent: () =>
          import('./features/resource-detail/resource-detail.component').then(
            (m) => m.ResourceDetailComponent,
          ),
        title: 'Chi tiết thiết bị',
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/cart-page/cart-page.component').then((m) => m.CartPageComponent),
        title: 'Giỏ hàng của tôi',
      },
      {
        path: 'admin/categories',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN'] },
        loadComponent: () =>
          import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'admin/organization-units',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN'] },
        loadComponent: () =>
          import('./features/organization-units/organization-units.component').then(
            (m) => m.OrganizationUnitsComponent,
          ),
      },
      {
        path: 'admin/resource-items',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] },
        loadComponent: () =>
          import('./features/resource-items/resource-item.component').then(
            (m) => m.ResourceItemComponent,
          ),
      },
      {
        path: 'admin/bookings',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_MANAGER'] },
        loadComponent: () =>
          import('./features/bookings/booking-board/booking-board.component').then(
            (m) => m.BookingBoardComponent,
          ),
      },
      {
        path: 'admin/time-slots',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN'] },
        loadComponent: () =>
          import('./features/time-slots/time-slots.component').then(
            (m) => m.TimeSlotsComponent,
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
        path: 'my-penalties',
        loadComponent: () =>
          import('./features/penalties/my-penalties/my-penalties.component').then(
            (m) => m.MyPenaltiesComponent,
          ),
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN'] },
        loadComponent: () =>
          import('./features/user/user.component').then((m) => m.UserComponent),
      },
      {
        path: 'admin/penalties',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_MANAGER'] },
        loadComponent: () =>
          import('./features/penalties/penalties.component').then((m) => m.PenaltiesComponent),
      },
      {
        path: 'admin/reports',
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] },
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
        title: 'Báo cáo & Xuất file',
      },
      {
        path: 'payment/success',
        loadComponent: () =>
          import('./features/payment/payment-success/payment-success.component').then(
            (m) => m.PaymentSuccessComponent
          ),
      },
      {
        path: 'payment/cancel',
        loadComponent: () =>
          import('./features/payment/payment-cancel/payment-cancel.component').then(
            (m) => m.PaymentCancelComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
