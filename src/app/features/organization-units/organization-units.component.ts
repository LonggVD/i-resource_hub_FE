import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiButton, TuiIcon, TuiLabel, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiDialog } from '@taiga-ui/experimental';

import { TuiForm } from '@taiga-ui/layout';
import { OrganizationUnitService } from '../../core/api/organization-unit-service';
import {
  OrganizationUnitCreateRequest,
  OrganizationUnitResponse,
  OrganizationUnitUpdateRequest,
} from '../../core/models/organization-unit.model';
import { NotificationService } from '../../core/api/notification';

@Component({
  selector: 'app-organization-units',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    TreeTableModule,
    TuiLoader,
    TuiButton,
    TuiIcon,
    TuiTextfield,
    TuiDialog,
    TuiForm,
    TuiAutoFocus,
    TuiLabel,
  ],
  templateUrl: './organization-units.component.html',
  styleUrl: './organization-units.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationUnitsComponent implements OnInit {
  public treeNodes: TreeNode[] = [];
  public readonly isLoading = signal(false);
  public readonly selectedParentUnit = signal<OrganizationUnitResponse | null>(null);
  public readonly selectedDeleteUnit = signal<OrganizationUnitResponse | null>(null);
  public readonly isSubmittingAddDialog = signal(false);
  public readonly isSubmittingEditDialog = signal(false);
  public readonly isSubmittingDelete = signal(false);
  public readonly addUnitError = signal<string | null>(null);
  public readonly editUnitError = signal<string | null>(null);

  public readonly addUnitForm = new FormGroup({
    unitName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    unitType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
  });

  public readonly editUnitForm = new FormGroup({
    unitName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    unitType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
  });

  public readonly selectedParentLabel = computed(
    () => this.selectedParentUnit()?.unitName ?? 'Gốc',
  );

  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notificationService = inject(NotificationService);

  protected openAddDialog = false;
  protected openEditDialog = false;
  protected currentEditUnit: OrganizationUnitResponse | null = null;
  protected openDialogConfirmDelete = false;

  ngOnInit() {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.organizationUnitService.getAllUnits().subscribe({
      next: (units) => {
        this.treeNodes = this.buildTree(units);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Lỗi khi tải danh sách tổ chức', err);
        this.notificationService.showError('Không thể tải danh sách tổ chức.');
      },
    });
  }

  private buildTree(units: OrganizationUnitResponse[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    units.forEach((u) => {
      nodeMap.set(u.id, {
        data: u,
        children: [],
        expanded: true,
      });
    });

    units.forEach((u) => {
      const node = nodeMap.get(u.id);
      if (node) {
        if (u.parentId) {
          const parentNode = nodeMap.get(u.parentId);
          if (parentNode) {
            parentNode.children?.push(node);
          } else {
            rootNodes.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }

  onAddChild(rowData: OrganizationUnitResponse | null): void {
    this.selectedParentUnit.set(rowData);
    this.addUnitError.set(null);
    this.addUnitForm.reset();
    this.openAddDialog = true;
  }

  onCancelAddDialog(): void {
    this.selectedParentUnit.set(null);
    this.addUnitError.set(null);
    this.openAddDialog = false;
  }

  onSubmitAddUnit(): void {
    if (this.addUnitForm.invalid) {
      this.addUnitForm.markAllAsTouched();
      return;
    }

    const parent = this.selectedParentUnit();
    const formValue = this.addUnitForm.getRawValue();

    const payload: OrganizationUnitCreateRequest = {
      unitName: formValue.unitName.trim(),
      unitType: formValue.unitType.trim(),
      parentId: parent?.id,
    };

    this.isSubmittingAddDialog.set(true);
    this.addUnitError.set(null);

    this.organizationUnitService.createUnit(payload).subscribe({
      next: () => {
        this.isSubmittingAddDialog.set(false);
        this.openAddDialog = false;
        this.loadData();
        this.notificationService.showSuccess('Đơn vị tổ chức đã được thêm thành công.');
      },
      error: (err) => {
        this.isSubmittingAddDialog.set(false);
        this.addUnitError.set('Lỗi khi thêm đơn vị tổ chức.');
        this.notificationService.showError('Không thể thêm đơn vị tổ chức.');
      },
    });
  }

  onEdit(rowData: OrganizationUnitResponse): void {
    this.currentEditUnit = rowData;
    this.editUnitError.set(null);
    this.editUnitForm.setValue({
      unitName: rowData.unitName,
      unitType: rowData.unitType,
    });
    this.openEditDialog = true;
  }

  onCancelEditDialog(): void {
    this.currentEditUnit = null;
    this.editUnitError.set(null);
    this.openEditDialog = false;
  }

  onSubmitEditUnit(): void {
    if (!this.currentEditUnit) return;

    if (this.editUnitForm.invalid) {
      this.editUnitForm.markAllAsTouched();
      return;
    }

    const formValue = this.editUnitForm.getRawValue();
    const payload: OrganizationUnitUpdateRequest = {
      unitName: formValue.unitName.trim(),
      unitType: formValue.unitType.trim(),
    };

    this.isSubmittingEditDialog.set(true);
    this.editUnitError.set(null);

    this.organizationUnitService.updateUnit(this.currentEditUnit.id, payload).subscribe({
      next: () => {
        this.isSubmittingEditDialog.set(false);
        this.openEditDialog = false;
        this.loadData();
        this.notificationService.showSuccess('Cập nhật thành công.');
      },
      error: (err) => {
        this.isSubmittingEditDialog.set(false);
        this.editUnitError.set('Lỗi khi cập nhật.');
        this.notificationService.showError('Không thể cập nhật.');
      },
    });
  }

  onDelete(rowData: OrganizationUnitResponse): void {
    this.selectedDeleteUnit.set(rowData);
    this.openDialogConfirmDelete = true;
  }

  onCancelDeleteDialog(): void {
    this.selectedDeleteUnit.set(null);
    this.openDialogConfirmDelete = false;
  }

  onConfirmDelete(): void {
    const unit = this.selectedDeleteUnit();
    if (!unit) return;

    this.isSubmittingDelete.set(true);
    this.organizationUnitService.deleteUnit(unit.id).subscribe({
      next: () => {
        this.isSubmittingDelete.set(false);
        this.openDialogConfirmDelete = false;
        this.loadData();
        this.notificationService.showSuccess('Đã xoá thành công.');
      },
      error: (err) => {
        this.isSubmittingDelete.set(false);
        this.notificationService.showError('Lỗi khi xoá.');
      },
    });
  }
}
