import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-resource-item-action-renderer',
  standalone: true,
  imports: [TuiButton, TuiIcon],
  template: `
    <div class="action-buttons">
      <button tuiIconButton class="btn-action" size="s" title="Chỉnh sửa" (click)="onEdit()">
        <tui-icon icon="@tui.pencil" />
      </button>
      <button tuiIconButton class="btn-action" size="s" title="In mã QR" (click)="onPrintQR()">
        <tui-icon icon="@tui.qr-code" />
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
  styles: [`
    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 100%;
    }

    .action-buttons button[tuiIconButton] {
      width: 30px !important;
      height: 30px !important;
      border-radius: 8px !important;
      transition: all 0.2s ease;
    }

    .action-buttons .btn-action {
      background: #f5f7ff !important;
      color: #6366f1 !important;
      border: 1px solid #e0e7ff !important;
    }

    .action-buttons .btn-action:hover {
      background: #eef2ff !important;
    }

    .action-buttons .btn-action--danger {
      background: #fff5f5 !important;
      color: #ef4444 !important;
      border: 1px solid #fecaca !important;
    }

    .action-buttons .btn-action--danger:hover {
      background: #fee2e2 !important;
    }
  `],
})
export class ResourceItemActionRendererComponent implements ICellRendererAngularComp {
  params!: any;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    return false;
  }

  onEdit() {
    if (this.params.onEdit) this.params.onEdit(this.params.data);
  }

  onPrintQR() {
    if (this.params.onPrintQR) this.params.onPrintQR(this.params.data);
  }

  onDelete() {
    if (this.params.onDelete) this.params.onDelete(this.params.data);
  }
}
