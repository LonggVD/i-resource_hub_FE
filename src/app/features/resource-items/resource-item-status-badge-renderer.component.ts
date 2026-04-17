import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-resource-item-status-badge-renderer',
  standalone: true,
  imports: [TuiBadge],
  template: `
    <div class="badge-wrap">
      <tui-badge
        tuiBadge
        size="m"
        class="item-status-badge"
        [class.item-status-badge--good]="variant === 'good'"
        [class.item-status-badge--damaged]="variant === 'damaged'"
        [class.item-status-badge--lost]="variant === 'lost'"
        [class.item-status-badge--available]="variant === 'available'"
        [class.item-status-badge--in-use]="variant === 'in-use'"
        [class.item-status-badge--maintenance]="variant === 'maintenance'"
      >
        {{ label }}
      </tui-badge>
    </div>
  `,
  styles: [
    `
      .badge-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      .item-status-badge {
        min-width: 92px;
        justify-content: center;
        font-weight: 600;
      }

      .item-status-badge--good {
        background: #ecfdf5;
        color: #047857;
      }

      .item-status-badge--damaged {
        background: #fef2f2;
        color: #b91c1c;
      }

      .item-status-badge--lost {
        background: #f1f5f9;
        color: #334155;
      }

      .item-status-badge--available {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .item-status-badge--in-use {
        background: #fff7ed;
        color: #c2410c;
      }

      .item-status-badge--maintenance {
        background: #fefce8;
        color: #a16207;
      }
    `,
  ],
})
export class ResourceItemStatusBadgeRendererComponent implements ICellRendererAngularComp {
  label = '---';
  variant: 'good' | 'damaged' | 'lost' | 'available' | 'in-use' | 'maintenance' | '' = '';

  agInit(params: ICellRendererParams): void {
    const field = params.colDef?.field;
    const value = String(params.value || '');

    if (field === 'conditionStatus') {
      if (value === 'GOOD') {
        this.label = 'Tốt';
        this.variant = 'good';
      } else if (value === 'DAMAGED') {
        this.label = 'Hư hỏng';
        this.variant = 'damaged';
      } else if (value === 'LOST') {
        this.label = 'Mất';
        this.variant = 'lost';
      } else {
        this.label = value || '---';
        this.variant = '';
      }
      return;
    }

    if (field === 'status') {
      if (value === 'AVAILABLE') {
        this.label = 'Sẵn sàng';
        this.variant = 'available';
      } else if (value === 'IN_USE') {
        this.label = 'Đang sử dụng';
        this.variant = 'in-use';
      } else if (value === 'IN_MAINTENANCE') {
        this.label = 'Bảo trì';
        this.variant = 'maintenance';
      } else {
        this.label = value || '---';
        this.variant = '';
      }
      return;
    }

    this.label = value || '---';
    this.variant = '';
  }

  refresh(params: ICellRendererParams): boolean {
    this.agInit(params);
    return true;
  }
}
