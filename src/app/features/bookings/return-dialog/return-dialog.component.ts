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
import { TuiButton, TuiDialogContext, TuiIcon, TuiLoader, TuiDialogService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  NgxScannerQrcodeComponent,
  ScannerQRCodeResult,
  LOAD_WASM,
} from 'ngx-scanner-qrcode';
import { TuiBadge } from '@taiga-ui/kit';
import { BookingService } from '../../../core/api/booking.service';
import { NotificationService } from '../../../core/api/notification';
import { EvidenceDialogComponent } from '../evidence-dialog/evidence-dialog.component';

@Component({
  selector: 'app-return-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiBadge,
    NgxScannerQrcodeComponent,
  ],
  template: `
    <div class="return-dialog">
      <!-- Step 1: Scan Ticket (Empty State) -->
      <div class="step-view" *ngIf="!batchLoaded()">
        <div class="header-minimal">
          <div class="icon-circle">
            <tui-icon icon="@tui.qr-code"></tui-icon>
          </div>
          <h2 class="header-title">Quét mã vé sinh viên</h2>
          <p class="header-desc">Sử dụng camera để định danh lô hàng cần trả</p>
        </div>
      </div>

      <!-- Step 2: Verification View -->
      <div class="step-view" *ngIf="batchLoaded()">
        <div class="header-minimal">
          <div class="borrower-badge">
            <tui-icon icon="@tui.user"></tui-icon>
            <span class="borrower-name">{{ borrowerName() }}</span>
          </div>
          <p class="batch-time">
            {{ bookingDate() | date: 'dd/MM/yyyy' }} &middot; {{ slotName() }}
          </p>
        </div>

        <div class="verification-area">
          <div class="checklist-column">
            <div class="checklist-header">
              <span>Danh sách thiết bị ({{ items().length }})</span>
              <tui-badge [appearance]="isAllChecked() ? 'success' : 'warning'" size="m">
                Đã khớp: {{ checkedCount() }}/{{ items().length }}
              </tui-badge>
            </div>

            <div class="checklist-scroll">
              <div *ngFor="let item of items(); let idx = index" class="modern-check-card"
                [class.is-checked]="item.checked"
                [class.already-returned]="item.status === 'RETURNED'"
                [class.is-damaged]="item.damageInfo">
                <div class="card-indicator"></div>
                <div class="card-main">
                  <div class="item-name">
                    <span class="item-name-text">{{ item.deviceName }}</span>
                    <span class="status-tag" *ngIf="item.status === 'RETURNED'">(Đã trả trước đó)</span>
                    <tui-badge *ngIf="item.damageInfo" appearance="destructive" size="s">HỎNG</tui-badge>
                  </div>
                  <div class="item-serial">S/N: {{ item.serialNumber }}</div>
                </div>

                <div class="card-actions-inline" *ngIf="item.status !== 'RETURNED'">
                   <button
                    tuiButton
                    appearance="flat"
                    size="s"
                    class="damage-btn"
                    [class.active]="item.damageInfo"
                    (click)="reportDamage(idx); $event.stopPropagation()"
                    title="Báo hỏng thiết bị này">
                    <tui-icon icon="@tui.triangle-alert"></tui-icon>
                  </button>
                </div>

                <div class="card-status-icon" *ngIf="!item.damageInfo || item.status === 'RETURNED'">
                  <tui-icon [icon]="item.checked ? '@tui.circle-check' : '@tui.circle-dashed'"></tui-icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scanner Section -->
      <div class="scanner-section">
        <div class="scanner-frame">
          <ngx-scanner-qrcode #scannerRef="scanner" (event)="onScannerEvent($event)"></ngx-scanner-qrcode>
          <div class="scan-line" *ngIf="isScannerStarted()"></div>
          <div class="scanner-overlay" *ngIf="!isScannerStarted()">
            <tui-icon icon="@tui.camera" class="overlay-icon"></tui-icon>
            <p>{{ batchLoaded() ? 'Quét QR trên thiết bị' : 'Quét vé trên điện thoại' }}</p>
          </div>
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
        </div>
        <div class="scanner-actions">
          <button tuiButton [appearance]="isScannerStarted() ? 'secondary-destructive' : 'secondary'"
            size="s" (click)="toggleScanner()" class="toggle-btn">
            <tui-icon [icon]="isScannerStarted() ? '@tui.video-off' : '@tui.video'"></tui-icon>
            {{ isScannerStarted() ? 'Tắt Camera' : 'Mở Camera' }}
          </button>
        </div>
      </div>

      <div class="dialog-footer">
        <button tuiButton appearance="secondary" size="m" (click)="close()">Hủy</button>
        <tui-loader [showLoader]="isSubmitting()">
          <button *ngIf="batchLoaded()" tuiButton [appearance]="isAllChecked() ? 'primary' : 'secondary'"
            size="m" (click)="submitReturn()" [disabled]="newCheckedCount() === 0 || isSubmitting()">
            {{ isAllChecked() ? 'Hoàn tất trả đủ' : (newCheckedCount() > 0 ? 'Xác nhận trả thêm (' + newCheckedCount() + ')' : 'Đang chờ quét...') }}
          </button>
        </tui-loader>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; box-sizing: border-box; width: 100%; }
    :host *, :host *::before, :host *::after { box-sizing: border-box; }

    .return-dialog {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      width: 100%;
      min-width: 0;
      padding: var(--space-2);
    }
    .step-view { min-width: 0; }
    .header-minimal {
      text-align: center;
      margin-bottom: var(--space-2);
      min-width: 0;
    }
    .header-title {
      margin: var(--space-3) 0 var(--space-1);
      color: var(--color-text);
      font-size: var(--font-size-xl);
      font-weight: 700;
    }
    .header-desc {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }
    .icon-circle {
      width: 64px;
      height: 64px;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      font-size: var(--font-size-2xl);
    }
    .borrower-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--color-primary);
      color: #ffffff;
      padding: var(--space-1) var(--space-4);
      border-radius: var(--radius-full);
      font-weight: 600;
      font-size: var(--font-size-base);
      margin-bottom: var(--space-2);
      max-width: 100%;
      min-width: 0;
    }
    .borrower-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .batch-time {
      margin: 0;
      font-weight: 500;
      color: var(--color-text-subtle);
      font-size: var(--font-size-sm);
    }
    .verification-area { min-width: 0; }
    .checklist-column {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      min-width: 0;
    }
    .checklist-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
      font-weight: 700;
      color: var(--color-text-strong);
      font-size: var(--font-size-sm);
      padding: 0 var(--space-1);
      flex-wrap: wrap;
      min-width: 0;
    }
    .checklist-scroll {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--space-2);
      max-height: 220px;
      overflow-y: auto;
      padding: var(--space-1);
      min-width: 0;
    }
    .modern-check-card {
      display: flex;
      align-items: center;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      position: relative;
      transition: border-color 0.15s ease, background 0.15s ease;
      min-width: 0;
    }
    .modern-check-card.is-checked {
      border-color: var(--color-success);
      background: var(--color-success-soft);
    }
    .card-indicator {
      width: 4px;
      height: 24px;
      background: var(--color-border-strong);
      border-radius: var(--radius-sm);
      margin-right: var(--space-3);
      transition: background 0.15s ease;
      flex-shrink: 0;
    }
    .is-checked .card-indicator { background: var(--color-success); }
    .card-main {
      flex: 1;
      min-width: 0;
    }
    .item-name {
      font-weight: 700;
      color: var(--color-text);
      font-size: var(--font-size-sm);
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
      min-width: 0;
    }
    .item-name-text {
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
      min-width: 0;
    }
    .status-tag {
      font-size: var(--font-size-xs);
      color: var(--color-success);
      font-weight: 500;
    }
    .item-serial {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .card-status-icon {
      font-size: var(--font-size-lg);
      color: var(--color-text-faint);
      flex-shrink: 0;
    }
    .is-checked .card-status-icon { color: var(--color-success); }
    .already-returned {
      opacity: 0.7;
      background: var(--color-surface-alt) !important;
    }
    .is-damaged {
      border-color: var(--color-danger) !important;
      background: var(--color-danger-soft) !important;
    }
    .is-damaged .card-indicator { background: var(--color-danger) !important; }
    .card-actions-inline {
      margin-right: var(--space-2);
      flex-shrink: 0;
    }
    .damage-btn {
      color: var(--color-text-subtle) !important;
      border-radius: var(--radius-md) !important;
    }
    .damage-btn:hover {
      background: var(--color-danger-soft) !important;
      color: var(--color-danger) !important;
    }
    .damage-btn.active {
      color: var(--color-danger) !important;
      background: var(--color-danger-soft) !important;
    }
    .scanner-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }
    .scanner-frame {
      position: relative;
      width: 100%;
      height: 240px;
      background: var(--color-text);
      border-radius: var(--radius-xl);
      overflow: hidden;
      border: 2px solid var(--color-border-strong);
      box-shadow: var(--shadow-md);
      min-width: 0;
    }
    ngx-scanner-qrcode {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.9;
    }
    .scan-line {
      position: absolute;
      width: 100%;
      height: 2px;
      background: var(--color-success);
      top: 0;
      z-index: 10;
      animation: scan 2s linear infinite;
    }
    @keyframes scan {
      0% { top: 0; }
      100% { top: 100%; }
    }
    .scanner-overlay {
      position: absolute;
      inset: 0;
      z-index: 5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      background: rgba(17, 24, 39, 0.7);
      color: var(--color-text-faint);
      text-align: center;
    }
    .overlay-icon {
      font-size: var(--font-size-2xl);
      margin-bottom: var(--space-2);
    }
    .corner {
      position: absolute;
      width: 28px;
      height: 28px;
      border: 2px solid var(--color-primary);
      z-index: 15;
    }
    .top-left {
      top: 16px;
      left: 16px;
      border-right: 0;
      border-bottom: 0;
      border-top-left-radius: var(--radius-md);
    }
    .top-right {
      top: 16px;
      right: 16px;
      border-left: 0;
      border-bottom: 0;
      border-top-right-radius: var(--radius-md);
    }
    .bottom-left {
      bottom: 16px;
      left: 16px;
      border-right: 0;
      border-top: 0;
      border-bottom-left-radius: var(--radius-md);
    }
    .bottom-right {
      bottom: 16px;
      right: 16px;
      border-left: 0;
      border-top: 0;
      border-bottom-right-radius: var(--radius-md);
    }
    .scanner-actions {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .toggle-btn {
      border-radius: var(--radius-full) !important;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-2);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      flex-wrap: wrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnDialogComponent implements OnInit, OnDestroy {
  @ViewChild('scannerRef') scanner!: NgxScannerQrcodeComponent;

  private readonly context = inject<TuiDialogContext<boolean, any>>(POLYMORPHEUS_CONTEXT);
  private readonly bookingService = inject(BookingService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly batchLoaded = signal(false);
  readonly isSubmitting = signal(false);
  readonly isScannerStarted = signal(false);
  readonly scannerReady = signal(false);

  readonly items = signal<any[]>([]);
  readonly borrowerName = signal('');
  readonly bookingDate = signal<any>(null);
  readonly slotName = signal('');

  constructor() {
    LOAD_WASM('assets/wasm/ngx-scanner-qrcode.wasm').subscribe(() => {
      this.scannerReady.set(true);
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    if (this.context.data?.batchToken || this.context.data?.items) {
      this.setupBatch(this.context.data.items || [this.context.data]);
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private setupBatch(bookings: any[]) {
    this.items.set(bookings.map(b => ({
      id: b.id,
      deviceName: b.deviceName,
      serialNumber: b.serialNumber,
      qrCodeToken: b.qrCodeToken,
      status: b.status,
      checked: b.status === 'RETURNED',
      damageInfo: null
    })));
    this.borrowerName.set(bookings[0].borrowerName || 'Sinh viên');
    this.bookingDate.set(bookings[0].bookingDate);
    this.slotName.set(bookings[0].slotName);
    this.batchLoaded.set(true);
    this.cdr.detectChanges();
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
      const scannedValue = results[0].value;
      if (!this.batchLoaded()) {
        this.loadBatchByToken(scannedValue);
      } else {
        this.verifyItem(scannedValue);
      }
    }
  }

  private loadBatchByToken(token: string) {
    this.bookingService.getBatchByQrToken(token).subscribe({
      next: (bookings) => {
        if (bookings.length > 0) {
          this.setupBatch(bookings);
          this.notificationService.showSuccess('Đã định danh thành công đơn mượn.');
        } else {
          this.notificationService.showError('Không tìm thấy đơn mượn tương ứng.');
        }
      },
      error: () => this.notificationService.showError('Mã QR không hợp lệ hoặc đã hết hạn.')
    });
  }

  private verifyItem(scannedValue: string) {
    const currentItems = this.items();
    const index = currentItems.findIndex(item =>
      (item.qrCodeToken === scannedValue || item.serialNumber === scannedValue) && !item.checked
    );

    if (index !== -1) {
      currentItems[index].checked = true;
      this.items.set([...currentItems]);
      this.notificationService.showInfo(`Đã khớp thiết bị: ${currentItems[index].deviceName}`);
      this.cdr.detectChanges();
    }
  }

  checkedCount() {
    return this.items().filter(i => i.checked).length;
  }

  newCheckedCount() {
    return this.items().filter(i => i.checked && i.status !== 'RETURNED').length;
  }

  isAllChecked() {
    return this.items().length > 0 && this.checkedCount() === this.items().length;
  }

  reportDamage(index: number) {
    const item = this.items()[index];
    this.dialogService.open<any>(new PolymorpheusComponent(EvidenceDialogComponent), {
      label: `Báo hỏng: ${item.deviceName}`,
      size: 'm',
      data: {
        booking: { id: item.id, deviceName: item.deviceName, borrowerName: this.borrowerName() },
        type: 'DAMAGE'
      }
    }).subscribe(result => {
      if (result) {
        const currentItems = this.items();
        currentItems[index].damageInfo = result;
        currentItems[index].checked = true;
        this.items.set([...currentItems]);
        this.cdr.detectChanges();
      }
    });
  }

  submitReturn() {
    const currentItems = this.items();
    const idsToReturn = currentItems
      .filter(i => i.checked && i.status !== 'RETURNED')
      .map(i => i.id);

    if (idsToReturn.length === 0) return;

    const damages = currentItems
      .filter(i => i.damageInfo)
      .map(i => ({
        bookingId: i.id,
        imageUrl: i.damageInfo.imageUrl,
        description: i.damageInfo.description
      }));

    const request = {
      bookingIds: idsToReturn,
      damages: damages
    };

    this.isSubmitting.set(true);
    this.bookingService.checkOutBulk(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.showSuccess('Đã xác nhận nhận lại thiết bị.');
        this.context.completeWith(true);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notificationService.showError('Có lỗi xảy ra khi xác nhận trả đồ.');
      }
    });
  }

  close() {
    this.context.completeWith(false);
  }
}
