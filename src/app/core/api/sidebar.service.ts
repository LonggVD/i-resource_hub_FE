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
        roles: ['ROLE_STUDENT', 'ROLE_ADMIN', 'RESOURCE_VIEW'],
      },
      {
        label: 'Đặt lịch mượn',
        icon: '@tui.calendar-plus',
        route: '/bookings/create',
        roles: ['ROLE_STUDENT', 'BOOKING_REQUEST'],
      },
      {
        label: 'Lịch của tôi',
        icon: '@tui.calendar-check',
        route: '/my-bookings',
        roles: ['ROLE_STUDENT'],
      },

      // --- Admin/Manager Menu ---
      {
        label: 'Bảng quản lý mượn',
        icon: '@tui.layout-dashboard',
        route: '/admin/bookings',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'BOOKING_MANAGE'],
      },
      {
        label: 'Quản lý yêu cầu',
        icon: '@tui.clipboard-list',
        route: '/admin/bookings-list',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'BOOKING_APPROVE'],
      },
      {
        label: 'Quản lý danh mục',
        icon: '@tui.chart-bar-stacked',
        route: '/admin/categories',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'CATEGORY_MANAGE'],
      },
      {
        label: 'Quản lý đơn vị',
        icon: '@tui.building',
        route: '/admin/organization-units',
        roles: ['ROLE_ADMIN', 'UNIT_MANAGE'],
      },
      {
        label: 'Quản lý thiết bị',
        icon: '@tui.monitor',
        route: '/admin/resource-items',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'RESOURCE_MANAGE'],
      },
      {
        label: 'Quản lý người dùng',
        icon: '@tui.user-cog',
        route: '/admin/users',
        roles: ['ROLE_ADMIN', 'USER_MANAGE'],
      },
    ];

    return allItems.filter(
      (item) => !item.roles || item.roles.some((role) => roles.includes(role)),
    );
  });
}
