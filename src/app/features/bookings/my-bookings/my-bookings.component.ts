import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
// Force rebuild to pick up interface changes
import { CommonModule } from '@angular/common';
import { TuiButton, TuiIcon, TuiLoader, TuiTitle, TuiDialogService } from '@taiga-ui/core';
import { TuiBadge, TuiPagination } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { BookingService } from '../../../core/api/booking.service';
import { Booking, BookingStatus, GroupedBooking } from '../../../core/models/booking.model';
import { NotificationService } from '../../../core/api/notification';
import { IrhImage } from '../../../shared/components/irh-image/irh-image.component';
import { CancelReasonDialogComponent } from '../cancel-reason-dialog/cancel-reason-dialog.component';
// Dùng API tạo data URL từ thư viện qrcode (peer của angularx-qrcode) để hiển thị QR qua <irh-image>
import { toDataURL as qrToDataURL } from 'qrcode';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, TuiLoader, TuiButton, TuiIcon, TuiBadge, IrhImage, TuiPagination],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(TuiDialogService);

  readonly isLoading = signal(false);
  readonly bookings = signal<GroupedBooking[]>([]);
  /** Data URL (PNG base64) cho mã QR lô đang xem — bơm vào <irh-image>. */
  readonly batchQrDataUrl = signal<string>('');

  // Pagination & Compact UI
  readonly size = 5;
  page = 0;
  expandedGroups = new Set<string>();

  get pagedBookings(): GroupedBooking[] {
    const start = this.page * this.size;
    return this.bookings().slice(start, start + this.size);
  }

  get totalPages(): number {
    return Math.ceil(this.bookings().length / this.size);
  }

  toggleGroup(batchToken: string): void {
    if (this.expandedGroups.has(batchToken)) {
      this.expandedGroups.delete(batchToken);
    } else {
      this.expandedGroups.add(batchToken);
    }
  }

  isExpanded(batchToken: string): boolean {
    return this.expandedGroups.has(batchToken);
  }

  onPageChange(index: number): void {
    this.page = index;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  printTicket(): void {
    // Chỉ đơn giản là gọi lệnh in của trình duyệt. 
    // Chúng ta sẽ dùng CSS @media print để ẩn các phần thừa.
    window.print();
  }

  ngOnInit() {
    this.loadMyBookings();
  }

  loadMyBookings() {
    this.isLoading.set(true);
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        const groups = this.groupBookings(data);
        this.bookings.set(groups);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('Không thể tải danh sách đơn mượn của bạn.');
      },
    });
  }

  private groupBookings(data: Booking[]): GroupedBooking[] {
    const map = new Map<string, GroupedBooking>();

    data.forEach((b) => {
      const token = b.batchToken || b.id;
      if (!map.has(token)) {
        map.set(token, {
          batchToken: token,
          bookingDate: b.bookingDate,
          slotName: b.slotName || '',
          startTime: b.startTime || '',
          endTime: b.endTime || '',
          status: b.status,
          purpose: b.purpose || '',
          items: [],
          unitGroups: [],
          displayStatus: b.status,
        });
      }

      const group = map.get(token)!;
      group.items.push({
        id: b.id,
        deviceName: b.deviceName || 'Thiết bị không tên',
        serialNumber: b.serialNumber || 'Đang cập nhật',
        status: b.status,
        qrCodeToken: b.qrCodeToken,
        ownerUnitName: b.ownerUnitName,
        hasDamage: b.hasDamage,
        damageDescription: b.damageDescription,
        resolution: b.resolution,
        isResolved: b.isResolved,
        evidenceImageUrl: b.evidenceImageUrl
      });

      if (b.hasDamage) group.hasDamage = true;
    });

    // Sau khi gom hết items, ta thực hiện phân nhóm unitGroups
    map.forEach(group => {
      const unitMap = new Map<string, any>();
      group.items.forEach(item => {
        const uName = item.ownerUnitName || 'Khoa/Đơn vị';
        if (!unitMap.has(uName)) {
          unitMap.set(uName, {
            unitName: uName,
            status: item.status,
            items: []
          });
        }
        const uGroup = unitMap.get(uName);
        uGroup.items.push(item);
        
        // Cập nhật trạng thái của unit group: Nếu có 1 cái PENDING thì coi như PENDING
        if (item.status === 'PENDING') uGroup.status = 'PENDING';
      });
      group.unitGroups = Array.from(unitMap.values());
    });

    return Array.from(map.values());
  }

  hasDamage(item: any): boolean {
    return !!item.hasDamage;
  }

  getEvidenceUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('assets/')) return url;
    
    // Nếu url bắt đầu bằng /api/ -> trỏ về Backend server (port 2811)
    if (url.startsWith('/api/')) {
      return `http://localhost:2811${url}`;
    }
    
    // Fallback cho trường hợp chỉ có tên file
    return `/assets/images/damaged/${url}`;
  }

  viewIssue(item: any, content: any): void {
    this.dialogService.open(content, {
      label: `Chi tiết sự cố: ${item.serialNumber}`,
      size: 'm',
      data: item,
    }).subscribe();
  }

  viewFullImage(url: string): void {
    window.open(url, '_blank');
  }

  onCancelUnit(unitGroup: any, fullGroup: GroupedBooking) {
    this.dialogService
      .open<string | null>(new PolymorpheusComponent(CancelReasonDialogComponent), {
        label: `Hủy các món thuộc ${unitGroup.unitName}`,
        size: 's',
        dismissible: true,
      })
      .subscribe((reason) => {
        if (reason) {
          const ids = unitGroup.items.filter((i: any) => i.status === 'PENDING').map((i: any) => i.id);
          this.executeBulkCancel(ids, reason);
        }
      });
  }

  onCancelAll(group: GroupedBooking) {
    this.dialogService
      .open<string | null>(new PolymorpheusComponent(CancelReasonDialogComponent), {
        label: 'Hủy toàn bộ đơn mượn này',
        size: 's',
        dismissible: true,
      })
      .subscribe((reason) => {
        if (reason) {
          const ids = group.items.filter(i => i.status === 'PENDING').map(i => i.id);
          this.executeBulkCancel(ids, reason);
        }
      });
  }

  private executeBulkCancel(ids: string[], reason: string) {
    if (ids.length === 0) {
      this.notificationService.showInfo('Không có đơn mượn nào ở trạng thái Chờ duyệt để hủy.');
      return;
    }

    this.isLoading.set(true);
    let completed = 0;
    let hasError = false;

    ids.forEach(id => {
      this.bookingService.cancelBooking(id, reason).subscribe({
        next: () => {
          completed++;
          if (completed === ids.length) {
            this.notificationService.showSuccess(hasError ? 'Đã hủy một số đơn mượn.' : 'Đã hủy đơn mượn thành công.');
            this.loadMyBookings();
          }
        },
        error: () => {
          completed++;
          hasError = true;
          if (completed === ids.length) {
            this.notificationService.showError('Có lỗi xảy ra khi hủy một số đơn.');
            this.loadMyBookings();
          }
        }
      });
    });
  }

  // Rule 4: Render mã vạch điện tử (Ticket)
  showTicket(group: GroupedBooking, template: any) {
    // Sinh sẵn data URL cho mã QR lô trước khi mở dialog
    this.batchQrDataUrl.set('');
    if (group.batchToken) {
      qrToDataURL(group.batchToken, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 280,
      })
        .then((url: string) => this.batchQrDataUrl.set(url))
        .catch(() => this.batchQrDataUrl.set(''));
    }

    this.dialogService
      .open(template, {
        label: 'Vé mượn thiết bị điện tử',
        size: 'l',
        data: group, // Gửi cả group vào template
      })
      .subscribe({
        complete: () => this.batchQrDataUrl.set(''),
      });
  }

  isPending = (item: any) => item.status === 'PENDING';
  hasApproved = (item: any) => item.status === 'APPROVED' || item.status === 'BORROWED';

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
