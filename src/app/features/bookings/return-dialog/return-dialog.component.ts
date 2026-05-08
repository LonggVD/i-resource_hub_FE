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
    <div class="return-dialog-premium">
      <!-- Step 1: Scan Ticket (Empty State) -->
      <div class="step-view" *ngIf="!batchLoaded()">
        <div class="header-minimal">
          <div class="icon-circle">
            <tui-icon icon="@tui.qr-code"></tui-icon>
          </div>
          <h2>Quét mã vé sinh viên</h2>
          <p>Sử dụng camera để định danh lô hàng cần trả</p>
        </div>
      </div>

      <!-- Step 2: Verification View -->
      <div class="step-view" *ngIf="batchLoaded()">
        <div class="header-minimal">
          <div class="borrower-badge">
            <tui-icon icon="@tui.user"></tui-icon>
            {{ borrowerName() }}
          </div>
          <p class="batch-time">
            {{ bookingDate() | date: 'dd/MM/yyyy' }} • {{ slotName() }}
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
                    {{ item.deviceName }}
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
        <button tuiButton appearance="flat" size="m" (click)="close()">Hủy</button>
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
    :host { display: block; width: 100%; }
    .return-dialog-premium { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; min-width: 500px; padding: 0.5rem; }
    .header-minimal { text-align: center; margin-bottom: 0.5rem; }
    .header-minimal h2 { margin: 12px 0 4px; color: #1e293b; font-size: 1.5rem; font-weight: 800; }
    .header-minimal p { color: #64748b; font-size: 0.9rem; }
    .icon-circle { width: 64px; height: 64px; background: #eef2ff; color: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 32px; }
    .borrower-badge { display: inline-flex; align-items: center; gap: 8px; background: #6366f1; color: white; padding: 6px 16px; border-radius: 100px; font-weight: 600; font-size: 0.95rem; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
    .batch-time { font-weight: 500; color: #94a3b8; font-size: 0.85rem; }
    .checklist-column { display: flex; flex-direction: column; gap: 1rem; }
    .checklist-header { display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: #475569; font-size: 0.9rem; padding: 0 4px; }
    .checklist-scroll { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 220px; overflow-y: auto; padding: 4px; }
    .modern-check-card { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .modern-check-card.is-checked { border-color: #22c55e; background: #f0fdf4; transform: scale(0.98); }
    .card-indicator { width: 4px; height: 24px; background: #cbd5e1; border-radius: 2px; margin-right: 12px; transition: background 0.3s; }
    .is-checked .card-indicator { background: #22c55e; }
    .card-main { flex: 1; }
    .item-name { font-weight: 700; color: #1e293b; font-size: 0.85rem; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
    .status-tag { font-size: 0.7rem; color: #22c55e; font-weight: 500; }
    .item-serial { font-size: 0.75rem; color: #64748b; font-family: monospace; }
    .card-status-icon { font-size: 20px; color: #cbd5e1; }
    .is-checked .card-status-icon { color: #22c55e; }
    .already-returned { opacity: 0.7; background: #f8fafc !important; }
    .is-damaged { border-color: #ef4444 !important; background: #fef2f2 !important; }
    .is-damaged .card-indicator { background: #ef4444 !important; }
    .card-actions-inline { margin-right: 8px; }
    .damage-btn { color: #94a3b8 !important; border-radius: 8px !important; }
    .damage-btn:hover { background: #fee2e2 !important; color: #ef4444 !important; }
    .damage-btn.active { color: #ef4444 !important; background: #fee2e2 !important; }
    .scanner-section { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .scanner-frame { position: relative; width: 100%; height: 240px; background: #0f172a; border-radius: 20px; overflow: hidden; border: 4px solid #1e293b; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); }
    ngx-scanner-qrcode { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; }
    .scan-line { position: absolute; width: 100%; height: 2px; background: rgba(34, 197, 94, 0.6); box-shadow: 0 0 15px #22c55e; top: 0; z-index: 10; animation: scan 2s linear infinite; }
    @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
    .scanner-overlay { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.7); color: #94a3b8; text-align: center; }
    .overlay-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
    .corner { position: absolute; width: 30px; height: 30px; border: 3px solid #6366f1; z-index: 15; }
    .top-left { top: 20px; left: 20px; border-right: 0; border-bottom: 0; border-top-left-radius: 8px; }
    .top-right { top: 20px; right: 20px; border-left: 0; border-bottom: 0; border-top-right-radius: 8px; }
    .bottom-left { bottom: 20px; left: 20px; border-right: 0; border-top: 0; border-bottom-left-radius: 8px; }
    .bottom-right { bottom: 20px; right: 20px; border-left: 0; border-top: 0; border-bottom-right-radius: 8px; }
    .scanner-actions { width: 100%; display: flex; justify-content: center; }
    .toggle-btn { border-radius: 100px !important; }
    .dialog-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; }
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
