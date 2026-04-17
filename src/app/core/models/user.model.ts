export interface UserRole {
  id: string;
  roleCode: string;
  roleName: string;
  description?: string;
}

export interface UserUnit {
  id: string;
  unitName: string;
  unitType: string;
}

export interface UserResponse {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  studentCode?: string;
  creditScore: number;
  status: 'ACTIVE' | 'LOCKED' | string;
  lastLoginAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  unit?: UserUnit | null;
  roles: UserRole[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRequest {
  username: string;
  password?: string;
  fullName: string;
  email: string;
  phone?: string;
  studentCode?: string;
  unitId?: string;
  roleIds?: string[];
}

export interface CreditScoreRequest {
  amount: number;
  reason?: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface UserQueryParams {
  keyword?: string;
  unitId?: string;
  status?: string;
  roleId?: string;
  page?: number;
  size?: number;
  sort?: string;
}
