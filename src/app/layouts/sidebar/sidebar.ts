import { ChangeDetectionStrategy, Component, computed, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { SidebarService } from '../../core/api/sidebar.service';
import { AuthService } from '../../core/api/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TuiIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  protected readonly collapsed;
  protected readonly mobileOpen;
  protected readonly menuItems;
  protected readonly userRoleLabel;
  protected readonly isAdmin;
  protected readonly creditScore;

  constructor(
    protected sidebarService: SidebarService,
    protected authService: AuthService,
  ) {
    this.collapsed = this.sidebarService.collapsed;
    this.mobileOpen = this.sidebarService.mobileOpen;
    this.menuItems = this.sidebarService.menuItems;

    this.userRoleLabel = computed(() => {
      if (this.authService.hasRole('ROLE_ADMIN')) return 'Quản trị viên';
      if (this.authService.hasRole('ROLE_MANAGER')) return 'Quản lý';
      if (this.authService.hasRole('ROLE_STUDENT')) return 'Sinh viên';
      return '';
    });

    this.isAdmin = computed(() => {
      const user = this.authService.user();
      return user?.roles.includes('ROLE_ADMIN') ?? false;
    });

    this.creditScore = computed(() => {
      const user = this.authService.user();
      return user?.creditScore ?? 0;
    });
  }

  protected closeMobile(): void {
    this.sidebarService.closeMobile();
  }

  protected onNavClick(): void {
    // Auto-close on mobile after navigation
    if (window.innerWidth < 1024) {
      this.sidebarService.closeMobile();
    }
  }
}
