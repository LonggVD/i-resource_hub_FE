import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-resource-action-renderer',
  standalone: true,
  imports: [TuiButton, TuiIcon],
  template: `
    <div class="action-buttons">
      <button tuiIconButton class="btn-action" size="s" title="Chỉnh sửa" (click)="onEdit()">
        <tui-icon icon="@tui.pencil" />
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
      transition:
        background 0.18s ease,
        transform 0.12s ease,
        box-shadow 0.18s ease;
    }

    .action-buttons button[tuiIconButton]:active {
      transform: scale(0.9);
    }

    .action-buttons .btn-action {
      background: #f5f7ff !important;
      color: #6366f1 !important;
      border: 1px solid #e0e7ff !important;
      box-shadow:
        inset 2px 2px 5px rgba(0, 0, 0, 0.08),
        inset -2px -2px 5px rgba(255, 255, 255, 0.9);
      transition: all 0.2s ease;
    }

    .action-buttons .btn-action:hover {
      background: #eef2ff !important;
      box-shadow:
        inset 3px 3px 6px rgba(0, 0, 0, 0.1),
        inset -3px -3px 6px rgba(255, 255, 255, 1);
    }

    .action-buttons .btn-action:active {
      box-shadow:
        inset 4px 4px 8px rgba(0, 0, 0, 0.15),
        inset -4px -4px 8px rgba(255, 255, 255, 1);
    }

    .action-buttons .btn-action--danger {
      background: #fff5f5 !important;
      color: #ef4444 !important;
      border: 1px solid #fecaca !important;
      box-shadow:
        inset 2px 2px 5px rgba(0, 0, 0, 0.06),
        inset -2px -2px 5px rgba(255, 255, 255, 0.9);
    }

    .action-buttons .btn-action--danger:hover {
      background: #fee2e2 !important;
      box-shadow:
        inset 3px 3px 6px rgba(0, 0, 0, 0.08),
        inset -3px -3px 6px rgba(255, 255, 255, 1);
    }
  `],
})
export class ResourceActionRendererComponent implements ICellRendererAngularComp {
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

  onDelete() {
    if (this.params.onDelete) this.params.onDelete(this.params.data);
  }
}
