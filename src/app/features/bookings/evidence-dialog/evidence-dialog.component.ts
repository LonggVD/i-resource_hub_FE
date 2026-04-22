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
            <span class="upload-hint">JPG, PNG, WEBP · Tối đa 10 MB/ảnh</span>
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
              >✕</button>
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
    .evidence-dialog {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Header */
    .booking-context {
      background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      padding: 1rem 1.25rem;
      border-radius: 12px;
      border-left: 4px solid #6366f1;
    }
    .context-title {
      margin: 0;
      font-weight: 700;
      font-size: 1.125rem;
      color: #1e293b;
    }
    .context-desc {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: #64748b;
    }

    /* Form */
    .evidence-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .filter-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
    }
    .input-field {
      width: 100%;
      background: #fff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      font-size: 0.9375rem;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
      resize: vertical;
      box-sizing: border-box;
    }
    .input-field:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }

    /* Upload zone */
    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 2rem 1rem;
      border: 2px dashed #cbd5e1;
      border-radius: 14px;
      background: #f8fafc;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      text-align: center;
      user-select: none;
    }
    .upload-zone:hover,
    .upload-zone.has-files {
      border-color: #6366f1;
      background: #eef2ff;
    }
    .upload-icon {
      font-size: 2.5rem;
      color: #6366f1;
      opacity: 0.75;
    }
    .upload-title {
      font-size: 0.9375rem;
      color: #334155;
      font-weight: 500;
    }
    .upload-link {
      color: #6366f1;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .upload-hint {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Preview grid */
    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 0.6rem;
    }
    .preview-item {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      aspect-ratio: 1;
      border: 2px solid #e2e8f0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
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
      background: rgba(239, 68, 68, 0.88);
      color: #fff;
      border: none;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .preview-remove:hover { background: #dc2626; }

    /* Uploading */
    .uploading-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.875rem;
      color: #6366f1;
      font-weight: 500;
    }

    /* Footer */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
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
