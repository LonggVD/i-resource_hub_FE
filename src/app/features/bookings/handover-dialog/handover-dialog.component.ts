import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiIcon, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import {
  NgxScannerQrcodeComponent,
  ScannerQRCodeResult,
  LOAD_WASM,
} from 'ngx-scanner-qrcode';
import { Booking } from '../../../core/models/booking.model';

@Component({
  selector: 'app-handover-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiTextfield,
    NgxScannerQrcodeComponent,
  ],
  template: `
    <div class="handover-dialog">
      <div class="booking-summary" *ngIf="booking">
        <p class="summary-text">
          Bàn giao: <strong>{{ booking.deviceName || 'Thiết bị' }}</strong> cho 
          <strong>{{ booking.borrowerName || 'Sinh viên' }}</strong>
        </p>
      </div>

      <div class="qr-scanner-container">
        <!-- 16:9 Scanner Window -->
        <div class="scanner-window">
          <ngx-scanner-qrcode
            #scannerRef="scanner"
            (event)="onScannerEvent($event)"
            [config]="{ isBeep: true, vibrate: 300 }"
          ></ngx-scanner-qrcode>

          <!-- Overlay Decorations -->
          <div class="scanner-overlay">
            <div class="scanner-laser"></div>
            <div class="scanner-corner corner-tl"></div>
            <div class="scanner-corner corner-tr"></div>
            <div class="scanner-corner corner-bl"></div>
            <div class="scanner-corner corner-br"></div>
          </div>

          <!-- Placeholder -->
          <div *ngIf="!isScannerStarted()" class="scanner-placeholder">
            <tui-icon icon="@tui.camera" class="placeholder-icon"></tui-icon>
            <p>Nhấn "Mở Camera" để bắt đầu quét vé của sinh viên</p>
          </div>
        </div>
      </div>

      <div class="scanner-controls">
        <button
          tuiButton
          [appearance]="isScannerStarted() ? 'destructive' : 'primary'"
          size="m"
          (click)="toggleScanner()"
          [disabled]="!scannerReady()"
        >
          <tui-icon [icon]="isScannerStarted() ? '@tui.camera-off' : '@tui.camera'"></tui-icon>
          &nbsp;{{ isScannerStarted() ? 'Tắt Camera' : 'Mở Camera' }}
        </button>

        <span *ngIf="!scannerReady()" class="loading-hint">
          <tui-loader size="s"></tui-loader>&nbsp;Đang cấu hình...
        </span>
      </div>

      <div class="manual-entry">
        <div class="divider">
          <span>HOẶC NHẬP MÃ THỦ CÔNG</span>
        </div>
        <div class="input-group">
          <tui-textfield>
            <input
              tuiTextfield
              [formControl]="manualToken"
              placeholder="Nhập mã UUID từ vé..."
              class="input-field"
            />
          </tui-textfield>
          <button
            tuiButton
            appearance="primary"
            size="m"
            (click)="submitManual()"
            [disabled]="!manualToken.value"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .handover-dialog {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .booking-summary {
      background: #f1f5f9;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      border-left: 4px solid #6366f1;
    }
    .summary-text {
      margin: 0;
      font-size: 0.9375rem;
      color: #334155;
    }
    .qr-scanner-container {
      width: 100%;
      background: #000;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .scanner-window {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
      height: 0;
    }
    ngx-scanner-qrcode {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .scanner-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }
    .scanner-laser {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(to right, transparent, #ef4444, transparent);
      animation: scan 2s linear infinite;
    }
    @keyframes scan {
      0% { top: 10%; }
      50% { top: 90%; }
      100% { top: 10%; }
    }
    .scanner-corner {
      position: absolute;
      width: 30px;
      height: 30px;
      border: 3px solid #fff;
    }
    .corner-tl { top: 10%; left: 10%; border-right: none; border-bottom: none; }
    .corner-tr { top: 10%; right: 10%; border-left: none; border-bottom: none; }
    .corner-bl { bottom: 10%; left: 10%; border-right: none; border-top: none; }
    .corner-br { bottom: 10%; right: 10%; border-left: none; border-top: none; }

    .scanner-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      text-align: center;
      padding: 2rem;
    }
    .placeholder-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .scanner-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }
    .loading-hint {
      display: flex;
      align-items: center;
      font-size: 0.875rem;
      color: #64748b;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 1rem 0;
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e2e8f0;
    }
    .divider:not(:empty)::before { margin-right: 1rem; }
    .divider:not(:empty)::after { margin-left: 1rem; }

    .input-group {
      display: flex;
      gap: 0.75rem;
    }
    .input-field {
      flex: 1;
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding-left: 1rem;
      padding-right: 1rem;
      font-size: 0.9375rem;
      color: #1e293b;
      transition: all 0.2s ease;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HandoverDialogComponent implements OnInit, OnDestroy {
  @ViewChild('scannerRef') scanner!: NgxScannerQrcodeComponent;

  private readonly context = inject<TuiDialogContext<string | null, Booking>>(POLYMORPHEUS_CONTEXT);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly booking = this.context.data;
  readonly manualToken = new FormControl('');
  
  readonly isScannerStarted = signal(false);
  readonly scannerReady = signal(false);

  constructor() {
    LOAD_WASM('assets/wasm/ngx-scanner-qrcode.wasm').subscribe({
      next: () => {
        this.scannerReady.set(true);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load scanner WASM:', err);
      }
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopScanner();
  }

  toggleScanner() {
    if (this.isScannerStarted()) {
      this.stopScanner();
    } else {
      this.startScanner();
    }
  }

  startScanner() {
    if (this.scanner && this.scannerReady()) {
      this.scanner.start();
      this.isScannerStarted.set(true);
    }
  }

  stopScanner() {
    if (this.scanner && this.isScannerStarted()) {
      this.scanner.stop();
      this.isScannerStarted.set(false);
    }
  }

  onScannerEvent(results: ScannerQRCodeResult[]) {
    if (results && results.length > 0) {
      const scannedValue = results[0].value;
      if (scannedValue) {
        this.stopScanner();
        this.context.completeWith(scannedValue);
      }
    }
  }

  submitManual() {
    if (this.manualToken.value) {
      this.context.completeWith(this.manualToken.value);
    }
  }
}
