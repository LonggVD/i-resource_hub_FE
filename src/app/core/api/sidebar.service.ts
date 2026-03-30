import { Injectable, signal, computed } from '@angular/core';
import { SidebarItem } from '../models/sidebar.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private readonly _collapsed = signal(false);
  private readonly _mobileOpen = signal(false);

  readonly collapsed = this._collapsed.asReadonly();
  readonly mobileOpen = this._mobileOpen.asReadonly();

  constructor(private authService: AuthService) {}

  toggleCollapsed(): void {
    this._collapsed.update((v) => !v);
  }

  setCollapsed(value: boolean): void {
    this._collapsed.set(value);
  }

  toggleMobile(): void {
    this._mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this._mobileOpen.set(false);
  }

  readonly menuItems = computed<SidebarItem[]>(() => {
    const user = this.authService.user();
    const roles = user?.roles ?? [];

    const allItems: SidebarItem[] = [
      // --- Student Menu ---
      {
        label: 'Trang chủ',
        icon: '@tui.house',
        route: '/dashboard',
        roles: ['ROLE_STUDENT', 'ROLE_ADMIN'],
      },
      {
        label: 'Tra cứu tài nguyên',
        icon: '@tui.search',
        route: '/resources',
        roles: ['ROLE_STUDENT', 'ROLE_ADMIN'],
      },
      {
        label: 'Đặt lịch mượn',
        icon: '@tui.calendar-plus',
        route: '/bookings/create',
        roles: ['ROLE_STUDENT'],
      },
      {
        label: 'Lịch của tôi',
        icon: '@tui.calendar-check',
        route: '/my-bookings',
        roles: ['ROLE_STUDENT'],
      },
      {
        label: 'Mã QR của tôi',
        icon: '@tui.qr-code',
        route: '/my-qr',
        roles: ['ROLE_STUDENT'],
      },

      // --- Admin Menu ---
      {
        label: 'Quản lý yêu cầu',
        icon: '@tui.clipboard-list',
        route: '/admin/bookings',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Quản lý danh mục',
        icon: '@tui.chart-bar-stacked',
        route: '/admin/categories',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Quản lý đơn vị tổ chức',
        icon: '@tui.users',
        route: '/admin/organization-units',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Quản lý kho',
        icon: '@tui.warehouse',
        route: '/admin/inventory',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Nhận / Trả thiết bị',
        icon: '@tui.scan-line',
        route: '/admin/check-in-out',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Vi phạm & Minh chứng',
        icon: '@tui.shield-alert',
        route: '/admin/violations',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Báo cáo thống kê',
        icon: '@tui.chart-bar',
        route: '/admin/reports',
        roles: ['ROLE_ADMIN'],
      },
    ];

    return allItems.filter(
      (item) => !item.roles || item.roles.some((role) => roles.includes(role)),
    );
  });
}
