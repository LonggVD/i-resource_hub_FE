import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TuiDialogService, TuiLoader, TuiIcon } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { Booking, BookingStatus, GroupedBooking } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/api/booking.service';
import { NotificationService } from '../../../core/api/notification';

// Dialog Components
import { RejectReasonDialogComponent } from '../reject-reason-dialog/reject-reason-dialog.component';
import { HandoverDialogComponent } from '../handover-dialog/handover-dialog.component';
import { EvidenceDialogComponent } from '../evidence-dialog/evidence-dialog.component';
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
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPreview,
    CdkDragPlaceholder,
    CommonModule,
    TuiBadge,
  ],
})
export class BookingBoardComponent implements OnInit {
  // Signals for Grouped View
  readonly pendingGroups = signal<GroupedBooking[]>([]);
  readonly approvedGroups = signal<GroupedBooking[]>([]);
  readonly borrowedGroups = signal<GroupedBooking[]>([]);
  readonly returnedGroups = signal<GroupedBooking[]>([]);
  readonly isProcessing = signal(false);

  constructor(
    private readonly bookingService: BookingService,
    private readonly dialogService: TuiDialogService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.refreshBoard();
  }

  refreshBoard(): void {
    this.bookingService.getKanbanBookings().subscribe({
      next: (bookings) => {
        const grouped = this.groupBookings(bookings);
        this.pendingGroups.set(grouped.filter((g) => g.displayStatus === 'PENDING'));
        this.approvedGroups.set(grouped.filter((g) => g.displayStatus === 'APPROVED'));
        this.borrowedGroups.set(grouped.filter((g) => g.displayStatus === 'BORROWED'));
        this.returnedGroups.set(grouped.filter((g) => g.displayStatus === 'RETURNED'));
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu board:', err),
    });
  }

  private groupBookings(data: Booking[]): GroupedBooking[] {
    const map = new Map<string, GroupedBooking>();
    data.forEach((b) => {
      const key = `${b.batchToken || b.id}_${b.deviceName}`; // Group by batch and device type
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

    // Tính toán lại displayStatus chính xác cho cả lô
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
      // ... (Các flow khác tương tự)
      this.updateBookingStatus(draggedGroup, targetColumnId);
    }
  }

  protected getReturnedCount(group: GroupedBooking): number {
    return group.items.filter((i) => i.status === 'RETURNED').length;
  }

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
          this.refreshBoard(); // Reset UI state if cancelled
        }
      });
  }

  protected openHandoverModal(group: GroupedBooking): void {
    this.dialogService
      .open<any>(new PolymorpheusComponent(HandoverDialogComponent), {
        label: 'Bàn giao thiết bị (Hybrid)',
        size: 'm',
        data: group,
        dismissible: true,
      })
      .subscribe((result) => {
        if (result) {
          this.isProcessing.set(true);
          const obs =
            result.type === 'AUTO'
              ? this.bookingService.checkInBulkAuto(result.bookingIds)
              : this.bookingService.checkInBulkManual({ items: result.manualItems });

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
        size: 'm',
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
        size: 'm',
        data: group,
        dismissible: true,
      })
      .subscribe();
  }

  private updateBookingStatus(group: GroupedBooking, status: BookingStatus): void {
    this.refreshBoard();
  }

  public getBatchProgress(group: GroupedBooking): { text: string; isFull: boolean } {
    const returned = this.getReturnedCount(group);
    const total = group.items.length;
    return {
      text: returned > 0 ? `Đã trả: ${returned}/${total}` : `Số lượng: ${total}`,
      isFull: returned === total,
    };
  }

  protected openPenaltyDialog(group: GroupedBooking): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(PenaltyDialogComponent), {
        label: 'Ghi nhận vi phạm',
        size: 'm',
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
