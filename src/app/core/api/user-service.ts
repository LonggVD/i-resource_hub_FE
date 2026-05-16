import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreditScoreRequest,
  PagedResponse,
  UserQueryParams,
  UserRequest,
  UserResponse,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/v1/users`;

  constructor(private http: HttpClient) {}

  getUsers(params: UserQueryParams = {}): Observable<PagedResponse<UserResponse>> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return this.http.get<PagedResponse<UserResponse>>(this.apiUrl, { params: httpParams });
  }

  getStudents(params: { keyword?: string; size?: number; page?: number } = {}): Observable<PagedResponse<UserResponse>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<PagedResponse<UserResponse>>(`${this.apiUrl}/students`, { params: httpParams });
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  getMyProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/me`);
  }

  createUser(payload: UserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.apiUrl, payload);
  }

  updateUser(id: string, payload: UserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/${id}`, payload);
  }

  toggleStatus(id: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  approveUser(id: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectUser(id: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.apiUrl}/${id}/reject`, {});
  }

  resetPassword(id: string): Observable<{ newPassword: string }> {
    return this.http.post<{ newPassword: string }>(`${this.apiUrl}/${id}/reset-password`, {});
  }

  updateCreditScore(id: string, payload: CreditScoreRequest): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.apiUrl}/${id}/credit-score`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
