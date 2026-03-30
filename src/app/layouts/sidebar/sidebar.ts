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

  constructor(
    protected sidebarService: SidebarService,
    protected authService: AuthService,
  ) {
    this.collapsed = this.sidebarService.collapsed;
    this.mobileOpen = this.sidebarService.mobileOpen;
    this.menuItems = this.sidebarService.menuItems;

    this.userRoleLabel = computed(() => {
      const user = this.authService.user();
      if (!user) return '';
      if (user.roles.includes('ROLE_ADMIN')) return 'Quản trị viên';
      return 'Sinh viên';
    });

    this.isAdmin = computed(() => {
      const user = this.authService.user();
      return user?.roles.includes('ROLE_ADMIN') ?? false;
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
