import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { TuiDialogService, TuiLoader, TuiIcon, TuiButton } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Booking, BookingStatus, GroupedBooking } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/api/booking.service';
import { BookingBoardLiveService } from '../../../core/api/booking-board-live.service';
import { NotificationService } from '../../../core/api/notification';

// Dialog Components
import { RejectReasonDialogComponent } from '../reject-reason-dialog/reject-reason-dialog.component';
import { HandoverDialogComponent } from '../handover-dialog/handover-dialog.component';
import { ReturnDialogComponent } from '../return-dialog/return-dialog.component';
import { PenaltyDialogComponent } from '../../penalties/penalty-dialog/penalty-dialog.component';
import { BookingDetailDialogComponent } from '../booking-detail-dialog/booking-detail-dialog.component';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-booking-board',
  standalone: true,
  templateUrl: './booking-board.component.html',
  styleUrl: './booking-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TuiLoader,
    TuiIcon,
    TuiButton,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPreview,
    CdkDragPlaceholder,
    CommonModule,
    TuiBadge,
  ],
})
export class BookingBoardComponent implements OnInit, OnDestroy {
  // ── State raw ─────────────────────────────────────────
  private readonly allGroups = signal<GroupedBooking[]>([]);
  readonly isProcessing = signal(false);

  private readonly boardLive = inject(BookingBoardLiveService);
  protected readonly liveConnected = this.boardLive.connected;

  // ── Filter signals ────────────────────────────────────
  readonly searchQuery = signal('');
  readonly dateFilter = signal('');

  // ── Computed columns sau khi áp dụng filter ───────────
  // Sort FIFO theo slot datetime tăng dần: slot sớm nhất / quá hạn lâu nhất lên đầu
  readonly pendingGroups = computed(() =>
    this.sortByUrgency(
      this.applyFilter(this.allGroups().filter((g) => g.displayStatus === 'PENDING')),
      'PENDING',
    ),
  );
  readonly approvedGroups = computed(() =>
    this.sortByUrgency(
      this.applyFilter(this.allGroups().filter((g) => g.displayStatus === 'APPROVED')),
      'APPROVED',
    ),
  );
  readonly borrowedGroups = computed(() =>
    this.sortByUrgency(
      this.applyFilter(this.allGroups().filter((g) => g.displayStatus === 'BORROWED')),
      'BORROWED',
    ),
  );
  readonly returnedGroups = computed(() =>
    this.sortByUrgency(
      this.applyFilter(this.allGroups().filter((g) => g.displayStatus === 'RETURNED')),
      'RETURNED',
    ),
  );

  constructor(
    private readonly bookingService: BookingService,
    private readonly dialogService: TuiDialogService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.refreshBoard();
    // Mỗi khi BE phát tín hiệu booking đã đổi, tự refetch để không cần F5.
    // Dialog đang mở của user vẫn không bị ảnh hưởng vì ta chỉ thay allGroups().
    this.boardLive.connect(() => this.refreshBoard());
  }

  ngOnDestroy(): void {
    this.boardLive.disconnect();
  }

  refreshBoard(): void {
    this.bookingService.getKanbanBookings().subscribe({
      next: (bookings) => {
        const grouped = this.groupBookings(bookings);
        this.allGroups.set(grouped);
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu board:', err),
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  FILTERING
  // ═══════════════════════════════════════════════════════════
  private applyFilter(groups: GroupedBooking[]): GroupedBooking[] {
    const q = this.searchQuery().trim().toLowerCase();
    const date = this.dateFilter();
    if (!q && !date) return groups;

    return groups.filter((g) => {
      // search theo tên SV / mã SV / tên thiết bị
      if (q) {
        const inBorrower = (g.borrowerName || '').toLowerCase().includes(q);
        const inBorrowerId = (g.borrowerId || '').toLowerCase().includes(q);
        const inDevice = g.items.some((i) => (i.deviceName || '').toLowerCase().includes(q));
        const inSerial = g.items.some((i) => (i.serialNumber || '').toLowerCase().includes(q));
        if (!inBorrower && !inBorrowerId && !inDevice && !inSerial) return false;
      }
      // filter ngày: bookingDate khớp đúng
      if (date && g.bookingDate !== date) return false;
      return true;
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  onDateChange(value: string): void {
    this.dateFilter.set(value);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.dateFilter.set('');
  }

  hasActiveFilters = computed(() => !!this.searchQuery() || !!this.dateFilter());

  // ═══════════════════════════════════════════════════════════
  //  GROUPING (giữ nguyên logic cũ)
  // ═══════════════════════════════════════════════════════════
  private groupBookings(data: Booking[]): GroupedBooking[] {
    const map = new Map<string, GroupedBooking>();
    data.forEach((b) => {
      const key = `${b.batchToken || b.id}_${b.deviceName}`;
      if (!map.has(key)) {
        map.set(key, {
          batchToken: b.batchToken || b.id,
          bookingDate: b.bookingDate,
          slotName: b.slotName || '',
          startTime: b.startTime || '',
          endTime: b.endTime || '',
          status: b.status,
          purpose: b.purpose || '',
          borrowerName: b.borrowerName,
          borrowerId: b.borrowerId,
          userId: b.userId,
          borrowerUnitName: b.borrowerUnitName,
          expired: b.expired,
          items: [],
          displayStatus: b.status,
          hasDamage: b.hasDamage,
          isPenalized: b.isPenalized,
        });
      }
      const group = map.get(key)!;
      if (b.hasDamage) group.hasDamage = true;
      if (b.isPenalized) group.isPenalized = true;
      // Lấy giờ trả mới nhất trong batch (mỗi item có thể được trả ở thời điểm khác nhau).
      if (b.actualEndTime && (!group.actualEndTime || b.actualEndTime > group.actualEndTime)) {
        group.actualEndTime = b.actualEndTime;
      }

      group.items.push({
        id: b.id,
        deviceName: b.deviceName || 'Thiết bị không tên',
        serialNumber: b.serialNumber || 'Đang cập nhật',
        status: b.status,
        qrCodeToken: b.qrCodeToken,
        hasDamage: b.hasDamage,
        damageDescription: b.damageDescription,
      });
    });

    map.forEach((group) => {
      const statuses = group.items.map((i) => i.status);
      if (statuses.every((s) => s === 'RETURNED')) {
        group.displayStatus = 'RETURNED';
      } else if (statuses.some((s) => s === 'BORROWED')) {
        group.displayStatus = 'BORROWED';
      } else if (statuses.some((s) => s === 'APPROVED')) {
        group.displayStatus = 'APPROVED';
      } else if (statuses.some((s) => s === 'PENDING')) {
        group.displayStatus = 'PENDING';
      } else {
        group.displayStatus = statuses[0] as BookingStatus;
      }
    });

    return Array.from(map.values());
  }

  // ═══════════════════════════════════════════════════════════
  //  DRAG & DROP
  // ═══════════════════════════════════════════════════════════
  drop(event: CdkDragDrop<GroupedBooking[]>): void {
    const draggedGroup = event.previousContainer.data[event.previousIndex];
    const targetColumnId = event.container.id as BookingStatus;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      if (targetColumnId === 'APPROVED') {
        this.quickApprove(draggedGroup);
        return;
      }
      this.updateBookingStatus(draggedGroup, targetColumnId);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS HIỂN THỊ
  // ═══════════════════════════════════════════════════════════
  protected getReturnedCount(group: GroupedBooking): number {
    return group.items.filter((i) => i.status === 'RETURNED').length;
  }

  protected getReturnedProgress(group: GroupedBooking): number {
    const total = group.items.length;
    if (total === 0) return 0;
    return Math.round((this.getReturnedCount(group) / total) * 100);
  }

  /** Trả về class priority cho card: high (đỏ) / medium (vàng) / done (xám) / normal */
  protected getCardPriority(group: GroupedBooking): string {
    if (group.expired || group.hasDamage) return 'priority-high';
    if (group.isPenalized) return 'priority-medium';
    if (group.displayStatus === 'RETURNED') return 'priority-done';
    return '';
  }

  protected getBatchSizeLabel(group: GroupedBooking): string {
    return group.items.length > 1 ? `Lô ${group.items.length} thiết bị` : '';
  }

  // ═══════════════════════════════════════════════════════════
  //  AGING / URGENCY — giúp admin biết đơn nào xử lý trước
  // ═══════════════════════════════════════════════════════════

  /** Lấy datetime tham chiếu của 1 đơn theo trạng thái cột:
   *  - PENDING/APPROVED: slotStart (sắp tới slot → cần duyệt/bàn giao gấp)
   *  - BORROWED: slotEnd (sắp tới hạn trả)
   *  - RETURNED: actualEndTime nếu có (giờ trả thực tế), fallback slotEnd cho dữ liệu cũ.
   */
  private getReferenceDate(group: GroupedBooking, columnId: BookingStatus | string): Date {
    if (columnId === 'RETURNED' && group.actualEndTime) {
      return new Date(group.actualEndTime);
    }
    const useEnd = columnId === 'BORROWED' || columnId === 'RETURNED';
    const time = useEnd ? group.endTime : group.startTime;
    // bookingDate dạng "YYYY-MM-DD", time dạng "HH:mm" hoặc "HH:mm:ss"
    return new Date(`${group.bookingDate}T${time || '00:00'}:00`);
  }

  /** Số phút từ NOW đến ref (âm = đã qua, dương = còn trong tương lai) */
  private getMinutesUntil(refDate: Date): number {
    return Math.round((refDate.getTime() - Date.now()) / 60000);
  }

  /** Sort: card cần xử lý GẤP NHẤT lên đầu (slot sớm nhất / đã qua lâu nhất). */
  private sortByUrgency(
    groups: GroupedBooking[],
    columnId: BookingStatus | string,
  ): GroupedBooking[] {
    return [...groups].sort(
      (a, b) =>
        this.getReferenceDate(a, columnId).getTime() -
        this.getReferenceDate(b, columnId).getTime(),
    );
  }

  /** Aging tier: 'overdue' (đỏ, đã quá slot), 'urgent' (amber, < 60ph), 'normal' (xám) */
  protected getAgingTier(group: GroupedBooking, columnId: string): string {
    if (columnId === 'RETURNED') return 'aging-done';
    const minutes = this.getMinutesUntil(this.getReferenceDate(group, columnId));
    if (minutes < 0) return 'aging-overdue';
    if (minutes <= 60) return 'aging-urgent';
    return 'aging-normal';
  }

  /** Nhãn aging dễ đọc: "Còn 1h 30ph" / "Quá 2h 15ph" / "Đã trả 3h trước" */
  protected getAgingLabel(group: GroupedBooking, columnId: string): string {
    const minutes = this.getMinutesUntil(this.getReferenceDate(group, columnId));
    const abs = Math.abs(minutes);
    const formatted = this.formatDuration(abs);

    if (columnId === 'RETURNED') {
      return abs < 60 ? `Trả gần đây` : `Trả ${formatted} trước`;
    }
    if (minutes < 0) return `Quá hạn ${formatted}`;
    if (minutes <= 60) return `Còn ${formatted}`;
    // > 60 phút: hiển thị giờ slot cho thoáng
    return `${group.startTime || ''} · ${this.formatDateShort(group.bookingDate)}`;
  }

  /** Label tổng quát ở header cột: "Sớm nhất: HH:mm DD/MM" hoặc cảnh báo quá hạn */
  protected getColumnOldestLabel(groups: GroupedBooking[], columnId: string): string {
    if (groups.length === 0 || columnId === 'RETURNED') return '';
    const first = groups[0]; // đã sort theo urgency
    const ref = this.getReferenceDate(first, columnId);
    const minutes = this.getMinutesUntil(ref);
    if (minutes < 0) return `Quá hạn lâu nhất: ${this.formatDuration(Math.abs(minutes))}`;
    if (minutes <= 60) return `Cần xử lý sau: ${this.formatDuration(minutes)}`;
    return `Sớm nhất: ${first.startTime || ''} ${this.formatDateShort(first.bookingDate)}`;
  }

  private formatDuration(totalMinutes: number): string {
    const days = Math.floor(totalMinutes / 1440);
    if (days >= 1) return `${days} ngày`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}ph`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}ph`;
  }

  private formatDateShort(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }

  // ═══════════════════════════════════════════════════════════
  //  ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════
  protected quickApprove(group: GroupedBooking): void {
    this.isProcessing.set(true);
    const ids = group.items.map((i) => i.id);
    this.bookingService.processBulkAction(ids, 'APPROVE').subscribe({
      next: () => {
        this.notificationService.showSuccess(`Đã duyệt ${ids.length} thiết bị thành công.`);
        this.refreshBoard();
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.notificationService.showError('Lỗi phê duyệt: ' + (err.error?.message || err.message));
        this.refreshBoard();
      },
    });
  }

  protected openRejectModal(group: GroupedBooking): void {
    this.dialogService
      .open<string | null>(new PolymorpheusComponent(RejectReasonDialogComponent), {
        label: `Từ chối ${group.items.length} thiết bị`,
        size: 's',
        dismissible: true,
      })
      .subscribe((reason) => {
        if (reason) {
          this.isProcessing.set(true);
          const ids = group.items.map((i) => i.id);
          this.bookingService.processBulkAction(ids, 'REJECT', reason).subscribe({
            next: () => {
              this.notificationService.showSuccess(`Đã từ chối ${ids.length} thiết bị.`);
              this.refreshBoard();
              this.isProcessing.set(false);
            },
            error: () => {
              this.isProcessing.set(false);
              this.refreshBoard();
            },
          });
        } else {
          this.refreshBoard();
        }
      });
  }

  protected openHandoverModal(group: GroupedBooking): void {
    this.dialogService
      .open<any>(new PolymorpheusComponent(HandoverDialogComponent), {
        label: 'Bàn giao thiết bị',
        size: 'm',
        data: group,
        dismissible: true,
      })
      .subscribe((result) => {
        if (result) {
          this.isProcessing.set(true);
          // Sau khi đổi flow: dialog chỉ trả về kết quả MANUAL (quét/nhập serial cho từng máy).
          // BE checkInBulkManual sẽ rebind resource_item theo serial thực tế đã quét.
          const obs = this.bookingService.checkInBulkManual({ items: result.manualItems });

          obs.subscribe({
            next: () => {
              this.notificationService.showSuccess('Bàn giao thành công.');
              this.refreshBoard();
              this.isProcessing.set(false);
            },
            error: (err) => {
              this.isProcessing.set(false);
              this.notificationService.showError(err.error?.message || 'Lỗi bàn giao.');
              this.refreshBoard();
            },
          });
        } else {
          this.refreshBoard();
        }
      });
  }

  protected openReturnModal(group?: GroupedBooking): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(ReturnDialogComponent), {
        label: group ? 'Xác nhận Trả đồ (Chính xác)' : 'Quét vé để trả đồ',
        size: 'l',
        data: group,
        dismissible: true,
      })
      .subscribe((success) => {
        if (success) {
          this.refreshBoard();
        }
      });
  }

  protected openDetailModal(group: GroupedBooking): void {
    this.dialogService
      .open<void>(new PolymorpheusComponent(BookingDetailDialogComponent), {
        label: `Chi tiết thẻ mượn`,
        size: 'l',
        data: group,
        dismissible: true,
      })
      .subscribe();
  }

  private updateBookingStatus(_group: GroupedBooking, _status: BookingStatus): void {
    this.refreshBoard();
  }

  protected openPenaltyDialog(group: GroupedBooking): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(PenaltyDialogComponent), {
        label: 'Ghi nhận vi phạm',
        size: 'l',
        data: group,
        dismissible: true,
      })
      .subscribe((result) => {
        if (result) {
          this.refreshBoard();
        }
      });
  }
}
