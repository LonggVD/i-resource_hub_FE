export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  id: string;
  username: string;
  email: string | null;
  roles: string[];
  unitId: string | null;
  dataScope: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string | null;
  accountType: 'STUDENT' | 'MANAGER';
  studentCode: string | null;
  unitId: string | null;
}
