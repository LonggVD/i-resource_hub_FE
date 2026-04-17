import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-user-status-badge-renderer',
  standalone: true,
  imports: [TuiBadge],
  template: `
    <div class="status-wrap">
      <tui-badge
        tuiBadge
        size="m"
        class="user-status-badge"
        [class.user-status-badge--active]="isActive"
        [class.user-status-badge--locked]="!isActive"
      >
        {{ label }}
      </tui-badge>
    </div>
  `,
  styles: [
    `
      .status-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      .user-status-badge {
        min-width: 96px;
        justify-content: center;
        font-weight: 600;
      }

      .user-status-badge--active {
        background: #ecfdf5;
        color: #047857;
      }

      .user-status-badge--locked {
        background: #fef2f2;
        color: #b91c1c;
      }
    `,
  ],
})
export class UserStatusBadgeRendererComponent implements ICellRendererAngularComp {
  label = '';
  isActive = false;

  agInit(params: ICellRendererParams): void {
    const value = String(params.value || '');
    this.isActive = value === 'ACTIVE';
    this.label = this.isActive ? 'Hoạt động' : 'Đã khoá';
  }

  refresh(params: ICellRendererParams): boolean {
    this.agInit(params);
    return true;
  }
}
