import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TuiBadgedContent, TuiBadge } from '@taiga-ui/kit';
import { AuthService } from '../../core/api/auth.service';
import { SidebarService } from '../../core/api/sidebar.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, TuiIcon, TuiBadgedContent, TuiBadge],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly notificationCount = signal(3);
  protected readonly showUserMenu = signal(false);

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
    return 'Sinh viên';
  });

  constructor(
    protected authService: AuthService,
    protected sidebarService: SidebarService,
  ) {}

  protected toggleSidebar(): void {
    // On mobile => toggle mobile overlay
    // On desktop => toggle collapsed
    if (window.innerWidth < 1024) {
      this.sidebarService.toggleMobile();
    } else {
      this.sidebarService.toggleCollapsed();
    }
  }

  protected toggleUserMenu(): void {
    this.showUserMenu.update((v) => !v);
  }

  protected closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  protected logout(): void {
    this.showUserMenu.set(false);
    this.authService.logout();
  }
}
