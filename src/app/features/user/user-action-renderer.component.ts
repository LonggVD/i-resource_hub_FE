import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-user-action-renderer',
  standalone: true,
  imports: [TuiButton, TuiIcon],
  template: `
    <div class="action-buttons">
      @if (params.data?.status === 'PENDING') {
        <button
          tuiIconButton
          class="btn-action btn-action--success"
          size="s"
          title="Phê duyệt"
          (click)="onApprove()"
        >
          <tui-icon icon="@tui.circle-check" />
        </button>
        <button
          tuiIconButton
          class="btn-action btn-action--warning"
          size="s"
          title="Từ chối"
          (click)="onReject()"
        >
          <tui-icon icon="@tui.circle-off" />
        </button>
      }
      <button tuiIconButton class="btn-action" size="s" title="Sửa" (click)="onEdit()">
        <tui-icon icon="@tui.pencil" />
      </button>
      <button
        tuiIconButton
        class="btn-action"
        size="s"
        title="Điểm tín nhiệm"
        (click)="onAdjustCredit()"
      >
        <tui-icon icon="@tui.badge-plus" />
      </button>
      <button
        tuiIconButton
        class="btn-action"
        size="s"
        title="Reset mật khẩu"
        (click)="onResetPassword()"
      >
        <tui-icon icon="@tui.key-round" />
      </button>
      <button
        tuiIconButton
        class="btn-action"
        size="s"
        title="Khoá / Mở khoá"
        (click)="onToggleStatus()"
      >
        <tui-icon icon="@tui.lock" />
      </button>
      <button
        tuiIconButton
        class="btn-action btn-action--danger"
        size="s"
        title="Xoá"
        (click)="onDelete()"
      >
        <tui-icon icon="@tui.trash-2" />
      </button>
    </div>
  `,
  styles: [
    `
      .action-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        height: 100%;
      }

      .action-buttons button[tuiIconButton] {
        width: 28px !important;
        height: 28px !important;
        border-radius: 8px !important;
      }

      .action-buttons .btn-action {
        background: #f5f7ff !important;
        color: #6366f1 !important;
        border: 1px solid #e0e7ff !important;
      }

      .action-buttons .btn-action:hover {
        background: #eef2ff !important;
      }

      .action-buttons .btn-action--success {
        background: #ecfdf5 !important;
        color: #10b981 !important;
        border: 1px solid #a7f3d0 !important;
      }
      
      .action-buttons .btn-action--success:hover {
        background: #d1fae5 !important;
      }

      .action-buttons .btn-action--warning {
        background: #fffbeb !important;
        color: #f59e0b !important;
        border: 1px solid #fde68a !important;
      }

      .action-buttons .btn-action--warning:hover {
        background: #fef3c7 !important;
      }

      .action-buttons .btn-action--danger {
        background: #fff5f5 !important;
        color: #ef4444 !important;
        border: 1px solid #fecaca !important;
      }

      .action-buttons .btn-action--danger:hover {
        background: #fee2e2 !important;
      }
    `,
  ],
})
export class UserActionRendererComponent implements ICellRendererAngularComp {
  params!: any;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  onApprove(): void {
    if (this.params.onApprove) this.params.onApprove(this.params.data);
  }

  onReject(): void {
    if (this.params.onReject) this.params.onReject(this.params.data);
  }

  onEdit(): void {
    if (this.params.onEdit) this.params.onEdit(this.params.data);
  }

  onAdjustCredit(): void {
    if (this.params.onAdjustCredit) this.params.onAdjustCredit(this.params.data);
  }

  onResetPassword(): void {
    if (this.params.onResetPassword) this.params.onResetPassword(this.params.data);
  }

  onToggleStatus(): void {
    if (this.params.onToggleStatus) this.params.onToggleStatus(this.params.data);
  }

  onDelete(): void {
    if (this.params.onDelete) this.params.onDelete(this.params.data);
  }
}
