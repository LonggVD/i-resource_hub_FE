import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiButton, TuiIcon, TuiLabel, TuiLoader, TuiTextfield, TuiTitle } from '@taiga-ui/core';
import { TuiDialog } from '@taiga-ui/experimental';
import { TuiFloatingContainer } from '@taiga-ui/kit';
import { TuiForm, TuiHeader } from '@taiga-ui/layout';
import { TreeTableModule } from 'primeng/treetable';
import { TreeNode } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../core/api/category-service';
import { Category, CategoryCreateRequest } from '../../core/models/category.model';
import { NotificationService } from '../../core/api/notification';
import { catchError } from 'rxjs';
import { IrhAggridComponent } from '../../shared/components/irh-aggrid/irh-aggrid.component';
import { ColDef } from 'ag-grid-community';
import { ActionRendererComponent } from './action-renderer';

@Component({
  selector: 'app-categories',
  imports: [
    TreeTableModule,
    TuiLoader,
    TuiButton,
    TuiIcon,
    CommonModule,
    DatePipe,
    TuiTextfield,
    TuiDialog,
    TuiForm,
    TuiAutoFocus,
    TuiLabel,
    TuiTitle,
    ReactiveFormsModule,
    IrhAggridComponent,
    TuiHeader,
    TuiFloatingContainer,
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent implements OnInit {
  public treeNodes: TreeNode[] = [];
  public readonly isLoading = signal(false);
  public readonly selectedParentCategory = signal<Category | null>(null);
  public readonly selectedDeleteCategory = signal<Category | null>(null);
  public readonly isSubmittingAddDialog = signal(false);
  public readonly isSubmittingEditDialog = signal(false);
  public readonly isSubmittingDelete = signal(false);
  public readonly addCategoryError = signal<string | null>(null);
  public readonly editCategoryError = signal<string | null>(null);
  public readonly listDelete = signal<Category[]>([]);

  public readonly addChildForm = new FormGroup({
    categoryName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });
  public readonly editForm = new FormGroup({
    categoryName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  public readonly selectedParentLabel = computed(
    () => this.selectedParentCategory()?.categoryName ?? '',
  );

  public cols = [
    { field: 'categoryName', header: 'Tên danh mục', width: '25%' },
    { field: 'description', header: 'Mô tả', width: '30%' },
    { field: 'createdAt', header: 'Ngày tạo', width: '15%' },
    { field: 'updatedAt', header: 'Cập nhật', width: '15%' },
    { field: 'actions', header: 'Hành động', width: '15%' },
  ];

  private readonly categoryService = inject(CategoryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  protected openAddDialog = false;
  protected openEditDialog = false;
  protected currentEditCategory: Category | null = null;
  protected openDialogConfirmDelete = false;

  onAddChild(rowData: Category | null): void {
    this.selectedParentCategory.set(rowData);
    this.addCategoryError.set(null);
    this.addChildForm.reset();
    this.openAddDialog = true;
  }

  onCancelAddDialog(): void {
    this.selectedParentCategory.set(null);
    this.addCategoryError.set(null);
    this.openAddDialog = false;
  }

  onSubmitAddChild(): void {
    if (this.addChildForm.invalid) {
      this.addChildForm.markAllAsTouched();
      return;
    }

    const parent = this.selectedParentCategory();
    const formValue = this.addChildForm.getRawValue();

    // Tạo payload cơ bản (Tên và Mô tả)
    const payload: CategoryCreateRequest = {
      categoryName: formValue.categoryName.trim(),
      description: formValue.description.trim(),
    };

    if (parent) {
      payload.parentId = parent.id;
    }

    this.isSubmittingAddDialog.set(true);
    this.addCategoryError.set(null);

    this.categoryService.createCategory(payload).subscribe({
      next: () => {
        this.isSubmittingAddDialog.set(false);
        this.selectedParentCategory.set(null);
        this.openAddDialog = false;
        this.loadData();
        const msg = parent
          ? 'Danh mục con đã được thêm thành công.'
          : 'Danh mục gốc đã được thêm thành công.';
        this.notificationService.showSuccess(msg);
      },
      error: (err) => {
        this.isSubmittingAddDialog.set(false);
        console.error('Lỗi khi thêm danh mục', err);
        this.addCategoryError.set('Không thể thêm danh mục. Vui lòng thử lại.');
        this.notificationService.showError('Không thể thêm danh mục. Vui lòng thử lại.');
      },
    });
  }

  onEdit(rowData: Category): void {
    this.currentEditCategory = rowData;
    this.editCategoryError.set(null);
    this.editForm.setValue({
      categoryName: rowData.categoryName,
      description: rowData.description ?? '',
    });
    this.openEditDialog = true;
  }

  onCancelEditDialog(): void {
    this.currentEditCategory = null;
    this.editCategoryError.set(null);
    this.openEditDialog = false;
  }

  onSubmitEditCategory(): void {
    const category = this.currentEditCategory;
    if (!category) {
      this.editCategoryError.set('Không tìm thấy danh mục cần sửa. Vui lòng thử lại.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formValue = this.editForm.getRawValue();

    const payload: CategoryCreateRequest = {
      parentId: category.parentId ?? undefined,
      categoryName: formValue.categoryName.trim(),
      description: formValue.description.trim(),
    };

    this.isSubmittingEditDialog.set(true);
    this.editCategoryError.set(null);

    this.categoryService.updateCategory(category.id, payload).subscribe({
      next: () => {
        this.isSubmittingEditDialog.set(false);
        this.openEditDialog = false;
        this.currentEditCategory = null;
        this.loadData();
        this.notificationService.showSuccess('Danh mục đã được cập nhật thành công .');
      },
      error: (err) => {
        this.isSubmittingEditDialog.set(false);
        console.error('Lỗi khi cập nhật danh mục', err);
        this.editCategoryError.set('Không thể cập nhật danh mục. Vui lòng thử lại.');
        this.notificationService.showError('Không thể cập nhật danh mục. Vui lòng thử lại.');
      },
    });
  }

  onDelete(rowData: Category): void {
    this.selectedDeleteCategory.set(rowData);
    this.openDialogConfirmDelete = true;
  }
  onCancelDeleteDialog(): void {
    this.selectedDeleteCategory.set(null);
    this.openDialogConfirmDelete = false;
  }
  onConfirmDeleteCategory(): void {
    const category = this.selectedDeleteCategory();
    if (!category) {
      this.notificationService.showError('Không tìm thấy danh mục cần xoá.');
      return;
    }

    this.isSubmittingDelete.set(true);

    // Giả định service của bạn có hàm deleteCategory truyền vào ID
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.isSubmittingDelete.set(false);
        this.openDialogConfirmDelete = false;
        this.selectedDeleteCategory.set(null);
        this.loadData();
        this.notificationService.showSuccess('Danh mục đã được xoá thành công.');
      },
      error: (err) => {
        this.isSubmittingDelete.set(false);
        console.error('Lỗi khi xoá danh mục', err);
        this.notificationService.showError('Không thể xoá danh mục. Vui lòng thử lại.');
      },
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.categoryService.getAllCategories().subscribe({
      next: (flatCategories) => {
        this.treeNodes = this.buildPrimeNgTree(flatCategories);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Lỗi khi tải danh mục', err);
        this.notificationService.showError('Không thể tải danh mục. Vui lòng thử lại.');
      },
    });
  }

  // Hàm nhét con vào bụng cha chuẩn form PrimeNG
  private buildPrimeNgTree(flatCategories: Category[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Bước 1: Bọc mỗi Category vào một cái TreeNode
    flatCategories.forEach((cat) => {
      nodeMap.set(cat.id.toString(), {
        data: cat,
        children: [],
        expanded: true,
      });
    });

    // Bước 2: Nối cha - con
    flatCategories.forEach((cat) => {
      const node = nodeMap.get(cat.id.toString());
      if (node) {
        if (cat.parentId) {
          const parentNode = nodeMap.get(cat.parentId.toString());
          if (parentNode && parentNode.children) {
            parentNode.children.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }

  //danh sách bị xoá , cấu hình bảng danh sách angulr
  protected openDeletedListDialog = false;

  // DEFAULT CỘT CHO AG GRID
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: true,
    flex: 1,
  };

  // CẤU HÌNH CỘT CHO AG GRID
  colDefs: ColDef[] = [
    {
      headerName: 'Tên danh mục',
      field: 'categoryName',
      flex: 2,
      minWidth: 180,
    },
    {
      headerName: 'Danh mục cha',
      valueGetter: (params) => params.data?.parentName || '—',
      flex: 1.5,
      minWidth: 140,
    },
    {
      headerName: 'Mô tả',
      field: 'description',
      flex: 2.5,
      minWidth: 200,
    },
    {
      headerName: 'Ngày xoá',
      field: 'updatedAt',
      flex: 1.5,
      minWidth: 160,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return (
          date.toLocaleDateString('vi-VN') +
          ' ' +
          date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        );
      },
    },
    {
      headerName: 'Hạn chót',
      flex: 1,
      minWidth: 120,
      filter: false,
      sortable: false,
      floatingFilter: false,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      cellRenderer: (params: any) => {
        const days = this.getRemainingDays(params.data?.updatedAt);
        const isUrgent = days <= 5;
        const bg = isUrgent ? '#fef2f2' : days <= 30 ? '#fffbeb' : '#f0fdf4';
        const text = isUrgent ? '#dc2626' : days <= 30 ? '#d97706' : '#16a34a';
        const border = isUrgent ? '#fca5a5' : days <= 30 ? '#fcd34d' : '#86efac';

        return `
          <div style="
            background: ${bg};
            color: ${text};
            border: 1px solid ${border};
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;"> ${days} ngày
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
      cellRenderer: ActionRendererComponent,
      cellRendererParams: {
        onRestore: (cat: Category) => this.onRestoreCategory(cat),
        onDelete: (cat: Category) => this.onHardDeleteCategory(cat),
      },
    },
  ];

  // 2. Logic tính ngày còn lại
  getRemainingDays(updatedAt: string | Date | undefined): number {
    if (!updatedAt) return 0;
    const updatedDate = new Date(updatedAt);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - updatedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 60 - diffDays;
    return remaining > 0 ? remaining : 0;
  }

  // 3. Hàm gọi API Khôi phục
  onRestoreCategory(cat: Category): void {
    this.categoryService.restoreCategory(cat.id).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Đã khôi phục: ${cat.categoryName}`);
        this.openListDeleteDialog();
        this.loadData();
      },
      error: (err) => this.notificationService.showError('Lỗi khôi phục.'),
    });
  }

  // 4. Hàm gọi API Xóa cứng
  onHardDeleteCategory(cat: Category): void {
    if (confirm(`Hành động này không thể hoàn tác. Xóa vĩnh viễn [${cat.categoryName}]?`)) {
      // GỌI API DELETE Ở ĐÂY (Nhớ viết thêm API ở Backend nhé bác)
      console.log('Đã bấm xóa cứng ID:', cat.id);
    }
  }

  // 1. Sửa lại hàm mở Dialog
  openListDeleteDialog() {
    this.isLoading.set(true);
    this.categoryService.getDeletedCategories().subscribe({
      next: (deletedCategories) => {
        this.listDelete.set(deletedCategories);
        this.openDeletedListDialog = true; // Mở popup
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Lỗi khi tải danh sách xoá', err);
        this.notificationService.showError('Không thể tải danh sách xoá. Vui lòng thử lại.');
      },
    });
  }
}
