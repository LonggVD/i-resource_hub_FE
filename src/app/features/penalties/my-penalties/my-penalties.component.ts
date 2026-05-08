import { Component, OnInit, inject, signal } from '@angular/core';
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
}
