import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PenaltyService, PenaltyResponse } from '../../../core/api/penalty.service';
import { AuthService } from '../../../core/api/auth.service';
import { PaymentService } from '../../../core/api/payment.service';
import { TuiButton, TuiDialogService, TuiLoader, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { PenaltyDetailDialogComponent } from '../penalty-detail-dialog/penalty-detail-dialog.component';
import { IrhImage } from '../../../shared/components/irh-image/irh-image.component';
import { environment } from '../../../../environments/environment';

type FilterStatus = 'all' | 'active' | 'revoked';

@Component({
  selector: 'app-my-penalties',
  standalone: true,
  imports: [CommonModule, TuiLoader, TuiBadge, TuiButton, TuiIcon, IrhImage],
  templateUrl: './my-penalties.component.html',
  styleUrls: ['./my-penalties.component.css']
})
export class MyPenaltiesComponent implements OnInit {
  private penaltyService = inject(PenaltyService);
  private authService = inject(AuthService);
  private paymentService = inject(PaymentService);
  private dialogs = inject(TuiDialogService);

  penalties = signal<PenaltyResponse[]>([]);
  isLoading = signal<boolean>(false);
  filterStatus = signal<FilterStatus>('all');

  readonly summary = computed(() => {
    const list = this.penalties();
    const active = list.filter((p) => p.status === 'ACTIVE');
    return {
      total: list.length,
      active: active.length,
      revoked: list.length - active.length,
      totalPoints: active.reduce((sum, p) => sum + (p.penaltyPoint || 0), 0),
      unpaidFines: active.reduce((sum, p) => sum + (p.fineAmount || 0), 0),
    };
  });

  readonly filteredPenalties = computed(() => {
    const filter = this.filterStatus();
    const list = this.penalties();
    if (filter === 'active') return list.filter((p) => p.status === 'ACTIVE');
    if (filter === 'revoked') return list.filter((p) => p.status === 'REVOKED');
    return list;
  });

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      this.loadData(user.id);
    }
  }

  loadData(userId: string) {
    this.isLoading.set(true);
    this.penaltyService.getPenaltiesByUser(userId).subscribe({
      next: (res) => {
        this.penalties.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  setFilter(status: FilterStatus) {
    this.filterStatus.set(status);
  }

  viewDetail(penalty: PenaltyResponse) {
    this.isLoading.set(true);
    this.penaltyService.getPenaltyById(penalty.id).subscribe({
      next: (fullPenalty) => {
        this.isLoading.set(false);
        this.dialogs.open<void>(
          new PolymorpheusComponent(PenaltyDetailDialogComponent),
          {
            size: 'l',
            closeable: true,
            dismissible: true,
            label: 'Chi tiết vi phạm',
            data: fullPenalty,
          }
        ).subscribe();
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  payPenalty(penalty: PenaltyResponse) {
    this.isLoading.set(true);
    this.paymentService.createPenaltyPayment(penalty.id).subscribe({
      next: (res) => {
        window.location.href = res.checkoutUrl;
      },
      error: (err) => {
        this.isLoading.set(false);
        alert('Lỗi tạo link thanh toán: ' + err.message);
      }
    });
  }

  // ───────── Helpers hiển thị ─────────

  getTypeLabel(type: string): string {
    switch (type) {
      case 'OVERDUE': return 'Trễ trả';
      case 'DAMAGED': return 'Hư hỏng';
      case 'LOST': return 'Mất thiết bị';
      case 'LATE': return 'Trễ giờ';
      case 'NO_SHOW': return 'Vắng mặt';
      default: return type;
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'OVERDUE': return '@tui.clock-alert';
      case 'DAMAGED': return '@tui.wrench';
      case 'LOST': return '@tui.alert-triangle';
      case 'LATE': return '@tui.clock';
      case 'NO_SHOW': return '@tui.user-x';
      default: return '@tui.alert-circle';
    }
  }

  getShortTitle(p: PenaltyResponse): string {
    const verb = this.getTypeLabel(p.penaltyType);
    if (p.bookingDeviceName) return `${verb} ${p.bookingDeviceName}`;
    const idx = p.description?.indexOf('(') ?? -1;
    return idx > 0 ? p.description.substring(0, idx).trim() : (p.description || verb);
  }

  /** Trích "X phút sau" từ description, đổi thành "Hh Mm" cho dễ đọc. */
  getOverdueText(p: PenaltyResponse): string {
    const match = p.description?.match(/(\d+)\s*phút\s*sau/);
    if (!match) return '';
    const minutes = parseInt(match[1], 10);
    if (isNaN(minutes)) return '';
    if (minutes < 60) return `Quá hạn ${minutes} phút`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `Quá hạn ${h} giờ` : `Quá hạn ${h}h ${m}'`;
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Không xác định';
    switch (status) {
      case 'ACTIVE': return 'Đang hiệu lực';
      case 'REVOKED': return 'Đã được ân xá';
      default: return status;
    }
  }

  getReviewStatusLabel(status: string | undefined): string {
    if (!status) return 'Không yêu cầu';
    switch (status) {
      case 'PENDING': return 'Chờ nộp bản kiểm điểm';
      case 'SUBMITTED': return 'Đã nộp - Chờ duyệt';
      case 'APPROVED': return 'Đã duyệt bản kiểm điểm';
      default: return status;
    }
  }

  getFullUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + url;
  }
}
