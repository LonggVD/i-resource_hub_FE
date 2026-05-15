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
      // --- Menu Chung ---
      {
        label: 'Trang chủ',
        icon: '@tui.house',
        route: '/dashboard',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
      },
      // --- Tra cứu tài nguyên ---
      // Admin/Manager dùng trang ag-Grid (full CRUD inline) tại /resources
      // Student dùng trang shop (gallery, wishlist, mượn ngay) tại /student-shop
      {
        label: 'Tra cứu tài nguyên',
        icon: '@tui.search',
        route: '/resources',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
      },
      {
        label: 'Tra cứu tài nguyên',
        icon: '@tui.search',
        route: '/student-shop',
        roles: ['ROLE_STUDENT'],
      },
      {
        label: 'Lịch của tôi',
        icon: '@tui.calendar-check',
        route: '/my-bookings',
        roles: ['ROLE_STUDENT'],
      },
      {
        label: 'Vi phạm & Xử phạt',
        icon: '@tui.shield-alert',
        route: '/my-penalties',
        roles: ['ROLE_STUDENT'],
      },

      // --- Admin/Manager Menu ---
      {
        label: 'Bảng quản lý mượn',
        icon: '@tui.layout-dashboard',
        route: '/admin/bookings',
        roles: ['ROLE_MANAGER'],
      },
      {
        label: 'Quản lý danh mục',
        icon: '@tui.chart-bar-stacked',
        route: '/admin/categories',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Quản lý đơn vị',
        icon: '@tui.building',
        route: '/admin/organization-units',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Quản lý thiết bị',
        icon: '@tui.monitor',
        route: '/admin/resource-items',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
      },
      {
        label: 'Quản lý khung giờ',
        icon: '@tui.clock',
        route: '/admin/time-slots',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Quản lý người dùng',
        icon: '@tui.user-cog',
        route: '/admin/users',
        roles: ['ROLE_ADMIN'],
      },
      {
        label: 'Quản lý xử phạt',
        icon: '@tui.shield-alert',
        route: '/admin/penalties',
        roles: ['ROLE_MANAGER'],
      },
      {
        label: 'Báo cáo & Xuất file',
        icon: '@tui.file-spreadsheet',
        route: '/admin/reports',
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
      },
    ];

    return allItems.filter(
      (item) => !item.roles || item.roles.some((role) => roles.includes(role)),
    );
  });
}
