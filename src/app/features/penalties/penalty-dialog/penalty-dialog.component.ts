import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiButton, TuiIcon, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { PenaltyService } from '../../../core/api/penalty.service';
import { FileUploadService } from '../../../core/api/file-upload.service';
import { NotificationService } from '../../../core/api/notification';
import { UserService } from '../../../core/api/user-service';
import { IrhSelect, IrhSelectOption } from '../../../shared/components/irh-select/irh-select.component';

@Component({
  selector: 'app-penalty-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiTextfield,
    IrhSelect,
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
  private fileUploadService = inject(FileUploadService);
  private cdr = inject(ChangeDetectorRef);

  form: FormGroup;
  userOptions: IrhSelectOption[] = [];
  penaltyTypeOptions: IrhSelectOption[] = [
    { label: 'QUÁ HẠN (OVERDUE)', value: 'OVERDUE' },
    { label: 'HƯ HỎNG (DAMAGE)', value: 'DAMAGE' },
    { label: 'MẤT ĐỒ (LOST)', value: 'LOST' },
  ];

  groupData: any;

  // ── Upload state ─────────────────────────────────
  selectedFiles: File[] = [];
  readonly previewUrls = signal<string[]>([]);
  readonly isUploading = signal(false);

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
        description: isDamage
          ? 'Ghi nhận sự cố hư hỏng/mất mát thiết bị.'
          : isExpired
          ? 'Ghi nhận lỗi mượn thiết bị quá hạn.'
          : '',
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
        this.userOptions = users.map((u) => ({
          label: `${u.fullName} (${u.studentCode || u.username})`,
          value: u.id,
        }));

        if (!this.form.get('userId')?.value) {
          const searchCode = this.context.data?.borrowerId || this.context.data?.studentCode;
          if (searchCode) {
            const matchedUser = users.find((u) => u.studentCode === searchCode);
            if (matchedUser) {
              this.form.patchValue({ userId: matchedUser.id });
            }
          }
        }
      },
      error: () => {
        this.notificationService.showError('Không thể tải danh sách sinh viên.');
      },
    });
  }

  // ── Upload handlers ──────────────────────────────
  onFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const newFiles = Array.from(input.files);
    const existingKeys = new Set(this.selectedFiles.map((f) => f.name + f.size));
    const toAdd = newFiles.filter((f) => !existingKeys.has(f.name + f.size));

    this.selectedFiles = [...this.selectedFiles, ...toAdd];
    this.previewUrls.update((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    input.value = '';
    this.cdr.markForCheck();
  }

  removeFile(index: number): void {
    const url = this.previewUrls()[index];
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
    this.previewUrls.update((prev) => prev.filter((_, i) => i !== index));
    this.cdr.markForCheck();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const finalize = (evidenceUrls: string[]) => {
      const val = this.form.value;
      this.penaltyService
        .createPenalty({
          userId: val.userId,
          bookingId: this.groupData?.items?.[0]?.id,
          penaltyType: val.penaltyType,
          penaltyPoint: val.penaltyPoint,
          description: val.description,
          fineAmount: val.fineAmount,
          requiresReview: val.requiresReview,
          evidenceUrls,
        })
        .subscribe({
          next: () => {
            this.isUploading.set(false);
            this.notificationService.showSuccess('Đã ghi nhận vi phạm thành công!');
            this.context.completeWith(true);
          },
          error: (err) => {
            this.isUploading.set(false);
            this.notificationService.showError(
              err.error?.message || 'Lỗi khi ghi nhận vi phạm',
            );
          },
        });
    };

    if (this.selectedFiles.length === 0) {
      finalize([]);
      return;
    }

    this.isUploading.set(true);
    this.fileUploadService.uploadImages(this.selectedFiles).subscribe({
      next: (urls) => finalize(urls),
      error: () => {
        this.isUploading.set(false);
        this.notificationService.showError('Tải ảnh minh chứng thất bại');
      },
    });
  }

  cancel() {
    this.previewUrls().forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u));
    this.context.completeWith(false);
  }
}
