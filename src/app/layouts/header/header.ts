import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { AuthService } from '../../core/api/auth.service';
import { SidebarService } from '../../core/api/sidebar.service';
import {
  NotificationFeedService,
  NotificationItem,
} from '../../core/api/notification-feed.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, TuiIcon],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header implements OnInit, OnDestroy {
  protected readonly showUserMenu = signal(false);
  protected readonly showNotifPanel = signal(false);

  protected readonly feed = inject(NotificationFeedService);
  protected readonly notifications = this.feed.items;
  protected readonly notificationCount = this.feed.unreadCount;

  protected readonly userInitial = computed(() => {
    const name = this.authService.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  protected readonly displayName = computed(() => {
    return this.authService.username() || 'Người dùng';
  });

  protected readonly userRoleLabel = computed(() => {
    const user = this.authService.user();
    if (!user) return '';
    if (user.roles.includes('ROLE_ADMIN')) return 'Quản trị viên';
    if (user.roles.includes('ROLE_MANAGER')) return 'Quản lý';
    if (user.roles.includes('ROLE_STUDENT')) return 'Sinh viên';
    return '';
  });

  constructor(
    protected authService: AuthService,
    protected sidebarService: SidebarService,
    private router: Router,
  ) {
    // Tự connect/disconnect WebSocket theo trạng thái đăng nhập
    effect(() => {
      const loggedIn = this.authService.isLoggedIn();
      if (loggedIn) {
        this.feed.connect();
      } else {
        this.feed.disconnect();
      }
    });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.feed.loadInitial().subscribe({ error: () => {} });
    }
  }

  ngOnDestroy() {
    // Để feed tồn tại global, không disconnect ở đây
  }

  protected toggleSidebar(): void {
    if (window.innerWidth < 1024) {
      this.sidebarService.toggleMobile();
    } else {
      this.sidebarService.toggleCollapsed();
    }
  }

  protected toggleUserMenu(): void {
    this.showUserMenu.update((v) => !v);
    if (this.showUserMenu()) this.showNotifPanel.set(false);
  }

  protected closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  protected toggleNotifPanel(): void {
    this.showNotifPanel.update((v) => !v);
    if (this.showNotifPanel()) {
      this.showUserMenu.set(false);
      // Tải lại trong trường hợp đã offline trước đó
      this.feed.loadInitial().subscribe({ error: () => {} });
    }
  }

  protected closeNotifPanel(): void {
    this.showNotifPanel.set(false);
  }

  protected onNotifClick(n: NotificationItem): void {
    if (!n.read) {
      this.feed.markAsRead(n.id).subscribe({ error: () => {} });
    }
    // Deep-link nếu có referenceId
    if (n.referenceId) {
      const route = this.routeForType(n.type, n.referenceId);
      if (route) {
        this.router.navigate(route);
        this.closeNotifPanel();
      }
    }
  }

  protected onMarkAll(event: Event): void {
    event.stopPropagation();
    this.feed.markAllAsRead().subscribe({ error: () => {} });
  }

  protected onRemove(n: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.feed.remove(n.id).subscribe({ error: () => {} });
  }

  private routeForType(type: string, refId: string): string[] | null {
    if (type?.startsWith('BOOKING_')) {
      // Admin/Manager đi vào bảng Kanban; sinh viên vào "Đơn của tôi".
      const isManager = this.authService.hasAnyRole(['ROLE_ADMIN', 'ROLE_MANAGER']);
      return isManager ? ['/admin/bookings'] : ['/my-bookings'];
    }
    if (type === 'PENALTY_CREATED') {
      return ['/my-penalties'];
    }
    return null;
  }

  protected logout(): void {
    this.showUserMenu.set(false);
    this.feed.disconnect();
    this.authService.logout();
  }
}
