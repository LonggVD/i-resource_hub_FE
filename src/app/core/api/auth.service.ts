import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ForgotPasswordRequest, LoginRequest, LoginResponse, ResetPasswordRequest, SignUpRequest, VerifyResetCodeRequest } from '../models/auth.model';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly currentUser = signal<LoginResponse | null>(this.getSavedUser());

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly username = computed(() => this.currentUser()?.username ?? '');

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.saveToken(response.token);
        this.saveUser(response);
        this.currentUser.set(response);
      }),
    );
  }

  register(payload: SignUpRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/signup`, payload, {
      responseType: 'text',
    });
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/forgot-password`, payload, {
      responseType: 'text',
    });
  }

  verifyResetCode(payload: VerifyResetCodeRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/verify-reset-code`, payload, {
      responseType: 'text',
    });
  }

  resetPassword(payload: ResetPasswordRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/reset-password`, payload, {
      responseType: 'text',
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  private saveUser(user: LoginResponse): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private getSavedUser(): LoginResponse | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }
}
