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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiIcon, TuiTextfield } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import {
  NgxScannerQrcodeComponent,
  ScannerQRCodeResult,
  LOAD_WASM,
} from 'ngx-scanner-qrcode';
import { GroupedBooking } from '../../../core/models/booking.model';
import { TuiBadge } from '@taiga-ui/kit';

export interface HandoverResult {
  type: 'AUTO' | 'MANUAL';
  bookingIds?: string[];
  manualItems?: { bookingId: string; serialNumber: string }[];
}

interface HandoverSlot {
  bookingId: string;
  scannedSerial: string; // Serial vừa quét/nhập cho slot này
  confirmed: boolean;    // Đã chốt slot (đã quét/nhập xong)
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
    TuiTextfield,
    TuiBadge,
    NgxScannerQrcodeComponent,
  ],
  template: `
    <div class="handover-dialog">
      <div class="batch-info" *ngIf="group">
        <h3 class="batch-title">Bàn giao lô: {{ group.items[0].deviceName }} (x{{ group.items.length }})</h3>
        <p class="borrower-info">Người mượn: <strong>{{ group.borrowerName || 'Sinh viên' }}</strong></p>
        <p class="handover-hint">
          Quét QR trên từng thiết bị để bind serial thực tế vào đơn — sinh viên không cần quan tâm máy nào.
        </p>
      </div>

      <!-- Tiến độ -->
      <div class="progress-row">
        <div class="progress-text">
          <span class="progress-num">{{ confirmedCount() }}</span>
          <span class="progress-total">/ {{ slots().length }} thiết bị đã chốt</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="progressPct()"></div>
        </div>
      </div>

      <!-- N slot trống tương ứng N thiết bị cần giao -->
      <div class="handover-list">
        <div
          *ngFor="let slot of slots(); let i = index"
          class="handover-item"
          [class.confirmed]="slot.confirmed"
          [class.active]="i === activeIndex() && !slot.confirmed"
        >
          <div class="item-header">
            <span class="item-index">Thiết bị #{{ i + 1 }}</span>
            <tui-badge *ngIf="slot.confirmed" appearance="success" size="s">
              <tui-icon icon="@tui.check"></tui-icon>&nbsp;Đã chốt
            </tui-badge>
            <tui-badge *ngIf="!slot.confirmed && i === activeIndex()" appearance="warning" size="s">
              Đang chờ quét
            </tui-badge>
          </div>
          <div class="item-input">
            <tui-textfield size="m">
              <input
                tuiTextfield
                [id]="'scan-input-' + i"
                [(ngModel)]="slot.scannedSerial"
                [placeholder]="'Quét QR hoặc nhập serial cho thiết bị #' + (i + 1)"
                (focus)="activeIndex.set(i)"
                (keyup.enter)="confirmSlot(i)"
              />
            </tui-textfield>
            <button
              tuiButton
              appearance="secondary"
              size="s"
              [disabled]="!slot.scannedSerial.trim()"
              (click)="confirmSlot(i)"
            >
              {{ slot.confirmed ? 'Đổi' : 'Chốt' }}
            </button>
          </div>
        </div>
      </div>

      <div class="qr-scanner-container">
        <div class="scanner-window">
          <ngx-scanner-qrcode #scannerRef="scanner" (event)="onScannerEvent($event)"></ngx-scanner-qrcode>
          <div *ngIf="!isScannerStarted()" class="scanner-placeholder">
            <tui-icon icon="@tui.camera" class="placeholder-icon"></tui-icon>
            <p>Bật camera để quét QR từng thiết bị</p>
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
        <button tuiButton appearance="primary" size="m" (click)="submitManual()" [disabled]="!canSubmit()">
          Hoàn tất bàn giao ({{ confirmedCount() }}/{{ slots().length }})
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
    .handover-hint {
      margin: var(--space-2) 0 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-subtle);
      font-style: italic;
    }
    .progress-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) 0;
      min-width: 0;
    }
    .progress-text {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      flex-shrink: 0;
    }
    .progress-num {
      font-weight: 700;
      color: var(--color-primary);
    }
    .progress-bar {
      flex: 1;
      height: 8px;
      background: var(--color-surface-alt);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-primary);
      transition: width 0.25s ease;
    }
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
    .handover-item.confirmed {
      border-color: var(--color-success);
      background: var(--color-success-soft);
    }
    .handover-item.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-soft-2, rgba(99,102,241,0.15));
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
    .item-input {
      min-width: 0;
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }
    .item-input tui-textfield {
      flex: 1;
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
  /** N slot trống tương ứng N booking trong batch; thứ tự không quan trọng vì cùng template. */
  readonly slots = signal<HandoverSlot[]>([]);
  /** Slot đang được trỏ tới — scanner sẽ điền vào đây nếu trống. */
  readonly activeIndex = signal(0);
  readonly isScannerStarted = signal(false);
  readonly scannerReady = signal(false);

  /** Chống debounce scan trùng liên tiếp. */
  private lastScanValue = '';
  private lastScanAt = 0;

  constructor() {
    LOAD_WASM('assets/wasm/ngx-scanner-qrcode.wasm').subscribe(() => {
      this.scannerReady.set(true);
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    if (this.group) {
      this.slots.set(this.group.items.map((item) => ({
        bookingId: item.id,
        scannedSerial: '',
        confirmed: false,
      })));
      this.activeIndex.set(0);
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  // ── Tiến độ ─────────────────────────────────────────────────────
  confirmedCount(): number {
    return this.slots().filter((s) => s.confirmed).length;
  }

  progressPct(): number {
    const total = this.slots().length;
    return total === 0 ? 0 : Math.round((this.confirmedCount() / total) * 100);
  }

  canSubmit(): boolean {
    const list = this.slots();
    return list.length > 0 && list.every((s) => s.confirmed);
  }

  // ── Scanner ─────────────────────────────────────────────────────
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
    if (!results?.length) return;

    const value = (results[0].value || '').trim();
    if (!value) return;

    const now = Date.now();
    // Bỏ qua nếu cùng serial được đọc lại trong vòng 1.5s (camera bắn liên tục)
    if (value === this.lastScanValue && now - this.lastScanAt < 1500) return;
    this.lastScanValue = value;
    this.lastScanAt = now;

    const list = [...this.slots()];

    // Trùng với slot đã chốt → bỏ qua, tránh đếm 2 lần cùng 1 máy
    if (list.some((s) => s.confirmed && s.scannedSerial === value)) {
      return;
    }

    // Tìm slot trống đầu tiên kể từ activeIndex
    const start = this.activeIndex();
    let target = -1;
    for (let i = 0; i < list.length; i++) {
      const idx = (start + i) % list.length;
      if (!list[idx].confirmed) {
        target = idx;
        break;
      }
    }
    if (target === -1) return; // tất cả đã chốt

    list[target] = { ...list[target], scannedSerial: value, confirmed: true };
    this.slots.set(list);

    // Trỏ tới slot trống kế tiếp
    const nextEmpty = list.findIndex((s) => !s.confirmed);
    this.activeIndex.set(nextEmpty === -1 ? target : nextEmpty);
    this.cdr.detectChanges();
  }

  // ── Nhập tay ────────────────────────────────────────────────────
  confirmSlot(index: number) {
    const list = [...this.slots()];
    const slot = list[index];
    if (!slot) return;

    const serial = (slot.scannedSerial || '').trim();
    if (!serial) return;

    // Không cho chốt nếu serial trùng với slot đã chốt khác
    const dup = list.findIndex((s, i) => i !== index && s.confirmed && s.scannedSerial === serial);
    if (dup !== -1) return;

    list[index] = { ...slot, scannedSerial: serial, confirmed: true };
    this.slots.set(list);

    const nextEmpty = list.findIndex((s) => !s.confirmed);
    if (nextEmpty !== -1) {
      this.activeIndex.set(nextEmpty);
      // Focus ô kế tiếp để giáo vụ nhập liền mạch
      setTimeout(() => {
        const next = document.getElementById(`scan-input-${nextEmpty}`);
        next?.focus();
      }, 0);
    }
    this.cdr.detectChanges();
  }

  submitManual() {
    if (!this.canSubmit()) return;
    const manualItems = this.slots().map((s) => ({
      bookingId: s.bookingId,
      serialNumber: s.scannedSerial.trim(),
    }));
    this.context.completeWith({
      type: 'MANUAL',
      manualItems,
    });
  }

  close() {
    this.context.completeWith(null);
  }
}
