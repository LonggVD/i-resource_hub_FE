import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon, RouterModule],
  template: `
    <div class="payment-container">
      <div class="result-card">
        <div class="cancel-icon">
          <tui-icon icon="@tui.x-circle" class="icon"></tui-icon>
        </div>
        <h2>Đã hủy thanh toán</h2>
        <p>Giao dịch đã bị hủy. Bạn có thể thử lại sau.</p>
        <div class="actions">
          <button tuiButton appearance="secondary" routerLink="/my-penalties">Quay lại</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      text-align: center;
      max-width: 400px;
    }
    .cancel-icon {
      font-size: 5rem;
      color: #ef4444;
      margin-bottom: 1.5rem;
    }
    .icon {
      width: 80px;
      height: 80px;
    }
    h2 { margin-bottom: 1rem; color: #1e293b; }
    p { color: #64748b; margin-bottom: 2rem; }
  `]
})
export class PaymentCancelComponent {}
