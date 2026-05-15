import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { PenaltyService, PenaltyResponse } from '../../core/api/penalty.service';
import { NotificationService } from '../../core/api/notification';
import { PenaltyDialogComponent } from './penalty-dialog/penalty-dialog.component';
import { PenaltyDetailDialogComponent } from './penalty-detail-dialog/penalty-detail-dialog.component';
import { IrhAggridComponent } from '../../shared/components/irh-aggrid/irh-aggrid.component';

type FilterStatus = 'all' | 'active' | 'revoked';

@Component({
  selector: 'app-penalties',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TuiButton,
    TuiBadge,
    TuiIcon,
    TuiLoader,
    IrhAggridComponent,
  ],
  templateUrl: './penalties.component.html',
  styleUrls: ['./penalties.component.css'],
})
export class PenaltiesComponent implements OnInit {
  private penaltyService = inject(PenaltyService);
  private notificationService = inject(NotificationService);
  private dialogs = inject(TuiDialogService);

  penalties = signal<PenaltyResponse[]>([]);
  isLoading = signal<boolean>(true);
  filterStatus = signal<FilterStatus>('all');
  searchQuery = signal<string>('');

  readonly summary = computed(() => {
    const list = this.penalties();
    const active = list.filter((p) => p.status === 'ACTIVE');
    const lockedUsers = new Set(
      list.filter((p) => p.userStatus === 'LOCKED').map((p) => p.userId),
    );
    return {
      total: list.length,
      active: active.length,
      revoked: list.length - active.length,
      lockedUsers: lockedUsers.size,
      totalFines: active.reduce((sum, p) => sum + (p.fineAmount || 0), 0),
    };
  });

  readonly filteredPenalties = computed(() => {
    let list = this.penalties();
    const filter = this.filterStatus();
    if (filter === 'active') list = list.filter((p) => p.status === 'ACTIVE');
    else if (filter === 'revoked') list = list.filter((p) => p.status === 'REVOKED');

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.studentName || '').toLowerCase().includes(q) ||
          (p.studentCode || '').toLowerCase().includes(q),
      );
    }
    return list;
  });

  // ═══════════════ AG-GRID COLUMN DEFINITIONS ═══════════════
  readonly colDefs: ColDef[] = [
    {
      headerName: 'Loại vi phạm',
      field: 'penaltyType',
      flex: 1.1,
      minWidth: 140,
      cellRenderer: (params: ICellRendererParams) => {
        const type = params.value || '';
        const map: Record<string, { label: string; bg: string; color: string }> = {
          OVERDUE: { label: 'Trễ trả', bg: '#fee2e2', color: '#b91c1c' },
          DAMAGE: { label: 'Hư hỏng', bg: '#ffedd5', color: '#c2410c' },
          LOST: { label: 'Mất thiết bị', bg: '#fce7f3', color: '#9f1239' },
          LATE: { label: 'Trễ giờ', bg: '#fef3c7', color: '#92400e' },
          NO_SHOW: { label: 'Vắng mặt', bg: '#e2e8f0', color: '#334155' },
        };
        const cfg = map[type] || { label: type, bg: '#e2e8f0', color: '#334155' };
        return `<span style="display:inline-flex;align-items:center;font-size:0.7rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;padding:3px 8px;border-radius:6px;background:${cfg.bg};color:${cfg.color};white-space:nowrap;">${cfg.label}</span>`;
      },
    },
    {
      headerName: 'Sinh viên',
      field: 'studentName',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: ICellRendererParams) => {
        const name = params.value || 'Sinh viên';
        const code = params.data?.studentCode || '';
        const locked = params.data?.userStatus === 'LOCKED';
        const lockedTag = locked
          ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:0.62rem;font-weight:700;text-transform:uppercase;padding:1px 5px;border-radius:4px;background:#fef2f2;color:#b91c1c;margin-left:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Khoá</span>`
          : '';
        return `
          <div style="display:flex;flex-direction:column;gap:2px;line-height:1.3;padding:6px 0;">
            <div style="font-weight:700;color:#0f172a;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="background:#f1f5f9;color:#64748b;font-size:0.68rem;font-weight:700;padding:1px 6px;border-radius:4px;">${code}</span>
              ${lockedTag}
            </div>
          </div>
        `;
      },
    },
    {
      headerName: 'Mô tả',
      field: 'description',
      flex: 2.2,
      minWidth: 220,
      tooltipField: 'description',
      cellRenderer: (params: ICellRendererParams) => {
        const desc = params.value || '(Không có mô tả)';
        const review = params.data?.requiresReview
          ? `<div style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;color:#92400e;font-weight:600;margin-top:2px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>Yêu cầu kiểm điểm</div>`
          : '';
        return `
          <div style="display:flex;flex-direction:column;line-height:1.4;padding:6px 0;">
            <div style="color:#475569;font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${desc}</div>
            ${review}
          </div>
        `;
      },
    },
    {
      headerName: 'Ngày ghi nhận',
      field: 'createdAt',
      flex: 0.95,
      minWidth: 140,
      cellRenderer: (params: ICellRendererParams) => {
        if (!params.value) return '';
        const d = new Date(params.value);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        const by = params.data?.createdByName || 'Hệ thống';
        return `
          <div style="display:flex;flex-direction:column;line-height:1.3;padding:6px 0;">
            <div style="font-weight:600;color:#0f172a;font-size:0.82rem;">${dd}/${mm}/${yy}</div>
            <div style="color:#94a3b8;font-size:0.72rem;">${hh}:${mi} · ${by}</div>
          </div>
        `;
      },
    },
    {
      headerName: 'Điểm trừ',
      field: 'penaltyPoint',
      flex: 0.55,
      minWidth: 80,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (params: ICellRendererParams) => {
        const isRevoked = params.data?.status === 'REVOKED';
        const style = isRevoked
          ? 'color:#94a3b8;text-decoration:line-through;'
          : 'color:#dc2626;';
        return `<span style="font-weight:800;font-size:0.95rem;${style}">-${params.value}</span>`;
      },
    },
    {
      headerName: 'Còn lại',
      field: 'currentCreditScore',
      flex: 0.55,
      minWidth: 80,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (params: ICellRendererParams) => {
        const score = params.value ?? 0;
        const color = score <= 0 ? '#dc2626' : score < 50 ? '#f59e0b' : '#10b981';
        return `<span style="font-weight:800;font-size:0.95rem;color:${color};">${score}</span>`;
      },
    },
    {
      headerName: 'Tiền phạt',
      field: 'fineAmount',
      flex: 0.85,
      minWidth: 120,
      cellStyle: { textAlign: 'right' },
      cellRenderer: (params: ICellRendererParams) => {
        if (!params.value || params.value <= 0) return '<span style="color:#cbd5e1;">—</span>';
        return `<span style="font-weight:700;color:#047857;font-size:0.85rem;white-space:nowrap;">${params.value.toLocaleString('vi-VN')}đ</span>`;
      },
    },
    {
      headerName: 'Trạng thái',
      field: 'status',
      flex: 0.75,
      minWidth: 110,
      cellRenderer: (params: ICellRendererParams) => {
        const isRevoked = params.value === 'REVOKED';
        const bg = isRevoked ? '#f1f5f9' : '#fef2f2';
        const color = isRevoked ? '#64748b' : '#dc2626';
        const label = isRevoked ? 'Đã ân xá' : 'Hiệu lực';
        return `<span style="display:inline-block;font-size:0.66rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:3px 8px;border-radius:6px;background:${bg};color:${color};">${label}</span>`;
      },
    },
    {
      headerName: 'Hành động',
      field: 'actions',
      flex: 1,
      minWidth: 160,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params: ICellRendererParams) => {
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;gap:6px;align-items:center;height:100%;';

        const detailBtn = document.createElement('button');
        detailBtn.textContent = 'Chi tiết';
        detailBtn.style.cssText =
          'padding:4px 10px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;color:#475569;font-size:0.75rem;font-weight:600;cursor:pointer;';
        detailBtn.onmouseenter = () => (detailBtn.style.background = '#f1f5f9');
        detailBtn.onmouseleave = () => (detailBtn.style.background = '#fff');
        detailBtn.onclick = (e) => {
          e.stopPropagation();
          this.openDetailDialog(params.data);
        };
        container.appendChild(detailBtn);

        if (params.data?.status === 'ACTIVE') {
          const revokeBtn = document.createElement('button');
          revokeBtn.textContent = 'Ân xá';
          revokeBtn.style.cssText =
            'padding:4px 10px;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;font-size:0.75rem;font-weight:600;cursor:pointer;';
          revokeBtn.onmouseenter = () => {
            revokeBtn.style.background = '#dc2626';
            revokeBtn.style.color = '#fff';
          };
          revokeBtn.onmouseleave = () => {
            revokeBtn.style.background = '#fef2f2';
            revokeBtn.style.color = '#dc2626';
          };
          revokeBtn.onclick = (e) => {
            e.stopPropagation();
            this.revokePenalty(params.data, e);
          };
          container.appendChild(revokeBtn);
        }
        return container;
      },
    },
  ];

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: false,
    minWidth: 80,
    suppressHeaderMenuButton: true,
  };

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
      error: () => {
        this.notificationService.showError('Lỗi khi tải danh sách xử phạt');
        this.isLoading.set(false);
      },
    });
  }

  setFilter(status: FilterStatus) {
    this.filterStatus.set(status);
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
  }

  openCreateDialog() {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(PenaltyDialogComponent), {
        size: 'l',
        closeable: true,
        dismissible: false,
        label: 'Tạo phiếu phạt mới',
      })
      .subscribe((result) => {
        if (result) this.loadData();
      });
  }

  openDetailDialog(penalty: PenaltyResponse) {
    this.isLoading.set(true);
    this.penaltyService.getPenaltyById(penalty.id).subscribe({
      next: (fullPenalty) => {
        this.isLoading.set(false);
        this.dialogs
          .open<void>(new PolymorpheusComponent(PenaltyDetailDialogComponent), {
            size: 'l',
            closeable: true,
            dismissible: true,
            label: 'Chi tiết phiếu phạt',
            data: fullPenalty,
          })
          .subscribe();
      },
      error: () => this.isLoading.set(false),
    });
  }

  revokePenalty(penalty: PenaltyResponse, event: Event) {
    event.stopPropagation();
    if (
      !confirm(
        `Bạn có chắc muốn ân xá cho sinh viên ${penalty.studentName}? Điểm tín nhiệm sẽ được cộng lại.`,
      )
    )
      return;

    this.penaltyService.revokePenalty(penalty.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Đã ân xá án phạt thành công!');
        this.loadData();
      },
      error: (err) => {
        this.notificationService.showError(err.error?.message || 'Lỗi khi ân xá');
      },
    });
  }
}
