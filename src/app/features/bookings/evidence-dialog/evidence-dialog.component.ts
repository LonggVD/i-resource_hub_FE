import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../../shared/components/irh-select/irh-select.component';
import { Booking } from '../../../core/models/booking.model';
import { FileUploadService } from '../../../core/api/file-upload.service';

export interface EvidenceDialogData {
  booking: Booking;
  type: 'CHECK_OUT' | 'DAMAGE';
}

@Component({
  selector: 'app-evidence-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    IrhSelect,
  ],
  template: `
    <div class="evidence-dialog">
      <!-- Header -->
      <div class="booking-context">
        <p class="context-title">
          {{ data.type === 'CHECK_OUT' ? 'Xác nhận trả đồ' : 'Báo cáo sự cố' }}
        </p>
        <p class="context-desc">
          Thiết bị: <strong>{{ data.booking.deviceName || 'N/A' }}</strong>
          ({{ data.booking.borrowerName }})
        </p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="evidence-form">

        <!-- Tình trạng -->
        <div class="form-item">
          <label class="filter-label">Tình trạng thiết bị *</label>
          <app-irh-select
            [options]="conditionOptions"
            formControlName="condition"
            placeholder="Chọn tình trạng..."
          ></app-irh-select>
        </div>

        <!-- Mô tả -->
        <div class="form-item">
          <label class="filter-label">Mô tả chi tiết *</label>
          <textarea
            formControlName="description"
            class="input-field"
            rows="3"
            placeholder="Nhập chi tiết tình trạng hoặc sự cố..."
          ></textarea>
        </div>

        <!-- Upload ảnh -->
        <div class="form-item">
          <label class="filter-label">Ảnh minh chứng</label>

          <!-- Drop zone – click để chọn file -->
          <label class="upload-zone" [class.has-files]="selectedFiles.length > 0">
            <input
              #fileInput
              type="file"
              accept="image/*"
              multiple
              hidden
              (change)="onFilesChange($event)"
            />
            <tui-icon icon="@tui.image-plus" class="upload-icon"></tui-icon>
            <span class="upload-title">
              Kéo thả hoặc <span class="upload-link">chọn ảnh từ máy</span>
            </span>
            <span class="upload-hint">JPG, PNG, WEBP &middot; Tối đa 10 MB/ảnh</span>
          </label>

          <!-- Preview Grid -->
          <div *ngIf="previewUrls().length > 0" class="preview-grid">
            <div
              *ngFor="let url of previewUrls(); let i = index"
              class="preview-item"
            >
              <img [src]="url" [alt]="'Ảnh ' + (i + 1)" class="preview-img" />
              <button
                type="button"
                class="preview-remove"
                (click)="removeFile(i)"
                title="Xóa ảnh này"
                aria-label="Xóa ảnh"
              >
                <tui-icon icon="@tui.x"></tui-icon>
              </button>
            </div>
          </div>

          <!-- Uploading indicator -->
          <div *ngIf="isUploading()" class="uploading-row">
            <tui-loader size="s"></tui-loader>
            <span>Đang tải ảnh lên server...</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="dialog-footer">
          <button tuiButton type="button" appearance="secondary" size="m" (click)="cancel()">
            Hủy
          </button>
          <button
            tuiButton
            type="submit"
            size="m"
            [appearance]="data.type === 'DAMAGE' ? 'destructive' : 'primary'"
            [disabled]="form.invalid || isUploading()"
          >
            {{ isUploading() ? 'Đang tải...' : (data.type === 'CHECK_OUT' ? 'Hoàn tất Trả đồ' : 'Gửi Báo cáo') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; box-sizing: border-box; width: 100%; }
    :host *, :host *::before, :host *::after { box-sizing: border-box; }

    .evidence-dialog {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      min-width: 0;
      width: 100%;
    }

    /* Header */
    .booking-context {
      background: var(--color-primary-soft);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-lg);
      border-left: 3px solid var(--color-primary);
      min-width: 0;
    }
    .context-title {
      margin: 0;
      font-weight: 700;
      font-size: var(--font-size-lg);
      color: var(--color-text);
      word-break: break-word;
    }
    .context-desc {
      margin: var(--space-1) 0 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      word-break: break-word;
    }

    /* Form */
    .evidence-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      min-width: 0;
    }
    .form-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 0;
    }
    .filter-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-strong);
    }
    .input-field {
      width: 100%;
      min-width: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-base);
      color: var(--color-text);
      font-family: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      resize: vertical;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .input-field:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-soft-2);
    }

    /* Upload zone */
    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-4);
      border: 2px dashed var(--color-border-strong);
      border-radius: var(--radius-xl);
      background: var(--color-surface-alt);
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
      text-align: center;
      user-select: none;
      min-width: 0;
    }
    .upload-zone:hover,
    .upload-zone.has-files {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .upload-icon {
      font-size: var(--font-size-2xl);
      color: var(--color-primary);
    }
    .upload-title {
      font-size: var(--font-size-base);
      color: var(--color-text-strong);
      font-weight: 500;
      word-break: break-word;
    }
    .upload-link {
      color: var(--color-primary);
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .upload-hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-subtle);
    }

    /* Preview grid */
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: var(--space-2);
      min-width: 0;
    }
    .preview-item {
      position: relative;
      border-radius: var(--radius-md);
      overflow: hidden;
      aspect-ratio: 1;
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      min-width: 0;
    }
    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .preview-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      background: var(--color-danger);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
    }
    .preview-remove tui-icon {
      font-size: 14px;
    }
    .preview-remove:hover { background: var(--color-text); }

    /* Uploading */
    .uploading-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
      color: var(--color-primary);
      font-weight: 500;
    }

    /* Footer */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      flex-wrap: wrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvidenceDialogComponent {
  private readonly context =
    inject<TuiDialogContext<any | null, EvidenceDialogData>>(POLYMORPHEUS_CONTEXT);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly data = this.context.data;

  selectedFiles: File[] = [];
  readonly previewUrls = signal<string[]>([]);
  readonly isUploading = signal(false);

  readonly conditionOptions: IrhSelectOption[] = [
    { label: 'Tốt (Hoạt động bình thường)', value: 'GOOD' },
    { label: 'Bình thường (Có dấu hiệu hao mòn)', value: 'NORMAL' },
    { label: 'Hỏng (Cần bảo trì)', value: 'DAMAGED' },
    { label: 'Mất (Thiếu linh kiện/thiết bị)', value: 'LOST' },
  ];

  readonly form = new FormGroup({
    condition: new FormControl('GOOD', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /** Xử lý khi người dùng chọn file */
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

    // Reset để có thể chọn lại cùng file
    input.value = '';
    this.cdr.markForCheck();
  }

  /** Xóa ảnh khỏi danh sách */
  removeFile(index: number): void {
    const url = this.previewUrls()[index];
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);

    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
    this.previewUrls.update((prev) => prev.filter((_, i) => i !== index));
    this.cdr.markForCheck();
  }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();

    if (this.selectedFiles.length === 0) {
      this.complete('', val);
      return;
    }

    this.isUploading.set(true);
    this.fileUploadService.uploadImages(this.selectedFiles).subscribe({
      next: (urls) => {
        this.isUploading.set(false);
        this.complete(urls.join(','), val);
      },
      error: () => {
        this.isUploading.set(false);
        this.complete('', val);
      },
    });
  }

  private complete(imageUrl: string, val: { condition: string; description: string }): void {
    this.context.completeWith({
      bookingId: this.data.booking.id,
      evidenceType: this.data.type,
      description: `[Tình trạng: ${val.condition}] ${val.description}`,
      imageUrl,
    });
  }

  cancel(): void {
    this.context.completeWith(null);
  }
}
