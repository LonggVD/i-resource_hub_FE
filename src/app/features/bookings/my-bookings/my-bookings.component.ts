import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiIcon, TuiLoader, TuiTitle, TuiDialogService } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { BookingService } from '../../../core/api/booking.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { NotificationService } from '../../../core/api/notification';
import { QRCodeModule } from 'angularx-qrcode';
import { CancelReasonDialogComponent } from '../cancel-reason-dialog/cancel-reason-dialog.component';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, TuiLoader, TuiButton, TuiIcon, TuiBadge, QRCodeModule],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(TuiDialogService);

  readonly isLoading = signal(false);
  readonly bookings = signal<Booking[]>([]);

  ngOnInit() {
    this.loadMyBookings();
  }

  loadMyBookings() {
    this.isLoading.set(true);
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('Không thể tải danh sách đơn mượn của bạn.');
      },
    });
  }

  // Rule 1: Dialog nhập lý do hủy
  onCancel(booking: Booking) {
    this.dialogService
      .open<string>(
        'Vui lòng nhập lý do hủy đơn mượn này:',
        {
          label: 'Xác nhận hủy đơn',
          size: 's',
          data: '',
        } as any, // Simplified for now, using a prompt-like approach
      )
      .subscribe({
        next: (reason) => {
          if (reason) {
            this.executeCancel(booking.id, reason);
          }
        },
      });
  }

  // --- Rule 1: Custom Dialog thay thế window.prompt ---
  showCancelDialog(booking: Booking) {
    this.dialogService
      .open<string | null>(new PolymorpheusComponent(CancelReasonDialogComponent), {
        label: 'Lý do hủy đơn mượn',
        size: 's',
        dismissible: true,
      })
      .subscribe({
        next: (reason) => {
          if (reason) {
            this.executeCancel(booking.id, reason);
          }
        },
      });
  }

  private executeCancel(id: string, reason: string) {
    this.isLoading.set(true);
    this.bookingService.cancelBooking(id, reason).subscribe({
      next: () => {
        this.notificationService.showSuccess('Đã hủy đơn mượn thành công.');
        this.loadMyBookings();
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorMsg = err.error?.message || err.error || 'Lỗi khi hủy đơn.';
        this.notificationService.showError(errorMsg);
      },
    });
  }

  // Rule 4: Render mã vạch điện tử (Ticket)
  showTicket(booking: Booking, template: any) {
    this.dialogService
      .open(template, {
        label: 'Vé mượn thiết bị điện tử',
        size: 'm',
        data: booking,
      })
      .subscribe();
  }

  getStatusAppearance(status: BookingStatus): string {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'BORROWED':
        return 'primary';
      case 'RETURNED':
        return 'secondary';
      case 'REJECTED':
        return 'destructive';
      case 'CANCELLED':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  getStatusLabel(status: BookingStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Đang chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt (Sẵn sàng)';
      case 'BORROWED':
        return 'Đang mượn';
      case 'RETURNED':
        return 'Đã trả đồ';
      case 'REJECTED':
        return 'Bị từ chối';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }
}
