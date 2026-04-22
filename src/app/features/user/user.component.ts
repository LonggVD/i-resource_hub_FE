import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { TuiButton, TuiIcon, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiDialog } from '@taiga-ui/experimental';
import { TuiForm } from '@taiga-ui/layout';

import { IrhAggridComponent } from '../../shared/components/irh-aggrid/irh-aggrid.component';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../shared/components/irh-select/irh-select.component';
import {
  IrhMultiSelect,
  IrhMultiSelectOption,
} from '../../shared/components/irh-multi-select/irh-multi-select.component';

import { NotificationService } from '../../core/api/notification';
import { UserService } from '../../core/api/user-service';
import { OrganizationUnitService } from '../../core/api/organization-unit-service';
import { OrganizationUnitResponse } from '../../core/models/organization-unit.model';
import { UserRequest, UserResponse } from '../../core/models/user.model';

import { UserActionRendererComponent } from './user-action-renderer.component';
import { UserStatusBadgeRendererComponent } from './user-status-badge-renderer.component';
import { UserAuthorizationComponent } from './user-authorization/user-authorization.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiTextfield,
    TuiDialog,
    TuiForm,
    IrhAggridComponent,
    IrhSelect,
    IrhMultiSelect,
    UserAuthorizationComponent
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly unitService = inject(OrganizationUnitService);
  private readonly notification = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly activeTab = signal<'users' | 'roles'>('users');

  readonly isLoading = signal(false);
  readonly users = signal<UserResponse[]>([]);
  readonly units = signal<OrganizationUnitResponse[]>([]);

  readonly keyword = signal('');
  readonly statusFilter = signal<string[]>([]);
  readonly unitFilter = signal<string[]>([]);
  readonly roleFilter = signal<string[]>([]);

  readonly roleOptions = signal<IrhMultiSelectOption[]>([]);

  readonly selectedDeleteUser = signal<UserResponse | null>(null);
  readonly selectedCreditUser = signal<UserResponse | null>(null);
  readonly isEditMode = signal(false);
  readonly currentUserId = signal<string | null>(null);

  protected openFormDialog = false;
  protected openDeleteDialog = false;
  protected openCreditDialog = false;

  readonly userForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true }),
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true }),
    studentCode: new FormControl('', { nonNullable: true }),
    unitId: new FormControl('', { nonNullable: true }),
    roleIds: new FormControl<string[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly creditForm = new FormGroup({
    amount: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required] }),
    reason: new FormControl('', { nonNullable: true }),
  });

  readonly statusOptions: IrhMultiSelectOption[] = [
    { label: 'Hoạt động', value: 'ACTIVE' },
    { label: 'Chờ duyệt', value: 'PENDING' },
    { label: 'Đã khoá', value: 'LOCKED' },
    { label: 'Bị từ chối', value: 'REJECTED' },
  ];

  readonly unitFilterOptions = computed<IrhMultiSelectOption[]>(() =>
    this.units().map((u) => ({ label: `${u.unitName} (${u.unitType})`, value: u.id })),
  );

  readonly roleFilterOptions = computed<IrhMultiSelectOption[]>(() =>
    this.roleOptions().map((r) => ({ label: r.label, value: r.value })),
  );

  readonly unitFormOptions = computed<IrhSelectOption[]>(() => [
    { label: '-- Không chọn đơn vị --', value: '' },
    ...this.units().map((u) => ({ label: `${u.unitName} (${u.unitType})`, value: u.id })),
  ]);

  readonly filteredUsers = computed(() => {
    const selectedStatuses = this.statusFilter();
    const selectedUnits = this.unitFilter();
    const selectedRoles = this.roleFilter();

    return this.users().filter((user) => {
      const passStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(user.status || '');

      const unitId = user.unit?.id || '';
      const passUnit = selectedUnits.length === 0 || selectedUnits.includes(unitId);

      const userRoleIds = (user.roles || []).map((r) => r.id);
      const passRole =
        selectedRoles.length === 0 || selectedRoles.some((roleId) => userRoleIds.includes(roleId));

      return passStatus && passUnit && passRole;
    });
  });

  readonly colDefs: ColDef[] = [
    {
      headerName: 'Tài khoản',
      field: 'username',
      flex: 1,
      minWidth: 130,
      cellClass: 'font-bold text-gray-800',
    },
    {
      headerName: 'Họ tên',
      field: 'fullName',
      flex: 1.2,
      minWidth: 160,
    },
    {
      headerName: 'Email',
      field: 'email',
      flex: 1.4,
      minWidth: 180,
    },
    {
      headerName: 'Đơn vị',
      field: 'unit.unitName',
      flex: 1.1,
      minWidth: 150,
      valueGetter: (params) => params.data?.unit?.unitName || '---',
    },
    {
      headerName: 'Vai trò',
      field: 'roles',
      flex: 1.2,
      minWidth: 150,
      valueGetter: (params) =>
        (params.data?.roles || []).map((r: any) => r.roleName || r.roleCode).join(', '),
    },
    {
      headerName: 'Điểm',
      field: 'creditScore',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      cellClass: 'font-bold text-indigo-700 text-center',
    },
    {
      headerName: 'Trạng thái',
      field: 'status',
      width: 130,
      minWidth: 130,
      cellRenderer: UserStatusBadgeRendererComponent,
    },
    {
      headerName: 'Hành động',
      pinned: 'right',
      width: 190,
      minWidth: 190,
      sortable: false,
      filter: false,
      floatingFilter: false,
      suppressHeaderFilterButton: true,
      cellRenderer: UserActionRendererComponent,
      cellRendererParams: {
        onApprove: (row: UserResponse) => this.onApprove(row),
        onReject: (row: UserResponse) => this.onReject(row),
        onEdit: (row: UserResponse) => this.onEdit(row),
        onAdjustCredit: (row: UserResponse) => this.openCreditScoreDialog(row),
        onResetPassword: (row: UserResponse) => this.onResetPassword(row),
        onToggleStatus: (row: UserResponse) => this.onToggleStatus(row),
        onDelete: (row: UserResponse) => this.onDelete(row),
      },
    },
  ];

  ngOnInit(): void {
    this.loadUnits();
    this.loadUsers();
  }

  loadUnits(): void {
    this.unitService.getAllUnits().subscribe({
      next: (units) => {
        this.units.set(units);
        this.cdr.detectChanges();
      },
      error: () => this.notification.showError('Không thể tải danh sách đơn vị.'),
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService
      .getUsers({
        keyword: this.keyword().trim(),
        page: 0,
        size: 200,
        sort: 'createdAt,desc',
      })
      .subscribe({
        next: (res) => {
          const rows = res.content || [];
          this.users.set(rows);
          this.refreshRoleOptions(rows);
          this.isLoading.set(false);
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading.set(false);
          this.notification.showError('Không thể tải danh sách người dùng.');
        },
      });
  }

  private refreshRoleOptions(rows: UserResponse[]): void {
    const map = new Map<string, IrhMultiSelectOption>();
    rows.forEach((u) => {
      (u.roles || []).forEach((r) => {
        if (!map.has(r.id)) {
          map.set(r.id, {
            label: r.roleName || r.roleCode,
            value: r.id,
          });
        }
      });
    });
    this.roleOptions.set(Array.from(map.values()));
  }

  onApplyFilters(): void {
    this.loadUsers();
  }

  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.currentUserId.set(null);
    this.userForm.reset({
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      studentCode: '',
      unitId: '',
      roleIds: [],
    });
    this.openFormDialog = true;
  }

  onEdit(user: UserResponse): void {
    this.isEditMode.set(true);
    this.currentUserId.set(user.id);

    const existingRoles = (user.roles || []).map((r) => ({
      label: r.roleName || r.roleCode,
      value: r.id,
    }));

    if (existingRoles.length > 0) {
      const known = new Map(this.roleOptions().map((r) => [r.value, r]));
      existingRoles.forEach((r) => {
        if (!known.has(r.value)) {
          known.set(r.value, r);
        }
      });
      this.roleOptions.set(Array.from(known.values()));
    }

    this.userForm.reset({
      username: user.username,
      password: '',
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      studentCode: user.studentCode || '',
      unitId: user.unit?.id || '',
      roleIds: (user.roles || []).map((r) => r.id),
    });

    this.openFormDialog = true;
  }

  onSubmitUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.notification.showError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }

    const raw = this.userForm.getRawValue();

    if (!this.isEditMode() && !raw.password?.trim()) {
      this.notification.showError('Mật khẩu là bắt buộc khi tạo mới người dùng.');
      return;
    }

    const payload: UserRequest = {
      username: raw.username.trim(),
      fullName: raw.fullName.trim(),
      email: raw.email.trim(),
      phone: raw.phone?.trim() || undefined,
      studentCode: raw.studentCode?.trim() || undefined,
      unitId: raw.unitId || undefined,
      roleIds: raw.roleIds,
      ...(this.isEditMode() ? {} : { password: raw.password?.trim() }),
    };

    if (this.isEditMode() && this.currentUserId()) {
      this.userService.updateUser(this.currentUserId()!, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Đã cập nhật người dùng thành công.');
          this.openFormDialog = false;
          this.loadUsers();
        },
        error: (err) => {
          const msg = err?.error?.message || 'Không thể cập nhật người dùng.';
          this.notification.showError(msg);
        },
      });
      return;
    }

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.notification.showSuccess('Đã tạo người dùng thành công.');
        this.openFormDialog = false;
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể tạo người dùng.';
        this.notification.showError(msg);
      },
    });
  }

  onApprove(user: UserResponse): void {
    this.userService.approveUser(user.id).subscribe({
      next: () => {
        this.notification.showSuccess(`Đã phê duyệt tài khoản ${user.username}.`);
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể phê duyệt người dùng.';
        this.notification.showError(msg);
      },
    });
  }

  onReject(user: UserResponse): void {
    this.userService.rejectUser(user.id).subscribe({
      next: () => {
        this.notification.showSuccess(`Đã từ chối tài khoản ${user.username}.`);
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể từ chối người dùng.';
        this.notification.showError(msg);
      },
    });
  }

  onToggleStatus(user: UserResponse): void {
    this.userService.toggleStatus(user.id).subscribe({
      next: () => {
        this.notification.showSuccess('Đã cập nhật trạng thái người dùng.');
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể cập nhật trạng thái.';
        this.notification.showError(msg);
      },
    });
  }

  onResetPassword(user: UserResponse): void {
    this.userService.resetPassword(user.id).subscribe({
      next: (res) => {
        this.notification.showInfo(`Mật khẩu mới của ${user.username}: ${res.newPassword}`);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể reset mật khẩu.';
        this.notification.showError(msg);
      },
    });
  }

  onDelete(user: UserResponse): void {
    this.selectedDeleteUser.set(user);
    this.openDeleteDialog = true;
  }

  onConfirmDelete(): void {
    const user = this.selectedDeleteUser();
    if (!user) return;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.notification.showSuccess('Đã xoá người dùng thành công.');
        this.openDeleteDialog = false;
        this.selectedDeleteUser.set(null);
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể xoá người dùng.';
        this.notification.showError(msg);
      },
    });
  }

  openCreditScoreDialog(user: UserResponse): void {
    this.selectedCreditUser.set(user);
    this.creditForm.reset({ amount: 0, reason: '' });
    this.openCreditDialog = true;
  }

  onSubmitCreditScore(): void {
    const user = this.selectedCreditUser();
    if (!user) return;

    const amount = Number(this.creditForm.controls.amount.value);
    if (!Number.isFinite(amount) || amount === 0) {
      this.notification.showError('Vui lòng nhập số điểm cộng/trừ khác 0.');
      return;
    }

    const reason = this.creditForm.controls.reason.value?.trim() || undefined;

    this.userService.updateCreditScore(user.id, { amount, reason }).subscribe({
      next: () => {
        this.notification.showSuccess('Đã cập nhật điểm tín nhiệm.');
        this.openCreditDialog = false;
        this.selectedCreditUser.set(null);
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể cập nhật điểm tín nhiệm.';
        this.notification.showError(msg);
      },
    });
  }
}
