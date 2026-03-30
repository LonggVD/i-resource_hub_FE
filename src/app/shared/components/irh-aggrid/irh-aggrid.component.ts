import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';

/**
 * IrhAggridComponent - Reusable AG Grid wrapper with premium Quartz theme.
 *
 * Usage:
 * <irh-aggrid
 *   [rowData]="myData"
 *   [columnDefs]="myColDefs"
 *   [defaultColDef]="myDefaultColDef"
 *   [paginationPageSize]="10"
 * />
 */
import { themeQuartz } from 'ag-grid-community';
import { themeAlpine } from 'ag-grid-community';
import { themeBalham } from 'ag-grid-community';
import { themeMaterial } from 'ag-grid-community';

@Component({
  selector: 'irh-aggrid',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './irh-aggrid.component.html',
  styleUrl: './irh-aggrid.component.css',
})
export class IrhAggridComponent implements OnChanges {
  theme = themeQuartz;
  // ── Inputs ───────────────────────────────────────────────
  /** Dữ liệu nguồn của bảng */
  @Input() rowData: any[] = [];

  /** Định nghĩa các cột */
  @Input() columnDefs: ColDef[] = [];

  /** Cấu hình mặc định cho tất cả cột (override được ở từng cột) */
  @Input() defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    minWidth: 80,
  };

  /** Chiều cao mỗi dòng (px) */
  @Input() rowHeight = 52;

  /** Chiều cao header (px) */
  @Input() headerHeight = 80;

  /** Bật phân trang */
  @Input() pagination = true;

  /** Số dòng mỗi trang */
  @Input() paginationPageSize = 10;

  /**
   * Nếu true → grid tự co giãn theo số dòng (không có khoảng trắng thừa).
   * Nếu false → dùng chiều cao cố định từ `height` input.
   */
  @Input() autoHeight = true;

  /**
   * Chiều cao tường minh khi autoHeight = false (vd: '400px', '60vh').
   * Bỏ qua khi autoHeight = true.
   */
  @Input() height = '400px';

  // ── Internal ─────────────────────────────────────────────
  private gridApi!: GridApi;

  get domLayout(): 'autoHeight' | 'normal' {
    return this.autoHeight ? 'autoHeight' : 'normal';
  }

  get gridHeight(): string {
    return this.autoHeight ? 'unset' : this.height;
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Khi rowData thay đổi → tự sizeColumnsToFit
    if (changes['rowData'] && this.gridApi) {
      this.gridApi.sizeColumnsToFit();
    }
  }
}
