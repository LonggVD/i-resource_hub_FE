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
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { BookingService } from '../../../core/api/booking.service';
import { NotificationService } from '../../../core/api/notification';

// Dialog Components
import { RejectReasonDialogComponent } from '../reject-reason-dialog/reject-reason-dialog.component';
import { HandoverDialogComponent } from '../handover-dialog/handover-dialog.component';
import { EvidenceDialogComponent } from '../evidence-dialog/evidence-dialog.component';

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
  ],
})
export class BookingBoardComponent implements OnInit {
  // Signals for Reactive UI
  readonly pendingBookings = signal<Booking[]>([]);
  readonly approvedBookings = signal<Booking[]>([]);
  readonly borrowedBookings = signal<Booking[]>([]);
  readonly returnedBookings = signal<Booking[]>([]);
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
        console.log(bookings);
        this.pendingBookings.set(bookings.filter((b) => b.status === 'PENDING'));
        this.approvedBookings.set(bookings.filter((b) => b.status === 'APPROVED'));
        this.borrowedBookings.set(bookings.filter((b) => b.status === 'BORROWED'));
        this.returnedBookings.set(bookings.filter((b) => b.status === 'RETURNED'));
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu board:', err),
    });
  }

  drop(event: CdkDragDrop<Booking[]>): void {
    const draggedItem = event.previousContainer.data[event.previousIndex];
    const targetColumnId = event.container.id as BookingStatus;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // --- Flow 1: Kéo vào APPROVED (Duyệt nhanh) ---
      if (targetColumnId === 'APPROVED') {
        this.quickApprove(draggedItem);
        return;
      }

      // --- Flow 2: Kéo vào BORROWED (Bàn giao qua QR) ---
      if (targetColumnId === 'BORROWED') {
        this.openHandoverModal(draggedItem);
        return;
      }

      // --- Flow 3: Kéo vào RETURNED (Trả đồ + Minh chứng) ---
      if (targetColumnId === 'RETURNED') {
        this.openReturnModal(draggedItem);
        return;
      }

      // Default optimistic update for other moves if any
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      this.updateBookingStatus(draggedItem.id, targetColumnId);
    }
  }

  protected openDetailModal(booking: Booking): void {
    console.log('Mở chi tiết đơn:', booking);
  }

  // ═══════════════════════════════════════════════════════════
  //  MODAL ACTIONS (Rule: Professional Dialogs)
  // ═══════════════════════════════════════════════════════════

  protected quickApprove(booking: Booking): void {
    this.isProcessing.set(true);
    this.bookingService.processAction(booking.id, 'APPROVE').subscribe({
      next: () => {
        this.notificationService.showSuccess('Đã duyệt đơn thành công.');
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

  protected openRejectModal(booking: Booking): void {
    this.dialogService
      .open<string | null>(new PolymorpheusComponent(RejectReasonDialogComponent), {
        label: 'Lý do từ chối đơn',
        size: 's',
        dismissible: true,
      })
      .subscribe((reason) => {
        if (reason) {
          this.isProcessing.set(true);
          this.bookingService.processAction(booking.id, 'REJECT', reason).subscribe({
            next: () => {
              this.notificationService.showSuccess('Đã từ chối đơn.');
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

  protected openHandoverModal(booking: Booking): void {
    this.dialogService
      .open<string | null>(new PolymorpheusComponent(HandoverDialogComponent), {
        label: 'Bàn giao thiết bị (Quét mã QR)',
        size: 'm',
        data: booking,
        dismissible: true,
      })
      .subscribe((token) => {
        if (token) {
          this.isProcessing.set(true);
          this.bookingService.checkIn(token).subscribe({
            next: () => {
              this.notificationService.showSuccess('Bàn giao thành công. Trạng thái: ĐANG MƯỢN.');
              this.refreshBoard();
              this.isProcessing.set(false);
            },
            error: (err) => {
              this.isProcessing.set(false);
              this.notificationService.showError(
                err.error?.message || 'Token không hợp lệ hoặc hết hạn.',
              );
              this.refreshBoard();
            },
          });
        } else {
          this.refreshBoard();
        }
      });
  }

  protected openReturnModal(booking: Booking): void {
    this.dialogService
      .open<any | null>(new PolymorpheusComponent(EvidenceDialogComponent), {
        label: 'Xác nhận Trả thiết bị',
        size: 'm',
        data: { booking, type: 'CHECK_OUT' },
        dismissible: true,
      })
      .subscribe((request) => {
        if (request) {
          this.isProcessing.set(true);
          // request is EvidenceRequest with bookingId, evidenceType, imageUrl, description
          this.bookingService.checkOut(request).subscribe({
            next: () => {
              this.notificationService.showSuccess('Đã nhận lại thiết bị. Trạng thái: ĐÃ TRẢ.');
              this.refreshBoard();
              this.isProcessing.set(false);
            },
            error: (err) => {
              this.isProcessing.set(false);
              this.notificationService.showError(
                'Lỗi khi trả đồ: ' + (err.error?.message || err.message),
              );
              this.refreshBoard();
            },
          });
        } else {
          this.refreshBoard();
        }
      });
  }

  protected openReportDamageModal(booking: Booking): void {
    this.dialogService
      .open<any | null>(new PolymorpheusComponent(EvidenceDialogComponent), {
        label: 'Báo cáo sự cố thiết bị',
        size: 'm',
        data: { booking, type: 'DAMAGE' },
        dismissible: true,
      })
      .subscribe((request) => {
        if (request) {
          this.isProcessing.set(true);
          this.bookingService.addEvidence(request).subscribe({
            next: () => {
              this.notificationService.showSuccess('Đã gửi báo cáo minh chứng thành công.');
              this.refreshBoard();
              this.isProcessing.set(false);
            },
            error: (err) => {
              this.isProcessing.set(false);
              this.notificationService.showError(
                'Lỗi khi gửi báo cáo: ' + (err.error?.message || err.message),
              );
            },
          });
        }
      });
  }

  private updateBookingStatus(bookingId: string, status: BookingStatus): void {
    // Generic status update for other statuses that don't need dedicated dialogs
    if (['PENDING', 'CANCELLED'].includes(status)) {
      // Logic for simple status updates if any
      this.refreshBoard();
    }
  }
}
