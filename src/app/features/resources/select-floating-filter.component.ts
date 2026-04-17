import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IFloatingFilterAngularComp } from 'ag-grid-angular';
import { IFloatingFilterParams } from 'ag-grid-community';

/**
 * Custom Floating Filter dạng <select> dropdown.
 * Dùng cho AG Grid Community (không cần Enterprise).
 *
 * Cách dùng trong ColDef:
 * {
 *   filter: true,                               // bật filter ẩn
 *   floatingFilterComponent: SelectFloatingFilterComponent,
 *   floatingFilterComponentParams: {
 *     // Cách 1: truyền list tĩnh
 *     values: ['Có', 'Không'],
 *     // Cách 2: truyền hàm lấy list động từ dữ liệu grid
 *     // valuesFromGrid: true,  // tự thu thập unique values từ cột
 *   },
 * }
 */
@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <select
      class="select-floating-filter"
      [(ngModel)]="selectedValue"
      (ngModelChange)="onSelectionChanged()"
      (mousedown)="refreshValues()"
    >
      <option value="">Tất cả</option>
      @for (val of filterValues; track val) {
        <option [value]="val">{{ val }}</option>
      }
    </select>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        width: 100%;
        height: 100%;
      }

      .select-floating-filter {
        width: 100%;
        height: 32px;
        padding: 0 8px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        font-size: 13px;
        color: #334155;
        outline: none;
        cursor: pointer;
        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 6px center;
        padding-right: 22px;
      }

      .select-floating-filter:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
      }

      .select-floating-filter:hover {
        border-color: #a5b4fc;
      }
    `,
  ],
})
export class SelectFloatingFilterComponent implements IFloatingFilterAngularComp, OnDestroy {
  params!: IFloatingFilterParams & {
    values?: string[];
    valuesFromGrid?: boolean;
  };
  selectedValue = '';
  filterValues: string[] = [];
  private onModelUpdatedListener = () => this.collectValuesFromGrid();

  private readonly cdr = inject(ChangeDetectorRef);

  agInit(params: IFloatingFilterParams & { values?: string[]; valuesFromGrid?: boolean }): void {
    this.params = params;

    if (params.values) {
      this.filterValues = params.values;
    } else if (params.valuesFromGrid) {
      this.collectValuesFromGrid();
      // Lắng nghe sự kiện dữ liệu thay đổi để cập nhật list values
      params.api.addEventListener('modelUpdated', this.onModelUpdatedListener);
    }
  }

  ngOnDestroy(): void {
    if (this.params?.api) {
      this.params.api.removeEventListener('modelUpdated', this.onModelUpdatedListener);
    }
  }

  onParentModelChanged(parentModel: any): void {
    if (!parentModel) {
      this.selectedValue = '';
    } else {
      this.selectedValue = parentModel.filter || '';
    }
    this.cdr.detectChanges();
  }

  onSelectionChanged(): void {
    const model =
      this.selectedValue === ''
        ? null
        : {
            filterType: 'text',
            type: 'equals',
            filter: this.selectedValue,
          };

    // Gọi instance của parent filter để set model, sau đó báo cho API grid biết filter đã đổi
    this.params.parentFilterInstance((instance: any) => {
      instance.setModel(model);
      this.params.api.onFilterChanged();
    });
  }

  refreshValues(): void {
    if (this.params.valuesFromGrid) {
      this.collectValuesFromGrid();
    }
  }

  /** Thu thập giá trị duy nhất từ tất cả dòng trong grid */
  private collectValuesFromGrid(): void {
    const api = this.params.api;
    const col = this.params.column;
    const uniqueValues = new Set<string>();

    api.forEachNode((node) => {
      if (node.data) {
        // getCellValue sẽ tự động chạy qua valueGetter và valueFormatter của column
        const value = api.getCellValue({
          rowNode: node,
          colKey: col,
          useFormatter: true,
        });

        if (value != null && value !== '' && value !== '—') {
          uniqueValues.add(String(value));
        }
      }
    });

    this.filterValues = Array.from(uniqueValues).sort();
    this.cdr.detectChanges();
  }
}
