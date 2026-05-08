import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiLoader, TuiDialogContext, TuiTextfield, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { ResourceItemService } from '../../../core/api/resource-item-service';
import { ResourceTemplateService } from '../../../core/api/resource-template-service';
import { OrganizationUnitService } from '../../../core/api/organization-unit-service';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../../shared/components/irh-select/irh-select.component';
import { NotificationService } from '../../../core/api/notification';
import { ResourceItemBatchCreateRequest } from '../../../core/models/resource-item.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-resource-item-bulk-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
    TuiLoader,
    TuiTextfield,
    TuiIcon,
    IrhSelect,
  ],
  templateUrl: './resource-item-bulk-dialog.component.html',
  styleUrl: './resource-item-bulk-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceItemBulkDialogComponent {
  private readonly context = inject<TuiDialogContext<boolean, void>>(POLYMORPHEUS_CONTEXT);
  private readonly resourceItemService = inject(ResourceItemService);
  private readonly templateService = inject(ResourceTemplateService);
  private readonly unitService = inject(OrganizationUnitService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly templates = signal<IrhSelectOption[]>([]);

  readonly bulkForm = new FormGroup({
    templateId: new FormControl('', Validators.required),
    mode: new FormControl<'MANUAL' | 'AUTO'>('MANUAL'),
    // Manual mode
    serialNumbersText: new FormControl(''),
    // Auto mode
    prefix: new FormControl(''),
    quantity: new FormControl<number>(1, [Validators.min(1), Validators.max(200)]),
  });

  readonly currentMode = toSignal(
    this.bulkForm.controls.mode.valueChanges.pipe(startWith('MANUAL' as const)),
  );

  readonly totalCount = computed(() => {
    if (this.currentMode() === 'MANUAL') {
      const text = this.bulkForm.controls.serialNumbersText.value || '';
      return text
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0).length;
    } else {
      return this.bulkForm.controls.quantity.value || 0;
    }
  });

  constructor() {
    this.loadOptions();
  }

  readonly serialCount = computed(() => {
    const text = this.bulkForm.get('serialNumbersText')?.value || '';
    return text.split('\n').filter((s) => s.trim().length > 0).length;
  });

  private loadOptions() {
    this.templateService.getAllActive().subscribe((list) => {
      this.templates.set(list.map((t) => ({ label: t.name, value: t.id })));
    });
  }

  submit() {
    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    const formValue = this.bulkForm.getRawValue();
    let serialNumbers: string[] = [];

    if (formValue.mode === 'MANUAL') {
      serialNumbers = formValue
        .serialNumbersText!.split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else {
      const prefix = formValue.prefix || '';
      const qty = formValue.quantity || 0;
      for (let i = 1; i <= qty; i++) {
        // Sinh mã định dạng: PREFIX-001, PREFIX-002...
        const num = i.toString().padStart(3, '0');
        serialNumbers.push(`${prefix}${num}`);
      }
    }

    if (serialNumbers.length === 0) {
      this.notificationService.showError(
        'Vui lòng nhập ít nhất một mã Serial hoặc cấu hình sinh mã.',
      );
      return;
    }

    const request: ResourceItemBatchCreateRequest = {
      templateId: formValue.templateId!,
      serialNumbers: serialNumbers,
      unitId: '',
      conditionStatus: 'GOOD',
      status: 'AVAILABLE',
    };

    this.isSubmitting.set(true);
    this.resourceItemService.batchCreate(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.showSuccess(
          `Đã nhập thành công ${serialNumbers.length} thiết bị.`,
        );
        this.context.completeWith(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.notificationService.showError(err.error?.message || 'Có lỗi xảy ra khi nhập lô.');
      },
    });
  }

  cancel() {
    this.context.completeWith(false);
  }
}
