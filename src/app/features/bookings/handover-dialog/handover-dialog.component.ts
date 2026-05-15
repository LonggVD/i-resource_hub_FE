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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiIcon, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import {
  NgxScannerQrcodeComponent,
  ScannerQRCodeResult,
  LOAD_WASM,
} from 'ngx-scanner-qrcode';
import { GroupedBooking, Booking } from '../../../core/models/booking.model';
import { TuiBadge } from '@taiga-ui/kit';

export interface HandoverResult {
  type: 'AUTO' | 'MANUAL';
  bookingIds?: string[];
  manualItems?: { bookingId: string; serialNumber: string }[];
}

@Component({
  selector: 'app-handover-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiTextfield,
    TuiBadge,
    NgxScannerQrcodeComponent,
  ],
  template: `
    <div class="handover-dialog">
      <div class="batch-info" *ngIf="group">
        <h3 class="batch-title">Bàn giao lô: {{ group.items[0].deviceName }} (x{{ group.items.length }})</h3>
        <p class="borrower-info">Người mượn: <strong>{{ group.borrowerName || 'Sinh viên' }}</strong></p>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button tuiButton appearance="primary" size="m" class="w-full" (click)="handoverAllAuto()">
          <tui-icon icon="@tui.zap"></tui-icon> Bàn giao nhanh tất cả (Auto)
        </button>
      </div>

      <div class="divider"><span>HOẶC QUÉT/NHẬP TỪNG THIẾT BỊ</span></div>

      <!-- List of items to handover -->
      <div class="handover-list">
        <div *ngFor="let item of groupItems(); let i = index" class="handover-item" [class.scanned]="item.scanned">
          <div class="item-header">
            <span class="item-index">#{{ i + 1 }}</span>
            <span class="item-serial-assigned">Gán sẵn: {{ item.originalSerial }}</span>
            <tui-badge *ngIf="item.scanned" appearance="success" size="s">Đã quét</tui-badge>
          </div>
          <div class="item-input">
            <tui-textfield size="m">
              <input
                tuiTextfield
                [id]="'scan-input-' + i"
                [(ngModel)]="item.newSerial"
                [placeholder]="'Quét QR máy thực tế #' + (i + 1)"
                (keyup.enter)="focusNext(i)"
              />
            </tui-textfield>
          </div>
        </div>
      </div>

      <div class="qr-scanner-container">
        <div class="scanner-window">
          <ngx-scanner-qrcode #scannerRef="scanner" (event)="onScannerEvent($event)"></ngx-scanner-qrcode>
          <div *ngIf="!isScannerStarted()" class="scanner-placeholder">
            <tui-icon icon="@tui.camera" class="placeholder-icon"></tui-icon>
            <p>Mở camera để quét vé sinh viên</p>
          </div>
        </div>
      </div>

      <div class="scanner-controls">
        <button tuiButton [appearance]="isScannerStarted() ? 'destructive' : 'primary'" size="m" (click)="toggleScanner()">
          {{ isScannerStarted() ? 'Tắt Camera' : 'Mở Camera' }}
        </button>
      </div>

      <div class="dialog-footer">
        <button tuiButton appearance="secondary" size="m" (click)="close()">Hủy</button>
        <button tuiButton appearance="primary" size="m" (click)="submitManual()" [disabled]="!canSubmitManual()">
          Hoàn tất bàn giao
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; box-sizing: border-box; width: 100%; }
    :host *, :host *::before, :host *::after { box-sizing: border-box; }

    .handover-dialog {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      max-height: 80vh;
      overflow-y: auto;
      min-width: 0;
      width: 100%;
    }
    .batch-info {
      min-width: 0;
    }
    .batch-title {
      margin: 0;
      color: var(--color-text);
      font-size: var(--font-size-lg);
      font-weight: 700;
      word-break: break-word;
    }
    .borrower-info {
      margin: var(--space-1) 0 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      word-break: break-word;
    }
    .quick-actions {
      padding: var(--space-2) 0;
      min-width: 0;
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      color: var(--color-text-subtle);
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--color-border);
    }
    .divider::before { margin-right: var(--space-3); }
    .divider::after { margin-left: var(--space-3); }
    .handover-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      min-width: 0;
    }
    .handover-item {
      padding: var(--space-3);
      background: var(--color-surface-alt);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      transition: border-color 0.15s ease, background 0.15s ease;
      min-width: 0;
    }
    .handover-item.scanned {
      border-color: var(--color-success);
      background: var(--color-success-soft);
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
      font-size: var(--font-size-xs);
      min-width: 0;
      flex-wrap: wrap;
    }
    .item-index {
      font-weight: 700;
      color: var(--color-primary);
    }
    .item-serial-assigned {
      color: var(--color-text-muted);
      min-width: 0;
      word-break: break-word;
      flex: 1;
    }
    .item-input {
      min-width: 0;
    }
    .item-input tui-textfield {
      width: 100%;
    }
    .qr-scanner-container {
      width: 100%;
      height: 200px;
      background: var(--color-text);
      border-radius: var(--radius-lg);
      overflow: hidden;
      position: relative;
      min-width: 0;
    }
    .scanner-window {
      position: relative;
      width: 100%;
      height: 100%;
    }
    ngx-scanner-qrcode {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .scanner-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      color: var(--color-text-faint);
      text-align: center;
    }
    .placeholder-icon {
      font-size: var(--font-size-2xl);
    }
    .scanner-controls {
      display: flex;
      justify-content: center;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      flex-wrap: wrap;
    }
    .w-full { width: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HandoverDialogComponent implements OnInit, OnDestroy {
  @ViewChild('scannerRef') scanner!: NgxScannerQrcodeComponent;

  private readonly context = inject<TuiDialogContext<HandoverResult | null, GroupedBooking>>(POLYMORPHEUS_CONTEXT);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly group = this.context.data;
  readonly groupItems = signal<any[]>([]);
  readonly isScannerStarted = signal(false);
  readonly scannerReady = signal(false);

  constructor() {
    LOAD_WASM('assets/wasm/ngx-scanner-qrcode.wasm').subscribe(() => {
      this.scannerReady.set(true);
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    if (this.group) {
      this.groupItems.set(this.group.items.map(item => ({
        id: item.id,
        originalSerial: item.serialNumber,
        newSerial: '',
        scanned: false,
        qrCodeToken: item.qrCodeToken
      })));
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  toggleScanner() {
    this.isScannerStarted() ? this.stopScanner() : this.startScanner();
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
    if (results?.length > 0) {
      const scannedToken = results[0].value;
      // Khớp token với item trong danh sách
      const items = this.groupItems();
      const targetIndex = items.findIndex(i => i.qrCodeToken === scannedToken && !i.scanned);

      if (targetIndex !== -1) {
        items[targetIndex].scanned = true;
        this.groupItems.set([...items]);
        this.cdr.detectChanges();

        // Nếu đã quét hết thì có thể tự động hoàn tất hoặc chờ manager bấm nút
        if (items.every(i => i.scanned)) {
           // Có thể tự động submit ở đây
        }
      }
    }
  }

  focusNext(currentIndex: number) {
    const nextIndex = currentIndex + 1;
    const nextInput = document.getElementById(`scan-input-${nextIndex}`);
    if (nextInput) {
      nextInput.focus();
    }
  }

  handoverAllAuto() {
    this.context.completeWith({
      type: 'AUTO',
      bookingIds: this.groupItems().map(i => i.id)
    });
  }

  canSubmitManual() {
    // Có thể cho phép submit nếu ít nhất 1 cái được nhập hoặc quét
    // Hoặc bắt buộc tất cả. Ở đây ta cho phép nếu tất cả đều có serial (mới hoặc cũ)
    return this.groupItems().length > 0;
  }

  submitManual() {
    const manualItems = this.groupItems().map(i => ({
      bookingId: i.id,
      serialNumber: i.newSerial.trim() || i.originalSerial
    }));
    this.context.completeWith({
      type: 'MANUAL',
      manualItems
    });
  }

  close() {
    this.context.completeWith(null);
  }
}
