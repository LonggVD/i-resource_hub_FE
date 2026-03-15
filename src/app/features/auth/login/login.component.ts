import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiButton, TuiIcon, TuiLabel, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { AuthService } from '../../../core/services/auth.service';
import { LoginFormLeft } from '../../../shared/components/login-form-left/login-form-left.component';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { username, password } = this.loginForm.getRawValue();

    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error.message);
      },
    });
  }
}
