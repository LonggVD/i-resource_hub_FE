import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { PenaltyService } from '../../../core/api/penalty.service';
import { NotificationService } from '../../../core/api/notification';
import { UserResponse } from '../../../core/models/user.model';
import { UserService } from '../../../core/api/user-service';
import { IrhSelect, IrhSelectOption } from '../../../shared/components/irh-select/irh-select.component';

@Component({
  selector: 'app-penalty-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiTextfield,
    IrhSelect
  ],
  templateUrl: './penalty-dialog.component.html',
  styleUrls: ['./penalty-dialog.component.css'],
})
export class PenaltyDialogComponent {
  private readonly context = inject<TuiDialogContext<boolean, any>>(POLYMORPHEUS_CONTEXT);
  private fb = inject(FormBuilder);
  private penaltyService = inject(PenaltyService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);

  form: FormGroup;
  userOptions: IrhSelectOption[] = [];
  penaltyTypeOptions: IrhSelectOption[] = [
    { label: 'QUÁ HẠN (OVERDUE)', value: 'OVERDUE' },
    { label: 'HƯ HỎNG (DAMAGE)', value: 'DAMAGE' },
    { label: 'MẤT ĐỒ (LOST)', value: 'LOST' }
  ];

  groupData: any;

  constructor() {
    this.form = this.fb.group({
      userId: [null, Validators.required],
      penaltyType: [null, Validators.required],
      penaltyPoint: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      description: ['', Validators.required],
      fineAmount: [0, [Validators.min(0)]],
      requiresReview: [false],
    });

    if (this.context.data) {
      this.groupData = this.context.data;
      const isDamage = this.context.data.hasDamage;
      const isExpired = this.context.data.expired;
      
      this.form.patchValue({
        userId: this.context.data.userId,
        penaltyType: isDamage ? 'DAMAGE' : 'OVERDUE',
        description: isDamage ? 'Ghi nhận sự cố hư hỏng/mất mát thiết bị.' : (isExpired ? 'Ghi nhận lỗi mượn thiết bị quá hạn.' : ''),
        fineAmount: isDamage ? 50000 : 0,
        requiresReview: isDamage,
      });
    }

    this.loadUsers();
  }

  loadUsers() {
    this.userService.getStudents({ size: 1000 }).subscribe({
      next: (res) => {
        const users = res.content;
        this.userOptions = users.map(u => ({
          label: `${u.fullName} (${u.studentCode || u.username})`,
          value: u.id
        }));

        // Robust fallback: check both borrowerId and studentCode
        if (!this.form.get('userId')?.value) {
          const searchCode = this.context.data?.borrowerId || this.context.data?.studentCode;
          if (searchCode) {
            const matchedUser = users.find(u => u.studentCode === searchCode);
            if (matchedUser) {
              this.form.patchValue({ userId: matchedUser.id });
            }
          }
        }
      },
      error: () => {
        this.notificationService.showError('Không thể tải danh sách sinh viên.');
      }
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;

    this.penaltyService
      .createPenalty({
        userId: val.userId,
        bookingId: this.groupData?.items?.[0]?.id, // Lấy ID của một thiết bị trong lô để liên kết
        penaltyType: val.penaltyType,
        penaltyPoint: val.penaltyPoint,
        description: val.description,
        fineAmount: val.fineAmount,
        requiresReview: val.requiresReview,
      })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Đã ghi nhận vi phạm thành công!');
          this.context.completeWith(true);
        },
        error: (err) => {
          this.notificationService.showError(err.error?.message || 'Lỗi khi ghi nhận vi phạm');
        },
      });
  }

  cancel() {
    this.context.completeWith(false);
  }
}
