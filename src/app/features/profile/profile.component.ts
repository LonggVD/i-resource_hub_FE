import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { UserService } from '../../core/api/user-service';
import { UserResponse } from '../../core/models/user.model';
import { NotificationService } from '../../core/api/notification';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, TuiIcon],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly notify = inject(NotificationService);

  protected readonly profile = signal<UserResponse | null>(null);

  protected readonly initial = computed(() => {
    const name = this.profile()?.fullName || this.profile()?.username || '';
    return name.charAt(0).toUpperCase() || '?';
  });

  protected readonly roleLabel = computed(() => {
    const codes = this.profile()?.roles.map((r) => r.roleCode) ?? [];
    if (codes.includes('ROLE_ADMIN')) return 'Quản trị viên';
    if (codes.includes('ROLE_MANAGER')) return 'Quản lý';
    if (codes.includes('ROLE_STUDENT')) return 'Sinh viên';
    return codes[0] ?? '—';
  });

  protected readonly creditPercent = computed(() => {
    const score = this.profile()?.creditScore ?? 0;
    return Math.max(0, Math.min(100, score));
  });

  protected readonly creditTier = computed(() => {
    const score = this.profile()?.creditScore ?? 0;
    if (score === 0) return 'locked';
    if (score < 50) return 'danger';
    if (score < 80) return 'warning';
    return 'success';
  });

  protected readonly isStudent = computed(() =>
    this.profile()?.roles.some((r) => r.roleCode === 'ROLE_STUDENT') ?? false,
  );

  ngOnInit(): void {
    this.userService.getMyProfile().subscribe({
      next: (res) => this.profile.set(res),
      error: () => this.notify.showError('Tải hồ sơ thất bại.'),
    });
  }
}
