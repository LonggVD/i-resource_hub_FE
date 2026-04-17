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
import { TuiButton, TuiIcon, TuiLabel, TuiLoader, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import { TuiDialog } from '@taiga-ui/experimental';
import { TuiFloatingContainer } from '@taiga-ui/kit';
import { TuiForm, TuiHeader } from '@taiga-ui/layout';
import { ColDef } from 'ag-grid-community';

import { IrhAggridComponent } from '../../shared/components/irh-aggrid/irh-aggrid.component';
import { ResourceTemplateService } from '../../core/api/resource-template-service';
import { CategoryService } from '../../core/api/category-service';
import { OrganizationUnitService } from '../../core/api/organization-unit-service';
import {
  ResourceTemplate,
  ResourceTemplateCreateRequest,
  ResourceTemplateUpdateRequest,
} from '../../core/models/resource-template.model';
import { Category } from '../../core/models/category.model';
import { OrganizationUnitResponse } from '../../core/models/organization-unit.model';
import { NotificationService } from '../../core/api/notification';
import { ResourceActionRendererComponent } from './resource-action-renderer';
import { ResourceDeletedActionRendererComponent } from './resource-deleted-action-renderer';
import { SelectFloatingFilterComponent } from './select-floating-filter.component';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../shared/components/irh-select/irh-select.component';
import { IrhMultiSelect } from '../../shared/components/irh-multi-select/irh-multi-select.component';
import { IrhImage } from '../../shared/components/irh-image/irh-image.component';
import { computed } from '@angular/core';

@Component({
  selector: 'app-resources',
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
    TuiTitle,
    TuiHeader,
    TuiFloatingContainer,
    IrhAggridComponent,
    IrhSelect,
    IrhImage,
  ],
  templateUrl: './resources.component.html',
  styleUrl: './resources.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesComponent implements OnInit {
  // ── Signals ──────────────────────────────────────────────
  public readonly isLoading = signal(false);
  public readonly resourceList = signal<ResourceTemplate[]>([]);
  public readonly deletedList = signal<ResourceTemplate[]>([]);
  public readonly categories = signal<Category[]>([]);
  public readonly units = signal<OrganizationUnitResponse[]>([]);
  public readonly isSubmittingAdd = signal(false);
  public readonly isSubmittingEdit = signal(false);
  public readonly isSubmittingDelete = signal(false);
  public readonly addError = signal<string | null>(null);
  public readonly editError = signal<string | null>(null);
  public readonly selectedDeleteResource = signal<ResourceTemplate | null>(null);
  public readonly previewImageUrl = signal('');
  public readonly openPreviewDialog = signal(false);

  // ── Computed Options ─────────────────────────────────────
  public readonly categoryOptions = computed<IrhSelectOption[]>(() =>
    this.categories().map((c) => ({ label: c.categoryName, value: c.id })),
  );

  public readonly unitOptions = computed<IrhSelectOption[]>(() =>
    this.units().map((u) => ({ label: u.unitName, value: u.id })),
  );

  // public readonly testControl = new FormControl<string[]>([]);
  // public readonly testTagsOptions = [
  //   { label: 'Topic 1', value: 'T1' },
  //   { label: 'Topic 2', value: 'T2' },
  //   { label: 'Topic 3', value: 'T3' },
  //   { label: 'Topic 4', value: 'T4' },
  //   { label: 'Topic 5', value: 'T5' },
  //   { label: 'Topic 6', value: 'T6' },
  // ];

  // ── Forms ────────────────────────────────────────────────
  public readonly addForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', { nonNullable: true }),
    isAutoApprove: new FormControl(false, { nonNullable: true }),
    imageUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    categoryId: new FormControl('', { nonNullable: true }),
    unitId: new FormControl('', { nonNullable: true }),
  });

  public readonly editForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', { nonNullable: true }),
    isAutoApprove: new FormControl(false, { nonNullable: true }),
    imageUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    categoryId: new FormControl('', { nonNullable: true }),
    unitId: new FormControl('', { nonNullable: true }),
  });

  // ── Computed Image Preview ────────────────────────────────
  public readonly addImageUrl = computed(() => {
    return this.addForm.get('imageUrl')?.value || this.PLACEHOLDER_SVG;
  });

  public readonly editImageUrl = computed(() => {
    return this.editForm.get('imageUrl')?.value || this.PLACEHOLDER_SVG;
  });

  // ── Dialog state ─────────────────────────────────────────
  public readonly openAddDialog = signal(false);
  public readonly openEditDialog = signal(false);
  public readonly openDialogConfirmDelete = signal(false);
  public readonly openDeletedListDialog = signal(false);
  public readonly currentEditResource = signal<ResourceTemplate | null>(null);

  // ── DI ───────────────────────────────────────────────────
  private readonly resourceService = inject(ResourceTemplateService);
  private readonly categoryService = inject(CategoryService);
  private readonly unitService = inject(OrganizationUnitService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  // ═══════════════════════════════════════════════════════════
  //  AG GRID — Bảng chính (active resources)
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

  // SVG placeholder lấp lánh và hiện đại hơn cho ảnh chưa có
  private readonly PLACEHOLDER_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`)}`;

  colDefs: ColDef[] = [
    {
      headerName: 'Ảnh',
      field: 'imageUrl',
      width: 70,
      maxWidth: 70,
      minWidth: 70,
      flex: 0,
      suppressSizeToFit: true,
      filter: false,
      sortable: false,
      floatingFilter: false,
      resizable: false,
      suppressHeaderMenuButton: true,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0px',
        cursor: 'pointer',
      },
      onCellClicked: (params: any) => {
        const url = params.value || this.PLACEHOLDER_SVG;
        this.previewImageUrl.set(url);
        this.openPreviewDialog.set(true);
        this.cdr.detectChanges();
      },
      cellRenderer: (params: any) => {
        const url = params.value;
        const fallback = this.PLACEHOLDER_SVG;
        return `
          <div style="
            width: 40px; 
            height: 40px; 
            border-radius: 8px; 
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          ">
            <img 
              src="${url || fallback}" 
              alt="" 
              style="width: 100%; height: 100%; object-fit: cover;" 
              onerror="this.src='${fallback}'"
            />
          </div>
        `;
      },
    },
    {
      headerName: 'Tên tài nguyên',
      field: 'name',
      flex: 2,
      minWidth: 180,
    },
    {
      headerName: 'Mô tả',
      field: 'description',
      flex: 2.5,
      minWidth: 200,
    },
    {
      headerName: 'Danh mục',
      field: 'category.categoryName',
      valueGetter: (params) => params.data?.category?.categoryName || '—',
      flex: 1.5,
      minWidth: 140,
      filter: true,
      floatingFilterComponent: SelectFloatingFilterComponent,
      floatingFilterComponentParams: { valuesFromGrid: true },
    },
    {
      headerName: 'Đơn vị',
      field: 'unit.unitName',
      valueGetter: (params) => params.data?.unit?.unitName || '—',
      flex: 1.5,
      minWidth: 140,
      filter: true,
      floatingFilterComponent: SelectFloatingFilterComponent,
      floatingFilterComponentParams: { valuesFromGrid: true },
    },
    {
      headerName: 'Tự duyệt',
      field: 'isAutoApprove',
      flex: 1,
      minWidth: 110,
      filter: true,
      floatingFilterComponent: SelectFloatingFilterComponent,
      floatingFilterComponentParams: { values: ['Có', 'Không'] },
      valueGetter: (params) => (params.data?.isAutoApprove ? 'Có' : 'Không'),
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      cellRenderer: (params: any) => {
        const isAuto = params.value === 'Có';
        const bg = isAuto ? '#f0fdf4' : '#fef2f2';
        const text = isAuto ? '#16a34a' : '#dc2626';
        const border = isAuto ? '#86efac' : '#fca5a5';
        const label = params.value;

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
      cellRenderer: ResourceActionRendererComponent,
      cellRendererParams: {
        onEdit: (res: ResourceTemplate) => this.onEdit(res),
        onDelete: (res: ResourceTemplate) => this.onDelete(res),
      },
    },
  ];

  // ═══════════════════════════════════════════════════════════
  //  AG GRID — Bảng danh sách đã xoá
  // ═══════════════════════════════════════════════════════════
  deletedColDefs: ColDef[] = [
    {
      headerName: 'Ảnh',
      field: 'imageUrl',
      width: 70,
      maxWidth: 70,
      minWidth: 70,
      flex: 0,
      suppressSizeToFit: true,
      filter: false,
      sortable: false,
      floatingFilter: false,
      resizable: false,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0px',
        cursor: 'pointer',
      },
      onCellClicked: (params: any) => {
        const url = params.value || this.PLACEHOLDER_SVG;
        this.previewImageUrl.set(url);
        this.openPreviewDialog.set(true);
        this.cdr.detectChanges();
      },
      cellRenderer: (params: any) => {
        const url = params.value;
        const fallback = this.PLACEHOLDER_SVG;
        return `
          <div style="
            width: 40px; 
            height: 40px; 
            border-radius: 8px; 
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          ">
            <img 
              src="${url || fallback}" 
              alt="" 
              style="width: 100%; height: 100%; object-fit: cover;" 
              onerror="this.src='${fallback}'"
            />
          </div>
        `;
      },
    },
    {
      headerName: 'Tên tài nguyên',
      field: 'name',
      flex: 2,
      minWidth: 180,
    },
    {
      headerName: 'Mô tả',
      field: 'description',
      flex: 2.5,
      minWidth: 200,
    },
    {
      headerName: 'Danh mục',
      valueGetter: (params) => params.data?.category?.categoryName || '—',
      flex: 1.5,
      minWidth: 140,
    },
    {
      headerName: 'Đơn vị',
      valueGetter: (params) => params.data?.unit?.unitName || '—',
      flex: 1.5,
      minWidth: 140,
    },
    {
      headerName: 'Hành động',
      flex: 1,
      minWidth: 100,
      filter: false,
      sortable: false,
      floatingFilter: false,
      cellRenderer: ResourceDeletedActionRendererComponent,
      cellRendererParams: {
        onRestore: (res: ResourceTemplate) => this.onRestore(res),
      },
    },
  ];

  // ═══════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════════════════════
  ngOnInit() {
    this.loadData();
    this.loadDropdownData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.resourceService.getAllActive().subscribe({
      next: (data) => {
        this.resourceList.set(data);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Lỗi khi tải danh sách tài nguyên', err);
        this.notificationService.showError('Không thể tải danh sách tài nguyên.');
      },
    });
  }

  loadDropdownData(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.cdr.detectChanges();
      },
      error: () => {},
    });

    this.unitService.getAllUnits().subscribe({
      next: (units) => {
        this.units.set(units);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  THÊM MỚI
  // ═══════════════════════════════════════════════════════════
  onOpenAddDialog(): void {
    this.addError.set(null);
    this.addForm.reset();
    this.openAddDialog.set(true);
  }

  onCancelAddDialog(): void {
    this.addError.set(null);
    this.openAddDialog.set(false);
  }

  onSubmitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const formValue = this.addForm.getRawValue();
    const payload: ResourceTemplateCreateRequest = {
      name: formValue.name.trim(),
      description: formValue.description.trim() || undefined,
      isAutoApprove: formValue.isAutoApprove,
      imageUrl: formValue.imageUrl.trim() || undefined,
      categoryId: formValue.categoryId || undefined,
      unitId: formValue.unitId || undefined,
    };

    this.isSubmittingAdd.set(true);
    this.addError.set(null);

    this.resourceService.create(payload).subscribe({
      next: () => {
        this.isSubmittingAdd.set(false);
        this.openAddDialog.set(false);
        this.loadData();
        this.notificationService.showSuccess('Tài nguyên đã được thêm thành công.');
      },
      error: (err) => {
        this.isSubmittingAdd.set(false);
        console.error('Lỗi khi thêm tài nguyên', err);
        this.addError.set('Không thể thêm tài nguyên. Vui lòng thử lại.');
        this.notificationService.showError('Không thể thêm tài nguyên.');
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  CHỈNH SỬA
  // ═══════════════════════════════════════════════════════════
  onEdit(resource: ResourceTemplate): void {
    this.currentEditResource.set(resource);
    this.editError.set(null);
    this.editForm.setValue({
      name: resource.name,
      description: resource.description ?? '',
      isAutoApprove: resource.isAutoApprove ?? false,
      imageUrl: resource.imageUrl ?? '',
      categoryId: resource.category?.id ?? '',
      unitId: resource.unit?.id ?? '',
    });
    this.openEditDialog.set(true);
  }

  onCancelEditDialog(): void {
    this.currentEditResource.set(null);
    this.editError.set(null);
    this.openEditDialog.set(false);
  }

  onSubmitEdit(): void {
    if (!this.currentEditResource) {
      this.editError.set('Không tìm thấy tài nguyên cần sửa.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formValue = this.editForm.getRawValue();
    const payload: ResourceTemplateUpdateRequest = {
      name: formValue.name.trim(),
      description: formValue.description.trim() || undefined,
      isAutoApprove: formValue.isAutoApprove,
      imageUrl: formValue.imageUrl.trim() || undefined,
      categoryId: formValue.categoryId || undefined,
      unitId: formValue.unitId || undefined,
    };

    this.isSubmittingEdit.set(true);
    this.editError.set(null);

    this.resourceService.update(this.currentEditResource()!.id, payload).subscribe({
      next: () => {
        this.isSubmittingEdit.set(false);
        this.openEditDialog.set(false);
        this.openPreviewDialog.set(false);
        this.currentEditResource.set(null);
        this.loadData();
        this.notificationService.showSuccess('Tài nguyên đã được cập nhật thành công.');
      },
      error: (err) => {
        this.isSubmittingEdit.set(false);
        console.error('Lỗi khi cập nhật tài nguyên', err);
        this.editError.set('Không thể cập nhật tài nguyên. Vui lòng thử lại.');
        this.notificationService.showError('Không thể cập nhật tài nguyên.');
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  FILE PICKER HANDLER
  // ═══════════════════════════════════════════════════════════
  public onFileSelected(event: any, formType: 'add' | 'edit'): void {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (formType === 'add') {
          this.addForm.patchValue({ imageUrl: base64 });
        } else {
          this.editForm.patchValue({ imageUrl: base64 });
        }
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      this.notificationService.showSuccess(`Đã chọn ảnh: ${file.name}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  XOÁ MỀM
  // ═══════════════════════════════════════════════════════════
  onDelete(resource: ResourceTemplate): void {
    this.selectedDeleteResource.set(resource);
    this.openDialogConfirmDelete.set(true);
  }

  onCancelDeleteDialog(): void {
    this.selectedDeleteResource.set(null);
    this.openDialogConfirmDelete.set(false);
  }

  onConfirmDelete(): void {
    const resource = this.selectedDeleteResource();
    if (!resource) {
      this.notificationService.showError('Không tìm thấy tài nguyên cần xoá.');
      return;
    }

    this.isSubmittingDelete.set(true);

    this.resourceService.softDelete(resource.id).subscribe({
      next: () => {
        this.isSubmittingDelete.set(false);
        this.openDialogConfirmDelete.set(false);
        this.selectedDeleteResource.set(null);
        this.loadData();
        this.notificationService.showSuccess('Tài nguyên đã được xoá thành công.');
      },
      error: (err) => {
        this.isSubmittingDelete.set(false);
        console.error('Lỗi khi xoá tài nguyên', err);
        this.notificationService.showError('Không thể xoá tài nguyên.');
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  DANH SÁCH ĐÃ XOÁ + KHÔI PHỤC
  // ═══════════════════════════════════════════════════════════
  openDeletedDialog(): void {
    this.isLoading.set(true);
    this.resourceService.getAllDeleted().subscribe({
      next: (data) => {
        this.deletedList.set(data);
        this.openDeletedListDialog.set(true);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Lỗi khi tải danh sách xoá', err);
        this.notificationService.showError('Không thể tải danh sách đã xoá.');
      },
    });
  }

  onRestore(resource: ResourceTemplate): void {
    this.resourceService.restore(resource.id).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Đã khôi phục: ${resource.name}`);
        this.openDeletedDialog(); // Refresh deleted list
        this.loadData(); // Refresh active list
      },
      error: () => this.notificationService.showError('Lỗi khôi phục tài nguyên.'),
    });
  }
}
