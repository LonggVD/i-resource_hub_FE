import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

@Component({
  selector: 'app-cancel-reason-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TuiButton,
  ],
  template: `
    <div class="cancel-dialog">
      <p class="tui-text_body-m">Vui lòng cung cấp lý do hủy đơn mượn này để hệ thống ghi nhận.</p>
      
      <form [formGroup]="form" (ngSubmit)="submit()" class="cancel-form">
        <div class="form-item">
          <label class="filter-label">Lý do hủy *</label>
          <textarea
            formControlName="reason"
            class="input-field py-3"
            rows="4"
            placeholder="Nhập lý do..."
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
            Bỏ qua
          </button>
          <button
            tuiButton
            type="submit"
            size="m"
            [disabled]="form.invalid"
          >
            Xác nhận hủy
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .cancel-dialog {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .cancel-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelReasonDialogComponent {
  private readonly context = inject<TuiDialogContext<string | null>>(POLYMORPHEUS_CONTEXT);

  readonly form = new FormGroup({
    reason: new FormControl('', [Validators.required, Validators.maxLength(255)]),
  });

  submit() {
    if (this.form.valid) {
      this.context.completeWith(this.form.value.reason || '');
    }
  }

  cancel() {
    this.context.completeWith(null);
  }
}
