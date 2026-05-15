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
      <p class="reject-intro">
        Bạn đang từ chối đơn mượn của sinh viên. Vui lòng nhập lý do cụ thể.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="reject-form">
        <div class="form-item">
          <label class="filter-label">Lý do từ chối *</label>
          <textarea
            formControlName="reason"
            class="input-field"
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
    :host { display: block; box-sizing: border-box; width: 100%; }
    :host *, :host *::before, :host *::after { box-sizing: border-box; }

    .reject-dialog {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-top: var(--space-2);
      min-width: 0;
      width: 100%;
    }
    .reject-intro {
      margin: 0;
      font-size: var(--font-size-base);
      color: var(--color-text-muted);
      line-height: 1.5;
    }
    .reject-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      min-width: 0;
    }
    .form-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 0;
    }
    .filter-label {
      display: block;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-strong);
    }
    .input-field {
      width: 100%;
      min-width: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-base);
      color: var(--color-text);
      font-family: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      resize: vertical;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .input-field:focus {
      outline: none;
      border-color: var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 0 0 3px var(--color-primary-soft-2);
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-2);
      flex-wrap: wrap;
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
