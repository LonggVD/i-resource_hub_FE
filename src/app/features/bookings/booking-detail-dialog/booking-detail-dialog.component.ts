import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiAlertService, TuiDialogContext, TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { GroupedBooking } from '../../../core/models/booking.model';
import { EvidenceService, EvidenceResponse } from '../../../core/api/evidence.service';
import { FileUploadService } from '../../../core/api/file-upload.service';
import { IrhImage } from '../../../shared/components/irh-image/irh-image.component';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../../shared/components/irh-select/irh-select.component';

@Component({
  selector: 'app-booking-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiBadge,
    TuiLoader,
    IrhImage,
    IrhSelect,
  ],
  templateUrl: './booking-detail-dialog.component.html',
  styleUrls: ['./booking-detail-dialog.component.css'],
})
export class BookingDetailDialogComponent implements OnInit {
  private readonly context = inject<TuiDialogContext<boolean, GroupedBooking>>(POLYMORPHEUS_CONTEXT);
  private readonly evidenceService = inject(EvidenceService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly alerts = inject(TuiAlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  group: GroupedBooking;
  evidences = signal<EvidenceResponse[]>([]);
  isLoadingEvidences = signal(true);

  // ── Upload state ──────────────────────────────────────────────
  selectedFiles: File[] = [];
  readonly previewUrls = signal<string[]>([]);
  readonly isUploading = signal(false);

  readonly itemOptions = signal<IrhSelectOption[]>([]);
  readonly typeOptions: IrhSelectOption[] = [
    { label: 'Bàn giao (CHECK_IN)', value: 'CHECK_IN' },
    { label: 'Trả đồ (CHECK_OUT)', value: 'CHECK_OUT' },
    { label: 'Sự cố / Hư hỏng (DAMAGE)', value: 'DAMAGE' },
  ];

  readonly uploadForm = new FormGroup({
    bookingId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    evidenceType: new FormControl('CHECK_OUT', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl(''),
  });

  constructor() {
    this.group = this.context.data;
  }

  ngOnInit() {
    this.loadEvidences();
    this.itemOptions.set(
      this.group.items.map((i) => ({
        label: `${i.deviceName} – ${i.serialNumber}`,
        value: i.id,
      }))
    );
    if (this.group.items.length > 0) {
      this.uploadForm.controls.bookingId.setValue(this.group.items[0].id);
    }
  }

  loadEvidences() {
    const bookingIds = this.group.items.map((i) => i.id);
    if (bookingIds.length === 0) {
      this.isLoadingEvidences.set(false);
      return;
    }

    this.evidenceService.getEvidencesByBookings(bookingIds).subscribe({
      next: (res) => {
        this.evidences.set(res);
        this.isLoadingEvidences.set(false);
      },
      error: () => {
        this.isLoadingEvidences.set(false);
      },
    });
  }

  getEvidencesForBooking(bookingId: string) {
    return this.evidences().filter((e) => e.bookingId === bookingId);
  }

  getEvidenceUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('assets/')) return url;

    if (url.startsWith('/api/')) {
      return `http://localhost:2811${url}`;
    }

    return `/assets/images/damaged/${url}`;
  }

  splitUrls(urls: string | null | undefined): string[] {
    if (!urls) return [];
    return urls.split(',').map((u) => u.trim()).filter((u) => u.length > 0);
  }

  // ── Upload handlers ───────────────────────────────────────────
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

  submitEvidence(): void {
    if (this.uploadForm.invalid || this.selectedFiles.length === 0) {
      this.alerts
        .open('Vui lòng chọn thiết bị và ít nhất 1 ảnh.', { appearance: 'warning' })
        .subscribe();
      return;
    }

    const val = this.uploadForm.getRawValue();
    this.isUploading.set(true);

    this.fileUploadService.uploadImages(this.selectedFiles).subscribe({
      next: (urls) => {
        this.evidenceService
          .addEvidence({
            bookingId: val.bookingId,
            evidenceType: val.evidenceType,
            imageUrl: urls.join(','),
            description: val.description || 'Bổ sung ảnh minh chứng',
          })
          .subscribe({
            next: () => {
              this.isUploading.set(false);
              this.alerts.open('Đã thêm ảnh minh chứng', { appearance: 'success' }).subscribe();
              // Reset
              this.previewUrls().forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u));
              this.selectedFiles = [];
              this.previewUrls.set([]);
              this.uploadForm.controls.description.reset('');
              this.loadEvidences();
              this.cdr.markForCheck();
            },
            error: () => {
              this.isUploading.set(false);
              this.alerts.open('Lưu minh chứng thất bại', { appearance: 'error' }).subscribe();
            },
          });
      },
      error: () => {
        this.isUploading.set(false);
        this.alerts.open('Tải ảnh thất bại', { appearance: 'error' }).subscribe();
      },
    });
  }

  close() {
    this.context.completeWith(false);
  }
}
