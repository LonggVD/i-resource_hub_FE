import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiCheckbox } from '@taiga-ui/kit';
import { RoleService, RoleDetailResponse, PermissionResponse } from '../../../core/api/role.service';
import { NotificationService } from '../../../core/api/notification';

@Component({
  selector: 'app-user-authorization',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiIcon, TuiLoader, TuiCheckbox],
  templateUrl: './user-authorization.component.html',
  styleUrl: './user-authorization.component.css',
})
export class UserAuthorizationComponent implements OnInit {
  isLoading = signal(false);
  roles = signal<RoleDetailResponse[]>([]);
  allPermissions = signal<PermissionResponse[]>([]);
  
  selectedRole = signal<RoleDetailResponse | null>(null);
  selectedPermissionIds = signal<Set<string>>(new Set());
  isSaving = signal(false);

  // Nhóm quyền (Optional: có thể nhóm theo resourceCode)
  groupedPermissions = computed(() => {
    const perms = this.allPermissions();
    const groups = new Map<string, PermissionResponse[]>();
    
    for (const p of perms) {
      const resource = p.resourceCode || 'OTHER';
      if (!groups.has(resource)) {
        groups.set(resource, []);
      }
      groups.get(resource)!.push(p);
    }
    
    // Sort groups alphabetically
    const sortedArray = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sortedArray.map(([resource, permissions]) => ({ resource, permissions }));
  });

  constructor(
    private roleService: RoleService,
    private notifyService: NotificationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    // Load roles and permissions sequentially or parallel
    this.roleService.getAllPermissions().subscribe({
      next: (perms) => {
        this.allPermissions.set(perms);
        this.loadRoles();
      },
      error: () => {
        this.notifyService.showError('Không thể tải danh sách quyền');
        this.isLoading.set(false);
      }
    });
  }

  loadRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        
        // Cập nhật lại role đang chọn nếu có
        const currentSelected = this.selectedRole();
        if (currentSelected) {
          const updatedSelected = roles.find(r => r.id === currentSelected.id);
          if (updatedSelected) {
             this.selectRole(updatedSelected);
          }
        } else if (roles.length > 0) {
          this.selectRole(roles[0]); // Mặc định chọn role đầu tiên
        }
        
        this.isLoading.set(false);
      },
      error: () => {
        this.notifyService.showError('Không thể tải danh sách vai trò');
        this.isLoading.set(false);
      }
    });
  }

  selectRole(role: RoleDetailResponse) {
    this.selectedRole.set(role);
    const permIds = new Set(role.permissions?.map(p => p.id) || []);
    this.selectedPermissionIds.set(permIds);
  }

  hasPermission(permId: string): boolean {
    return this.selectedPermissionIds().has(permId);
  }

  togglePermission(permId: string) {
    const role = this.selectedRole();
    if (role?.isSystem && role.roleCode === 'ADMIN') {
        this.notifyService.showInfo('Không thể sửa quyền của Quản trị viên hệ thống.');
        return;
    }

    const currentSet = new Set(this.selectedPermissionIds());
    if (currentSet.has(permId)) {
      currentSet.delete(permId);
    } else {
      currentSet.add(permId);
    }
    this.selectedPermissionIds.set(currentSet);
  }

  toggleResourceGroup(resourcePermissions: PermissionResponse[]) {
    const role = this.selectedRole();
    if (role?.isSystem && role.roleCode === 'ADMIN') return;

    const currentSet = new Set(this.selectedPermissionIds());
    const allIds = resourcePermissions.map(p => p.id);
    
    // Check if all are currently selected
    const allSelected = allIds.every(id => currentSet.has(id));
    
    if (allSelected) {
        allIds.forEach(id => currentSet.delete(id));
    } else {
        allIds.forEach(id => currentSet.add(id));
    }
    
    this.selectedPermissionIds.set(currentSet);
  }

  isResourceGroupSelected(resourcePermissions: PermissionResponse[]): boolean {
     const currentSet = this.selectedPermissionIds();
     if (resourcePermissions.length === 0) return false;
     return resourcePermissions.every(p => currentSet.has(p.id));
  }

  isResourceGroupIndeterminate(resourcePermissions: PermissionResponse[]): boolean {
    const currentSet = this.selectedPermissionIds();
    if (resourcePermissions.length === 0) return false;
    const selectedCount = resourcePermissions.filter(p => currentSet.has(p.id)).length;
    return selectedCount > 0 && selectedCount < resourcePermissions.length;
  }

  savePermissions() {
    const role = this.selectedRole();
    if (!role) return;

    this.isSaving.set(true);
    const permissionIds = Array.from(this.selectedPermissionIds());
    
    this.roleService.updateRolePermissions(role.id, permissionIds).subscribe({
      next: (updatedRole) => {
        this.notifyService.showSuccess(`Đã cập nhật quyền cho vai trò ${role.roleName}`);
        
        // Update local roles list
        const roles = this.roles();
        const index = roles.findIndex(r => r.id === role.id);
        if (index !== -1) {
          roles[index] = updatedRole;
          this.roles.set([...roles]);
        }
        
        this.isSaving.set(false);
      },
      error: (err) => {
        this.notifyService.showError('Lỗi khi cập nhật quyền: ' + (err.error?.message || ''));
        this.isSaving.set(false);
      }
    });
  }
}
