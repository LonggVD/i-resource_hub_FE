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
        <h3>Bàn giao lô: {{ group.items[0].deviceName }} (x{{ group.items.length }})</h3>
        <p class="borrower-info">Người mượn: <strong>{{ group.borrowerName || 'Sinh viên' }}</strong></p>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button tuiButton appearance="secondary" size="m" class="w-full" (click)="handoverAllAuto()">
          <tui-icon icon="@tui.zap" /> Bàn giao nhanh tất cả (Auto)
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
        <button tuiButton appearance="flat" size="m" (click)="close()">Hủy</button>
        <button tuiButton appearance="primary" size="m" (click)="submitManual()" [disabled]="!canSubmitManual()">
          Hoàn tất bàn giao
        </button>
      </div>
    </div>
  `,
  styles: [`
    .handover-dialog { display: flex; flex-direction: column; gap: 1rem; max-height: 80vh; overflow-y: auto; padding-right: 10px; }
    .batch-info h3 { margin: 0; color: #1e293b; }
    .borrower-info { margin: 4px 0; font-size: 0.9rem; color: #64748b; }
    .quick-actions { padding: 10px 0; }
    .divider { display: flex; align-items: center; text-align: center; color: #94a3b8; font-size: 0.7rem; font-weight: bold; }
    .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
    .divider::before { margin-right: 1rem; } .divider::after { margin-left: 1rem; }
    .handover-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .handover-item { padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; transition: all 0.2s; }
    .handover-item.scanned { border-color: #22c55e; background: #f0fdf4; }
    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.8rem; }
    .item-index { font-weight: bold; color: #6366f1; }
    .qr-scanner-container { width: 100%; height: 200px; background: #000; border-radius: 12px; overflow: hidden; position: relative; }
    .scanner-window { position: relative; width: 100%; height: 100%; }
    ngx-scanner-qrcode { width: 100%; height: 100%; object-fit: cover; }
    .scanner-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
    .dialog-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
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
