import { TuiButton, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiDay } from '@taiga-ui/cdk';

import { BookingService } from '../../../core/api/booking.service';
import { TimeSlot } from '../../../core/models/booking.model';
import { ResourceTemplate } from '../../../core/models/resource-template.model';
import { NotificationService } from '../../../core/api/notification';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../../shared/components/irh-select/irh-select.component';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  OnDestroy,
} from '@angular/core';
import { Subject, takeUntil, combineLatest, startWith, filter } from 'rxjs';

@Component({
  selector: 'app-booking-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiTextfield,
    TuiBadge,
    TuiLoader,
    IrhSelect,
  ],
  templateUrl: './booking-request-dialog.component.html',
  styleUrl: './booking-request-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingRequestDialogComponent implements OnInit {
  // Context from TuiDialog
  private readonly context =
    inject<TuiDialogContext<boolean, ResourceTemplate>>(POLYMORPHEUS_CONTEXT);
  private readonly bookingService = inject(BookingService);
  private readonly notificationService = inject(NotificationService);

  readonly resource = this.context.data;
  readonly isLoadingSlots = signal(false);
  readonly isSubmitting = signal(false);
  readonly timeSlots = signal<TimeSlot[]>([]);
  readonly availableQty = signal<number | null>(null);
  readonly isCheckingAvailability = signal(false);

  private readonly destroy$ = new Subject<void>();

  // Rule 3: min date = today
  readonly minDate = TuiDay.currentLocal();

  readonly bookingForm = new FormGroup({
    bookingDate: new FormControl<TuiDay | string | null>(
      TuiDay.currentLocal(),
      Validators.required,
    ),
    slot: new FormControl<TimeSlot | null>(null, Validators.required),
    quantity: new FormControl<number>(1, [Validators.required, Validators.min(1), Validators.max(10)]),
    purpose: new FormControl('', Validators.maxLength(500)),
  });

  // Rule 3: Filter slots if date is today
  readonly filteredSlots = computed(() => {
    const slots = this.timeSlots();
    const selectedDateValue = this.bookingForm.get('bookingDate')?.value;

    if (!selectedDateValue) return slots;

    // Chuyển đổi sang TuiDay để so sánh nếu là string (từ native input)
    let selectedDate: TuiDay;
    if (typeof selectedDateValue === 'string') {
      const [year, month, day] = selectedDateValue.split('-').map(Number);
      selectedDate = new TuiDay(year, month - 1, day);
    } else {
      selectedDate = selectedDateValue;
    }

    // Nếu không phải ngày hôm nay (tức là ngày tương lai), không cần lọc giờ đã qua
    if (!selectedDate.daySame(TuiDay.currentLocal())) {
      return slots;
    }

    // Nếu là ngày hôm nay, lọc bỏ các slot đã kết thúc trong quá khứ
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    return slots.map((slot) => {
      const [hours, minutes] = slot.endTime.split(':').map(Number);
      const isPast = hours < currentHours || (hours === currentHours && minutes <= currentMinutes);
      return {
        ...slot,
        disabled: isPast,
      };
    });
  });

  ngOnInit() {
    this.loadTimeSlots();
    this.watchAvailabilityChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private watchAvailabilityChanges() {
    combineLatest([
      this.bookingForm.get('bookingDate')!.valueChanges.pipe(startWith(this.bookingForm.get('bookingDate')!.value)),
      this.bookingForm.get('slot')!.valueChanges.pipe(startWith(this.bookingForm.get('slot')!.value))
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([date, slot]) => !!date && !!slot)
    ).subscribe(([dateValue, slot]) => {
      let dateStr = '';
      if (typeof dateValue === 'string') {
        dateStr = dateValue;
      } else if (dateValue instanceof TuiDay) {
        dateStr = `${dateValue.year}-${String(dateValue.month + 1).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
      }

      if (dateStr && slot) {
        this.checkAvailability(dateStr, slot.id);
      }
    });
  }

  private checkAvailability(date: string, slotId: string) {
    this.isCheckingAvailability.set(true);
    this.availableQty.set(null);
    
    this.bookingService.getAvailability(this.resource.id, date, slotId).subscribe({
      next: (qty) => {
        this.availableQty.set(qty);
        this.isCheckingAvailability.set(false);
        
        // Tự động validate lại quantity nếu nó vượt quá số lượng khả dụng
        const currentQty = this.bookingForm.get('quantity')?.value || 0;
        if (qty < currentQty) {
          this.bookingForm.get('quantity')?.setValue(qty > 0 ? qty : 1);
        }
      },
      error: () => {
        this.isCheckingAvailability.set(false);
        this.availableQty.set(null);
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

  submit() {
    if (this.bookingForm.invalid) return;

    const formValue = this.bookingForm.value;
    const dateValue = formValue.bookingDate!;
    let dateStr = '';

    // Xử lý cả TuiDay (mặc định) và string (khi user chọn qua native input)
    if (typeof dateValue === 'string') {
      dateStr = dateValue; // Đã là định dạng YYYY-MM-DD
    } else {
      dateStr = `${dateValue.year}-${String(dateValue.month + 1).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
    }

    this.isSubmitting.set(true);
    this.bookingService
      .createBooking({
        resourceTemplateId: this.resource.id,
        bookingDate: dateStr,
        slotId: formValue.slot!.id,
        quantity: formValue.quantity || 1,
        purpose: formValue.purpose || '',
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.showSuccess('Đã gửi yêu cầu mượn đồ thành công!');
          this.context.completeWith(true);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.error(err);
          // Rule 2: Thông báo lỗi thân thiện khi hết thiết bị
          const errorMsg = err.error?.message || err.error || '';
          if (errorMsg.includes('hết thiết bị') || errorMsg.includes('đã có người đặt')) {
            this.notificationService.showError(
              'Rất tiếc, thiết bị này vừa bị người khác mượn hết. Vui lòng chọn khung giờ khác!',
            );
          } else {
            this.notificationService.showError('Đã có lỗi xảy ra khi gửi yêu cầu.');
          }
        },
      });
  }

  cancel() {
    this.context.completeWith(false);
  }

  // Helper to get select options
  getSlotOptions(): IrhSelectOption[] {
    return this.filteredSlots().map((slot) => ({
      label: `${slot.slotName} (${slot.startTime.substring(0, 5)} - ${slot.endTime.substring(0, 5)})`,
      value: slot, // We pass the whole object or just ID. For reactive form, we need consistency.
      disabled: slot.disabled,
    }));
  }
}
