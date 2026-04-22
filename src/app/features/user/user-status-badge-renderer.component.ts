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
        [class.user-status-badge--active]="status === 'ACTIVE'"
        [class.user-status-badge--locked]="status === 'LOCKED'"
        [class.user-status-badge--pending]="status === 'PENDING'"
        [class.user-status-badge--rejected]="status === 'REJECTED'"
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

      .user-status-badge--pending {
        background: #fffbeb;
        color: #b45309;
      }

      .user-status-badge--rejected {
        background: #f3f4f6;
        color: #4b5563;
      }
    `,
  ],
})
export class UserStatusBadgeRendererComponent implements ICellRendererAngularComp {
  label = '';
  status = '';

  agInit(params: ICellRendererParams): void {
    this.status = String(params.value || 'ACTIVE');
    switch (this.status) {
      case 'ACTIVE':
        this.label = 'Hoạt động';
        break;
      case 'LOCKED':
        this.label = 'Đã khoá';
        break;
      case 'PENDING':
        this.label = 'Chờ duyệt';
        break;
      case 'REJECTED':
        this.label = 'Bị từ chối';
        break;
      default:
        this.label = this.status;
    }
  }

  refresh(params: ICellRendererParams): boolean {
    this.agInit(params);
    return true;
  }
}
