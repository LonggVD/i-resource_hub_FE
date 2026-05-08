import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
  TuiDialogService,
  TuiDialogContext,
} from '@taiga-ui/core';
import { TuiCheckbox, TuiBadge } from '@taiga-ui/kit';
import { PolymorpheusContent } from '@taiga-ui/polymorpheus';
import { CartService, CartItem } from '../../core/service/cart.service';
import { BookingService } from '../../core/api/booking.service';
import { NotificationService } from '../../core/api/notification';
import { TimeSlot } from '../../core/models/booking.model';
import { IrhSelect } from '../../shared/components/irh-select/irh-select.component';
import { IrhImage } from '../../shared/components/irh-image/irh-image.component';
import { FormsModule } from '@angular/forms';
import { TuiDay } from '@taiga-ui/cdk';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    IrhSelect,
    FormsModule,
    TuiCheckbox,
    TuiBadge,
    IrhImage,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css',
})
export class CartPageComponent implements OnInit {
  private cartService = inject(CartService);
  private bookingService = inject(BookingService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private readonly dialogs = inject(TuiDialogService);

  readonly items = this.cartService.items;
  readonly cartCount = this.cartService.count;
  readonly selectedItemIds = this.cartService.selectedItemIds;
  readonly totalSelectedQuantity = this.cartService.totalSelectedQuantity;

  readonly selectedItemsList = computed(() => {
    const selectedIds = this.selectedItemIds();
    return this.items().filter((item) => selectedIds.has(item.id));
  });

  readonly timeSlots = signal<TimeSlot[]>([]);
  readonly isSubmitting = signal(false);

  // Lưu cấu hình mượn cho từng item trong giỏ
  // Map<cartItemId, {date: TuiDay, slotId: string}>
  readonly itemConfigs = new Map<string, { date: string; slotId: string }>();

  ngOnInit() {
    this.loadTimeSlots();
  }

  loadTimeSlots() {
    this.bookingService.getTimeSlots().subscribe((slots) => this.timeSlots.set(slots));
  }

  updateItemQty(item: CartItem, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty >= 1) {
      this.cartService.addToCart(item.resource, delta);
    }
  }

  removeItem(id: string) {
    this.cartService.removeFromCart(id);
  }

  getSlotOptions(): any[] {
    return this.timeSlots().map((s) => ({
      label: `${s.slotName} (${s.startTime.substring(0, 5)}-${s.endTime.substring(0, 5)})`,
      value: s.id,
    }));
  }
  toggleItemSelection(id: string) {
    this.cartService.toggleSelection(id);
  }

  onClearCart(content: PolymorpheusContent<TuiDialogContext>) {
    this.dialogs
      .open(content, {
        label: 'Xác nhận xóa giỏ hàng',
        size: 'm',
        dismissible: true,
      })
      .subscribe();
  }

  confirmClear(observer: any) {
    this.cartService.clearCart();
    observer.complete();
    this.notificationService.showSuccess('Đã dọn dẹp giỏ hàng thành công!');
  }

  onCheckout() {
    const selectedIds = this.selectedItemIds();
    const cartItems = this.items().filter((i) => selectedIds.has(i.id));

    if (cartItems.length === 0) {
      this.notificationService.showError('Vui lòng chọn ít nhất một thiết bị để mượn!');
      return;
    }

    // Kiểm tra xem tất cả các item đã chọn đã được điền ngày và slot chưa
    const payload = cartItems.map((item) => {
      return {
        cartItemId: item.id, // Để backend/frontend biết cần xóa item nào sau khi xong
        resourceTemplateId: item.resource.id,
        quantity: item.quantity,
        bookingDate: item.bookingDate
          ? `${item.bookingDate.year}-${String(item.bookingDate.month + 1).padStart(2, '0')}-${String(item.bookingDate.day).padStart(2, '0')}`
          : '',
        slotId: item.slot?.id || '',
      };
    });

    const invalid = payload.some((p) => !p.bookingDate || !p.slotId);
    if (invalid) {
      this.notificationService.showError(
        'Vui lòng chọn Ngày và Khung giờ cho các thiết bị đã chọn!',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.bookingService.createBulkBookings({ items: payload }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.showSuccess('Đã gửi yêu cầu mượn thành công!');
        // Xóa những item đã mượn khỏi giỏ hàng
        payload.forEach((p) => this.cartService.removeFromCart(p.cartItemId));
        this.router.navigate(['/my-bookings']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.notificationService.showError(err.error?.message || 'Có lỗi xảy ra khi đặt lịch.');
      },
    });
  }

  updateConfig(item: CartItem, field: 'date' | 'slotId', value: any) {
    if (!value && field === 'date') return;

    const dateObj =
      field === 'date' ? this.parseTuiDay(value) : item.bookingDate || TuiDay.currentLocal();
    const slotObj =
      field === 'slotId' ? this.timeSlots().find((s) => s.id === value) || null : item.slot;

    // Cập nhật thông tin cơ bản trước
    this.cartService.updateItemDetails(item.id, dateObj, slotObj);

    // Nếu đã có cả ngày và slot, kiểm tra số lượng khả dụng thực tế
    if (dateObj && slotObj) {
      const dateStr = this.formatTuiDayToISO(dateObj);
      this.bookingService.getAvailability(item.resource.id, dateStr, slotObj.id).subscribe({
        next: (avail) => {
          this.cartService.updateAvailableQuantity(item.id, avail);
          // Nếu số lượng hiện tại > số lượng khả dụng, tự động giảm xuống hoặc thông báo
          if (item.quantity > avail) {
            this.notificationService.showWarning(
              `Thiết bị ${item.resource.name} chỉ còn ${avail} máy trong khung giờ này.`,
            );
          }
        },
      });
    }
  }

  formatTuiDayToISO(day: TuiDay | null): string {
    if (!day) return '';
    return `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
  }

  private parseTuiDay(dateStr: string): TuiDay {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return TuiDay.currentLocal();
    const [y, m, d] = parts.map(Number);
    return new TuiDay(y, m - 1, d);
  }

  goBack() {
    this.router.navigate(['/student-shop']);
  }
}
