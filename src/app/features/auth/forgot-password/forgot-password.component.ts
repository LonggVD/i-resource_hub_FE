import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiButton, TuiIcon, TuiLabel, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { AuthService } from '../../../core/api/auth.service';
import { LoginFormLeft } from '../../../shared/components/login-form-left/login-form-left.component';
import { NotificationService } from '../../../core/api/notification';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TuiButton,
    TuiTextfield,
    TuiLabel,
    TuiPassword,
    TuiIcon,
    TuiLoader,
    LoginFormLeft,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  protected readonly step = signal(1); // 1: Email, 2: Code, 3: New Password
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly emailForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly codeForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
    }),
  });

  protected readonly resetForm = new FormGroup({
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  protected onSendEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.forgotPassword(this.emailForm.getRawValue()).subscribe({
      next: (msg) => {
        this.isLoading.set(false);
        this.notificationService.showSuccess(msg);
        this.step.set(2);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error || 'Đã có lỗi xảy ra!');
      },
    });
  }

  protected onVerifyCode(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const payload = {
      email: this.emailForm.controls.email.value,
      code: this.codeForm.controls.code.value,
    };

    this.authService.verifyResetCode(payload).subscribe({
      next: (msg) => {
        this.isLoading.set(false);
        this.notificationService.showSuccess(msg);
        this.step.set(3);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error || 'Mã xác nhận không chính xác!');
      },
    });
  }

  protected onResetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (this.resetForm.controls.newPassword.value !== this.resetForm.controls.confirmPassword.value) {
      this.errorMessage.set('Mật khẩu xác nhận không khớp!');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const payload = {
      email: this.emailForm.controls.email.value,
      code: this.codeForm.controls.code.value,
      newPassword: this.resetForm.controls.newPassword.value,
    };

    this.authService.resetPassword(payload).subscribe({
      next: (msg) => {
        this.isLoading.set(false);
        this.notificationService.showSuccess(msg);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error || 'Đặt lại mật khẩu thất bại!');
      },
    });
  }
}
