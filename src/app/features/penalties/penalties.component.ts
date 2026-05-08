import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { PenaltyService, PenaltyResponse } from '../../core/api/penalty.service';
import { NotificationService } from '../../core/api/notification';
import { IrhAggridComponent } from '../../shared/components/irh-aggrid/irh-aggrid.component';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { PenaltyDialogComponent } from './penalty-dialog/penalty-dialog.component';
import { PenaltyDetailDialogComponent } from './penalty-detail-dialog/penalty-detail-dialog.component';

@Component({
  selector: 'app-penalties',
  standalone: true,
  imports: [CommonModule, FormsModule, IrhAggridComponent, TuiButton, TuiBadge],
  templateUrl: './penalties.component.html',
  styleUrls: ['./penalties.component.css']
})
export class PenaltiesComponent implements OnInit {
  private penaltyService = inject(PenaltyService);
  private notificationService = inject(NotificationService);
  private dialogs = inject(TuiDialogService);

  penalties = signal<PenaltyResponse[]>([]);
  isLoading = signal<boolean>(true);

  colDefs: ColDef[] = [
    { field: 'studentName', headerName: 'Sinh viên', minWidth: 150 },
    { field: 'studentCode', headerName: 'Mã SV', width: 120 },
    { field: 'penaltyType', headerName: 'Loại vi phạm', width: 130 },
    { field: 'penaltyPoint', headerName: 'Điểm trừ', width: 100,
      cellRenderer: (params: ICellRendererParams) => {
        return `<span style="color: red; font-weight: bold;">-${params.value}</span>`;
      }
    },
    { field: 'currentCreditScore', headerName: 'Điểm hiện tại', width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const score = params.value;
        const color = score <= 0 ? 'red' : (score < 50 ? 'orange' : 'green');
        return `<span style="color: ${color}; font-weight: bold;">${score}</span>`;
      }
    },
    { field: 'userStatus', headerName: 'Tình trạng TK', width: 130,
      cellRenderer: (params: ICellRendererParams) => {
        const isLocked = params.value === 'LOCKED';
        return isLocked 
          ? `<span class="tui-badge tui-badge_status_error">ĐÃ KHÓA</span>` 
          : `<span class="tui-badge tui-badge_status_success">HOẠT ĐỘNG</span>`;
      }
    },
    { field: 'status', headerName: 'Trạng thái Phạt', width: 130,
      cellRenderer: (params: ICellRendererParams) => {
        return params.value === 'REVOKED' 
          ? `<span class="tui-badge" style="background: #e2e8f0; color: #64748b">ĐÃ ÂN XÁ</span>`
          : `<span class="tui-badge tui-badge_status_error">HIỆU LỰC</span>`;
      }
    },
    { field: 'createdAt', headerName: 'Ngày tạo', width: 150, valueFormatter: (p) => new Date(p.value).toLocaleString() },
    { field: 'fineAmount', headerName: 'Tiền phạt', width: 130,
      cellRenderer: (params: ICellRendererParams) => {
        return params.value ? `<span style="color: #ef4444; font-weight: 500;">${params.value.toLocaleString()} đ</span>` : '-';
      }
    },
    { field: 'requiresReview', headerName: 'Kiểm điểm', width: 130,
      cellRenderer: (params: ICellRendererParams) => {
        return params.value 
          ? `<span class="tui-badge" style="background: #fef3c7; color: #92400e">YÊU CẦU</span>` 
          : '-';
      }
    },
    {
      field: 'actions',
      headerName: 'Hành động',
      width: 200,
      cellRenderer: (params: ICellRendererParams) => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '8px';

        // Nút Chi tiết
        const detailBtn = document.createElement('button');
        detailBtn.className = 'tui-button tui-button_appearance_secondary tui-button_size_s';
        detailBtn.innerHTML = 'Chi tiết';
        detailBtn.onclick = () => this.openDetailDialog(params.data);
        container.appendChild(detailBtn);

        // Nút Ân xá
        if (params.data.status !== 'REVOKED') {
          const revokeBtn = document.createElement('button');
          revokeBtn.className = 'tui-button tui-button_appearance_secondary-destructive tui-button_size_s';
          revokeBtn.innerHTML = 'Ân xá';
          revokeBtn.onclick = () => this.revokePenalty(params.data);
          container.appendChild(revokeBtn);
        }

        return container;
      }
    }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.penaltyService.getAllPenalties().subscribe({
      next: (res) => {
        this.penalties.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notificationService.showError('Lỗi khi tải danh sách xử phạt');
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog() {
    this.dialogs.open<boolean>(
      new PolymorpheusComponent(PenaltyDialogComponent),
      {
        size: 'm',
        closeable: true,
        dismissible: false,
        label: 'Tạo phiếu phạt mới',
      }
    ).subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  openDetailDialog(penalty: PenaltyResponse) {
    this.isLoading.set(true);
    this.penaltyService.getPenaltyById(penalty.id).subscribe({
      next: (fullPenalty) => {
        this.isLoading.set(false);
        this.dialogs.open<void>(
          new PolymorpheusComponent(PenaltyDetailDialogComponent),
          {
            size: 'm',
            closeable: true,
            dismissible: true,
            label: 'Chi tiết phiếu phạt',
            data: fullPenalty,
          }
        ).subscribe();
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  revokePenalty(penalty: PenaltyResponse) {
    if (confirm(`Bạn có chắc muốn ân xá cho sinh viên ${penalty.studentName}? Điểm tín nhiệm sẽ được cộng lại.`)) {
      this.penaltyService.revokePenalty(penalty.id).subscribe({
        next: () => {
          this.notificationService.showSuccess(`Đã ân xá án phạt thành công!`);
          this.loadData();
        },
        error: (err) => {
          this.notificationService.showError(err.error?.message || 'Lỗi khi ân xá');
        }
      });
    }
  }
}
