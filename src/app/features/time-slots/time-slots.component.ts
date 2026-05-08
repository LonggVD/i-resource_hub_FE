import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiButton, TuiIcon, TuiLabel, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiDialog } from '@taiga-ui/experimental';
import { TuiForm } from '@taiga-ui/layout';
import { ColDef } from 'ag-grid-community';

import { IrhAggridComponent } from '../../shared/components/irh-aggrid/irh-aggrid.component';
import { TimeSlotService, TimeSlotResponse, TimeSlotRequest } from '../../core/api/time-slot.service';
import { NotificationService } from '../../core/api/notification';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../shared/components/irh-select/irh-select.component';

@Component({
  selector: 'app-time-slots',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiLoader,
    TuiButton,
    TuiIcon,
    TuiTextfield,
    TuiDialog,
    TuiForm,
    TuiAutoFocus,
    TuiLabel,
    IrhAggridComponent,
    IrhSelect,
  ],
  templateUrl: './time-slots.component.html',
  styleUrl: './time-slots.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSlotsComponent implements OnInit {
  // ── Signals ──────────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly timeSlots = signal<TimeSlotResponse[]>([]);
  readonly isSubmittingAdd = signal(false);
  readonly isSubmittingEdit = signal(false);
  readonly isSubmittingDelete = signal(false);
  readonly addError = signal<string | null>(null);
  readonly editError = signal<string | null>(null);
  readonly selectedDeleteSlot = signal<TimeSlotResponse | null>(null);

  // ── Dialog state (plain booleans for [(tuiDialog)] two-way binding) ──
  openAddDialog = false;
  openEditDialog = false;
  openDialogConfirmDelete = false;
  readonly currentEditSlot = signal<TimeSlotResponse | null>(null);

  // ── DI ───────────────────────────────────────────────────
  private readonly timeSlotService = inject(TimeSlotService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  // ── Day options ──────────────────────────────────────────
  readonly dayOptions: IrhSelectOption[] = [
    { label: 'Tất cả các ngày', value: '' },
    { label: 'Thứ Hai', value: '1' },
    { label: 'Thứ Ba', value: '2' },
    { label: 'Thứ Tư', value: '3' },
    { label: 'Thứ Năm', value: '4' },
    { label: 'Thứ Sáu', value: '5' },
    { label: 'Thứ Bảy', value: '6' },
    { label: 'Chủ Nhật', value: '7' },
  ];

  getDayLabel(dayOfWeek: number | null): string {
    if (dayOfWeek === null) return 'Tất cả';
    const map: Record<number, string> = {
      1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm',
      5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ Nhật',
    };
    return map[dayOfWeek] || '—';
  }

  // ── Forms ────────────────────────────────────────────────
  readonly addForm = new FormGroup({
    slotName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    startTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dayOfWeek: new FormControl('', { nonNullable: true }),
  });

  readonly editForm = new FormGroup({
    slotName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    startTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dayOfWeek: new FormControl('', { nonNullable: true }),
  });

  // ═══════════════════════════════════════════════════════════
  //  AG GRID
  // ═══════════════════════════════════════════════════════════
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: true,
    flex: 1,
  };

  colDefs: ColDef[] = [
    {
      headerName: 'Tên ca',
      field: 'slotName',
      flex: 2,
      minWidth: 160,
    },
    {
      headerName: 'Giờ bắt đầu',
      field: 'startTime',
      flex: 1,
      minWidth: 120,
      cellStyle: { fontFamily: 'monospace', fontWeight: '600' },
    },
    {
      headerName: 'Giờ kết thúc',
      field: 'endTime',
      flex: 1,
      minWidth: 120,
      cellStyle: { fontFamily: 'monospace', fontWeight: '600' },
    },
    {
      headerName: 'Ngày áp dụng',
      field: 'dayOfWeek',
      flex: 1.5,
      minWidth: 140,
      valueFormatter: (params) => this.getDayLabel(params.value),
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      cellRenderer: (params: any) => {
        const label = this.getDayLabel(params.value);
        const isAll = params.value === null;
        const bg = isAll ? '#f0fdf4' : '#eef2ff';
        const text = isAll ? '#16a34a' : '#6366f1';
        const border = isAll ? '#86efac' : '#c7d2fe';
        return `
          <div style="
            background: ${bg};
            color: ${text};
            border: 1px solid ${border};
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;">${label}
          </div>
        `;
      },
    },
    {
      headerName: 'Hành động',
      flex: 1,
      minWidth: 130,
      filter: false,
      sortable: false,
      floatingFilter: false,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
      },
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;gap:6px;align-items:center;';

        // Lucide "pencil" SVG icon
        const editSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`;
        const editBtn = document.createElement('button');
        editBtn.innerHTML = editSvg;
        editBtn.title = 'Chỉnh sửa';
        editBtn.style.cssText =
          'width:32px;height:32px;border-radius:8px;border:1px solid #e0e7ff;background:#f5f7ff;color:#6366f1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;';
        editBtn.onmouseenter = () => { editBtn.style.background = '#eef2ff'; editBtn.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,.08)'; };
        editBtn.onmouseleave = () => { editBtn.style.background = '#f5f7ff'; editBtn.style.boxShadow = 'none'; };
        editBtn.addEventListener('click', () => this.onEdit(params.data));

        // Lucide "trash-2" SVG icon
        const deleteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = deleteSvg;
        deleteBtn.title = 'Xóa';
        deleteBtn.style.cssText =
          'width:32px;height:32px;border-radius:8px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;';
        deleteBtn.onmouseenter = () => { deleteBtn.style.background = '#fee2e2'; deleteBtn.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,.08)'; };
        deleteBtn.onmouseleave = () => { deleteBtn.style.background = '#fef2f2'; deleteBtn.style.boxShadow = 'none'; };
        deleteBtn.addEventListener('click', () => this.onDelete(params.data));

        container.appendChild(editBtn);
        container.appendChild(deleteBtn);
        return container;
      },
    },
  ];

  // ═══════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════════════════════
  ngOnInit() {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.timeSlotService.getAll().subscribe({
      next: (data) => {
        this.timeSlots.set(data);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('Không thể tải danh sách khung giờ.');
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  THÊM MỚI
  // ═══════════════════════════════════════════════════════════
  onOpenAddDialog(): void {
    this.addError.set(null);
    this.addForm.reset();
    this.openAddDialog = true;
  }

  onCancelAddDialog(): void {
    this.addError.set(null);
    this.openAddDialog = false;
  }

  onSubmitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const val = this.addForm.getRawValue();
    const payload: TimeSlotRequest = {
      slotName: val.slotName.trim(),
      startTime: val.startTime,
      endTime: val.endTime,
      dayOfWeek: val.dayOfWeek ? parseInt(val.dayOfWeek, 10) : null,
    };

    this.isSubmittingAdd.set(true);
    this.addError.set(null);

    this.timeSlotService.create(payload).subscribe({
      next: () => {
        this.isSubmittingAdd.set(false);
        this.openAddDialog = false;
        this.loadData();
        this.notificationService.showSuccess('Đã thêm khung giờ mới thành công.');
      },
      error: (err) => {
        this.isSubmittingAdd.set(false);
        this.addError.set(err.error?.message || 'Không thể thêm khung giờ.');
        this.notificationService.showError(err.error?.message || 'Không thể thêm khung giờ.');
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  CHỈNH SỬA
  // ═══════════════════════════════════════════════════════════
  onEdit(slot: TimeSlotResponse): void {
    this.currentEditSlot.set(slot);
    this.editError.set(null);
    this.editForm.setValue({
      slotName: slot.slotName,
      startTime: slot.startTime,
      endTime: slot.endTime,
      dayOfWeek: slot.dayOfWeek !== null ? String(slot.dayOfWeek) : '',
    });
    this.openEditDialog = true;
    this.cdr.detectChanges();
  }

  onCancelEditDialog(): void {
    this.currentEditSlot.set(null);
    this.editError.set(null);
    this.openEditDialog = false;
  }

  onSubmitEdit(): void {
    const slot = this.currentEditSlot();
    if (!slot) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const val = this.editForm.getRawValue();
    const payload: TimeSlotRequest = {
      slotName: val.slotName.trim(),
      startTime: val.startTime,
      endTime: val.endTime,
      dayOfWeek: val.dayOfWeek ? parseInt(val.dayOfWeek, 10) : null,
    };

    this.isSubmittingEdit.set(true);
    this.editError.set(null);

    this.timeSlotService.update(slot.id, payload).subscribe({
      next: () => {
        this.isSubmittingEdit.set(false);
        this.openEditDialog = false;
        this.currentEditSlot.set(null);
        this.loadData();
        this.notificationService.showSuccess('Đã cập nhật khung giờ thành công.');
      },
      error: (err) => {
        this.isSubmittingEdit.set(false);
        this.editError.set(err.error?.message || 'Không thể cập nhật khung giờ.');
        this.notificationService.showError(err.error?.message || 'Không thể cập nhật khung giờ.');
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  XÓA
  // ═══════════════════════════════════════════════════════════
  onDelete(slot: TimeSlotResponse): void {
    this.selectedDeleteSlot.set(slot);
    this.openDialogConfirmDelete = true;
    this.cdr.detectChanges();
  }

  onCancelDeleteDialog(): void {
    this.selectedDeleteSlot.set(null);
    this.openDialogConfirmDelete = false;
  }

  onConfirmDelete(): void {
    const slot = this.selectedDeleteSlot();
    if (!slot) return;

    this.isSubmittingDelete.set(true);
    this.timeSlotService.delete(slot.id).subscribe({
      next: () => {
        this.isSubmittingDelete.set(false);
        this.openDialogConfirmDelete = false;
        this.selectedDeleteSlot.set(null);
        this.loadData();
        this.notificationService.showSuccess('Đã xóa khung giờ thành công.');
      },
      error: (err) => {
        this.isSubmittingDelete.set(false);
        this.notificationService.showError(err.error?.message || 'Không thể xóa khung giờ.');
      },
    });
  }
}
