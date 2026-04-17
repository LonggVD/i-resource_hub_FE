import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PermissionResponse {
  id: string;
  permissionCode: string;
  resourceCode: string;
  actionCode: string;
  description: string;
}

export interface RoleDetailResponse {
  id: string;
  roleCode: string;
  roleName: string;
  description: string;
  isSystem: boolean;
  status: string;
  permissions: PermissionResponse[];
}

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly apiUrl = `${environment.apiUrl}/v1/roles`;

  constructor(private http: HttpClient) {}

  getAllRoles(): Observable<RoleDetailResponse[]> {
    return this.http.get<RoleDetailResponse[]>(this.apiUrl);
  }

  getAllPermissions(): Observable<PermissionResponse[]> {
    return this.http.get<PermissionResponse[]>(`${this.apiUrl}/permissions`);
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<RoleDetailResponse> {
    return this.http.put<RoleDetailResponse>(`${this.apiUrl}/${roleId}/permissions`, { permissionIds });
  }
}
