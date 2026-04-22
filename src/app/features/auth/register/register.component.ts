import { Component, OnInit, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiIcon, TuiLabel, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { AuthService } from '../../../core/api/auth.service';
import { SignUpRequest } from '../../../core/models/auth.model';
import { LoginFormLeft } from '../../../shared/components/login-form-left/login-form-left.component';
import { OrganizationUnitService } from '../../../core/api/organization-unit-service';
import { OrganizationUnitResponse } from '../../../core/models/organization-unit.model';
import { IrhSelect, IrhSelectOption } from '../../../shared/components/irh-select/irh-select.component';

@Component({
  selector: 'app-register',
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
    IrhSelect,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    private readonly unitService: OrganizationUnitService,
  ) {}

  ngOnInit(): void {
    this.loadUnits();
  }

  private loadUnits(): void {
    this.unitService.getAllUnits().subscribe({
      next: (units) => this.units.set(units),
      error: () => this.errorMessage.set('Không thể tải danh sách đơn vị.'),
    });
  }

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly units = signal<OrganizationUnitResponse[]>([]);

  protected readonly unitOptions = computed<IrhSelectOption[]>(() =>
    this.units().map((u) => ({
      label: `${u.unitName} (${u.unitType})`,
      value: u.id,
    })),
  );

  protected readonly registerForm = new FormGroup({
    accountType: new FormControl<'STUDENT' | 'MANAGER'>('STUDENT', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', {
      nonNullable: true,
    }),
    studentCode: new FormControl('', {
      nonNullable: true,
    }),
    unitId: new FormControl('', {
      nonNullable: true,
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly passwordMismatch = computed(() => {
    const password = this.registerForm.controls.password.value;
    const confirm = this.registerForm.controls.confirmPassword.value;
    return !!confirm && password !== confirm;
  });

  private readonly accountTypeChanges = toSignal(this.registerForm.controls.accountType.valueChanges, {
    initialValue: this.registerForm.controls.accountType.value,
  });

  protected readonly isStudentAccount = computed(() => this.accountTypeChanges() === 'STUDENT');

  protected onSubmit(): void {
    if (this.registerForm.invalid || this.passwordMismatch()) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set('Vui long nhap day du va hop le thong tin dang ky.');
      return;
    }

    const { accountType, studentCode, unitId } = this.registerForm.getRawValue();

    if (accountType === 'STUDENT' && !studentCode.trim()) {
      this.errorMessage.set('Sinh vien bat buoc phai co ma sinh vien.');
      return;
    }

    if (accountType === 'MANAGER' && !unitId.trim()) {
      this.errorMessage.set('Can bo quan ly bat buoc phai chon khoa/phong ban.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValue = this.registerForm.getRawValue();
    const payload: SignUpRequest = {
      username: formValue.username.trim(),
      password: formValue.password,
      fullName: formValue.fullName.trim(),
      email: formValue.email.trim(),
      phone: formValue.phone.trim() || null,
      accountType: formValue.accountType,
      studentCode:
        formValue.accountType === 'STUDENT' ? formValue.studentCode.trim() || null : null,
      unitId: formValue.accountType === 'MANAGER' ? formValue.unitId.trim() || null : null,
    };

    this.authService.register(payload).subscribe({
      next: (message) => {
        this.isLoading.set(false);
        this.successMessage.set(message || 'Dang ky thanh cong.');
        this.registerForm.reset({
          accountType: 'STUDENT',
          fullName: '',
          username: '',
          email: '',
          phone: '',
          studentCode: '',
          unitId: '',
          password: '',
          confirmPassword: '',
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        const backendMessage =
          typeof err?.error === 'string' ? err.error : (err?.error?.message as string | undefined);
        this.errorMessage.set(backendMessage || 'Dang ky that bai. Vui long thu lai.');
      },
    });
  }
}
