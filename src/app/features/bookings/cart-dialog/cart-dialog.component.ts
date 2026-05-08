import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiLoader, TuiTextfield, TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { TuiDay } from '@taiga-ui/cdk';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { CartService, CartItem } from '../../../core/service/cart.service';
import { BookingService } from '../../../core/api/booking.service';
import { TimeSlot } from '../../../core/models/booking.model';
import { NotificationService } from '../../../core/api/notification';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../../shared/components/irh-select/irh-select.component';

@Component({
  selector: 'app-cart-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiTextfield,
    TuiLoader,
    TuiIcon,
    IrhSelect,
  ],
  templateUrl: './cart-dialog.component.html',
  styleUrl: './cart-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDialogComponent implements OnInit {
  private readonly context = inject<TuiDialogContext<boolean, void>>(POLYMORPHEUS_CONTEXT);
  private readonly cartService = inject(CartService);
  private readonly bookingService = inject(BookingService);
  private readonly notificationService = inject(NotificationService);

  readonly items = this.cartService.items;
  readonly isLoadingSlots = signal(false);
  readonly isSubmitting = signal(false);
  readonly timeSlots = signal<TimeSlot[]>([]);

  readonly bookingForm = new FormGroup({
    purpose: new FormControl('', Validators.maxLength(500)),
  });

  ngOnInit() {
    this.loadTimeSlots();
    this.checkInitialAvailability();
  }

  checkInitialAvailability() {
    this.items().forEach((item) => {
      if (item.slot) {
        this.checkAvailabilityForItem(item.id, item.resource.id, item.bookingDate, item.slot.id);
      }
    });
  }

  checkAvailabilityForItem(
    cartItemId: string,
    templateId: string,
    bookingDate: TuiDay,
    slotId: string,
  ) {
    const dateStr = `${bookingDate.year}-${String(bookingDate.month + 1).padStart(2, '0')}-${String(bookingDate.day).padStart(2, '0')}`;
    this.bookingService.getAvailability(templateId, dateStr, slotId).subscribe((available) => {
      this.cartService.updateAvailableQuantity(cartItemId, available);
      const item = this.items().find((i) => i.id === cartItemId);
      if (item && item.quantity > available) {
        this.cartService.updateQuantity(cartItemId, available > 0 ? available : 1);
        if (available <= 0) {
          this.notificationService.showWarning(
            `Thiết bị ${item.resource.name} hiện không còn trống trong khung giờ này.`,
          );
        }
      }
    });
  }

  loadTimeSlots() {
    this.isLoadingSlots.set(true);
    this.bookingService.getTimeSlots().subscribe({
      next: (slots) => {
        this.timeSlots.set(slots);
        this.isLoadingSlots.set(false);
      },
      error: () => {
        this.isLoadingSlots.set(false);
        this.notificationService.showError('Không thể tải danh sách khung giờ.');
      },
    });
  }

  // Lọc khung giờ cho từng món dựa trên ngày mượn của món đó
  getSlotOptionsForItem(item: CartItem): IrhSelectOption[] {
    const slots = this.timeSlots();
    const date = item.bookingDate;
    const isToday = date.daySame(TuiDay.currentLocal());

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    return slots.map((slot) => {
      let isPast = false;
      if (isToday) {
        const [hours, minutes] = slot.endTime.split(':').map(Number);
        isPast = hours < currentHours || (hours === currentHours && minutes <= currentMinutes);
      }
      return {
        label: `${slot.slotName} (${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)})`,
        value: slot,
        disabled: isPast,
      };
    });
  }

  onDateChange(cartItemId: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const [year, month, day] = value.split('-').map(Number);
    const tuiDay = new TuiDay(year, month - 1, day);
    const item = this.items().find((i) => i.id === cartItemId);
    if (item) {
      this.cartService.updateItemDetails(cartItemId, tuiDay, item.slot);
      if (item.slot) {
        this.checkAvailabilityForItem(cartItemId, item.resource.id, tuiDay, item.slot.id);
      }
    }
  }

  onSlotChange(cartItemId: string, slot: TimeSlot) {
    const item = this.items().find((i) => i.id === cartItemId);
    if (item) {
      this.cartService.updateItemDetails(cartItemId, item.bookingDate, slot);
      this.checkAvailabilityForItem(cartItemId, item.resource.id, item.bookingDate, slot.id);
    }
  }

  removeItem(id: string) {
    this.cartService.removeFromCart(id);
    if (this.cartService.isEmpty()) {
      this.context.completeWith(false);
    }
  }

  updateQty(id: string, qty: number) {
    if (qty < 1) return;
    const item = this.items().find((i) => i.id === id);
    if (item && item.availableQuantity !== undefined && qty > item.availableQuantity) {
      this.notificationService.showWarning(
        `không có nhiều hơn ${item.availableQuantity} thiết bị cho mục này`,
      );
      return;
    }
    this.cartService.updateQuantity(id, qty);
  }

  submit() {
    if (this.cartService.isEmpty()) return;

    // Validate: Tất cả các món phải được chọn khung giờ
    const invalidItem = this.items().find((item) => !item.slot);
    if (invalidItem) {
      this.notificationService.showError(
        `Vui lòng chọn khung giờ cho món: ${invalidItem.resource.name}`,
      );
      return;
    }

    const payload = {
      items: this.items().map((item) => ({
        resourceTemplateId: item.resource.id,
        quantity: item.quantity,
        bookingDate: `${item.bookingDate.year}-${String(item.bookingDate.month + 1).padStart(2, '0')}-${String(item.bookingDate.day).padStart(2, '0')}`,
        slotId: item.slot!.id,
      })),
      purpose: this.bookingForm.value.purpose || '',
    };

    this.isSubmitting.set(true);
    this.bookingService.createBulkBookings(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.cartService.clearCart();
        this.notificationService.showSuccess('Đã gửi yêu cầu mượn thành công!');
        this.context.completeWith(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.notificationService.showError(err.error?.message || 'Đã có lỗi xảy ra.');
      },
    });
  }

  cancel() {
    this.context.completeWith(false);
  }
}
