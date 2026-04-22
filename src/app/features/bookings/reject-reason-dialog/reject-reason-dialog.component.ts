import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

@Component({
  selector: 'app-reject-reason-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TuiButton],
  template: `
    <div class="reject-dialog">
      <p class="tui-text_body-m">Bạn đang từ chối đơn mượn của sinh viên. Vui lòng nhập lý do cụ thể.</p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="reject-form">
        <div class="form-item">
          <label class="filter-label">Lý do từ chối *</label>
          <textarea
            formControlName="reason"
            class="input-field py-3"
            rows="4"
            placeholder="Ví dụ: Thiết bị đang trong quá trình bảo trì đột xuất..."
          ></textarea>
        </div>

        <div class="dialog-footer">
          <button
            tuiButton
            type="button"
            appearance="secondary"
            size="m"
            (click)="cancel()"
          >
            Hủy
          </button>
          <button
            tuiButton
            type="submit"
            size="m"
            appearance="destructive"
            [disabled]="form.invalid"
          >
            Xác nhận Từ chối
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .reject-dialog {
      padding-top: 0.5rem;
    }
    .reject-form {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .filter-label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #64748b;
    }
    .input-field {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding-left: 1rem;
      padding-right: 1rem;
      font-size: 0.9375rem;
      color: #1e293b;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .input-field:focus {
      outline: none;
      border-color: #6366f1;
      background: #fff;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectReasonDialogComponent {
  private readonly context = inject<TuiDialogContext<string | null, void>>(POLYMORPHEUS_CONTEXT);

  readonly form = new FormGroup({
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
  });

  submit() {
    if (this.form.valid) {
      this.context.completeWith(this.form.controls.reason.value);
    }
  }

  cancel() {
    this.context.completeWith(null);
  }
}
