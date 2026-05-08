import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../../core/api/payment.service';
import { TuiLoader, TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, TuiLoader, TuiButton, TuiIcon, RouterModule],
  template: `
    <div class="payment-container">
      <tui-loader
        [showLoader]="isLoading"
        [overlay]="true"
        [textContent]="'Đang xác nhận thanh toán...'"
      >
        <div class="result-card" *ngIf="!isLoading">
          <div class="success-icon">
            <tui-icon icon="@tui.check-circle" class="icon"></tui-icon>
          </div>
          <h2>Thanh toán thành công!</h2>
          <p>Cảm ơn bạn. Án phạt của bạn đã được cập nhật trạng thái.</p>
          <div class="actions">
            <button tuiButton appearance="primary" routerLink="/my-penalties">
              Về danh sách vi phạm
            </button>
          </div>
        </div>
      </tui-loader>
    </div>
  `,
  styles: [
    `
      .payment-container {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #f8fafc;
      }
      .result-card {
        background: white;
        padding: 3rem;
        border-radius: 24px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        text-align: center;
        max-width: 400px;
      }
      .success-icon {
        font-size: 5rem;
        color: #10b981;
        margin-bottom: 1.5rem;
      }
      .icon {
        width: 80px;
        height: 80px;
      }
      h2 {
        margin-bottom: 1rem;
        color: #1e293b;
      }
      p {
        color: #64748b;
        margin-bottom: 2rem;
      }
    `,
  ],
})
export class PaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  isLoading = true;

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const orderCode = params['orderCode'];
      const status = params['status'];

      if (status === 'PAID' && orderCode) {
        this.paymentService.verifyPayment(orderCode).subscribe({
          next: () => {
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Verify failed', err);
            this.isLoading = false;
            // Dù lỗi verify nhưng PayOS báo PAID thì vẫn là success,
            // có thể do BE sync chậm hoặc lỗi mạng.
          },
        });
      } else {
        this.router.navigate(['/my-penalties']);
      }
    });
  }
}
