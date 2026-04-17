import { ChangeDetectorRef, Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IFloatingFilterAngularComp, IFilterAngularComp } from 'ag-grid-angular';
import { IFloatingFilterParams, IFilterParams, IAfterGuiAttachedParams } from 'ag-grid-community';
import { IrhMultiSelect, IrhMultiSelectOption } from '../../shared/components/irh-multi-select/irh-multi-select.component';

/**
 * Filter logic for MultiSelect: 
 * Since Community doesn't have a 'Set' filter, we use this custom simple filter 
 * which behaves like a Set Filter.
 */
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IrhMultiSelect],
  template: `
    <div style="padding: 12px; min-width: 200px;">
       <app-irh-multi-select 
         [options]="options" 
         [ngModel]="selectedValues" 
         (ngModelChange)="onModelChange($event)"
         placeholder="Bộ lọc nhiều...">
       </app-irh-multi-select>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: white;
    }
  `]
})
export class ChecklistFilterComponent implements IFilterAngularComp {
  params!: IFilterParams;
  selectedValues: any[] = [];
  options: IrhMultiSelectOption[] = [];

  agInit(params: IFilterParams): void {
    this.params = params;
    this.collectValuesFromGrid();
  }

  isFilterActive(): boolean {
    return this.selectedValues && this.selectedValues.length > 0;
  }

  doesFilterPass(params: any): boolean {
    const value = this.params.api.getCellValue({
        rowNode: params.node,
        colKey: this.params.column,
        useFormatter: true
    });
    return this.selectedValues.includes(value);
  }

  getModel() {
    if (!this.isFilterActive()) return null;
    return { values: this.selectedValues };
  }

  setModel(model: any) {
    this.selectedValues = model ? model.values : [];
  }

  onModelChange(newValues: any[]) {
    this.selectedValues = newValues;
    this.params.filterChangedCallback();
  }

  /** Lấy list values từ grid để gán vào Options */
  private collectValuesFromGrid(): void {
    const api = this.params.api;
    const col = this.params.column;
    const uniqueValues = new Set<string>();

    api.forEachNode((node) => {
      if (node.data) {
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

    this.options = Array.from(uniqueValues).sort().map(v => ({ label: v, value: v }));
  }
}

/**
 * Floating component: Using irh-multi-select
 */
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IrhMultiSelect],
  template: `
    <div class="multi-select-floating-wrapper" (click)="$event.stopPropagation()">
      <app-irh-multi-select 
        [options]="options" 
        [(ngModel)]="selectedValues" 
        (ngModelChange)="onSelectionChanged()"
        placeholder="Lọc..."
      ></app-irh-multi-select>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
    }
    .multi-select-floating-wrapper {
        width: 100%;
        padding: 4px;
        position: relative;
    }
    
    /* Đảm bảo dropdown không bị che bởi AG Grid header */
    ::ng-deep .ag-header-cell {
        overflow: visible !important;
    }
    ::ng-deep .ag-header-row {
        overflow: visible !important;
        z-index: 10 !important;
    }
    ::ng-deep .ag-floating-filter {
        overflow: visible !important;
    }

    ::ng-deep .multi-select-floating-wrapper .irh-select-wrapper {
        height: 32px !important;
        min-height: 32px !important;
        border-radius: 8px !important;
        background: #f8fafc !important;
        border-width: 1px !important;
    }
    ::ng-deep .multi-select-floating-wrapper .irh-select-value {
        font-size: 13px !important;
    }
    ::ng-deep .multi-select-floating-wrapper .irh-select-trigger {
        padding: 0 8px !important;
    }
    ::ng-deep .multi-select-floating-wrapper .selected-chip {
        display: none !important; 
    }
    ::ng-deep .multi-select-floating-wrapper .irh-select-selection-area {
        gap: 0 !important;
    }
    ::ng-deep .multi-select-floating-wrapper .irh-select-dropdown {
        min-width: 180px !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
    }
  `],
})
export class MultiSelectFloatingFilterComponent implements IFloatingFilterAngularComp {
  params!: IFloatingFilterParams & { valuesFromGrid?: boolean };
  selectedValues: any[] = [];
  options: IrhMultiSelectOption[] = [];

  private readonly cdr = inject(ChangeDetectorRef);

  agInit(params: IFloatingFilterParams & { valuesFromGrid?: boolean }): void {
    this.params = params;
    if (params.valuesFromGrid) {
      this.collectValuesFromGrid();
      // Update when grid data changes
      params.api.addEventListener('modelUpdated', () => this.collectValuesFromGrid());
    }
  }

  onParentModelChanged(parentModel: any): void {
    if (!parentModel) {
      this.selectedValues = [];
    } else {
      this.selectedValues = parentModel.values || [];
    }
    this.cdr.detectChanges();
  }

  onSelectionChanged(): void {
    const model = this.selectedValues.length === 0 ? null : { values: this.selectedValues };
    this.params.parentFilterInstance((instance: any) => {
        if (instance.setModel) {
            instance.setModel(model);
            this.params.api.onFilterChanged();
        }
    });
  }

  private collectValuesFromGrid(): void {
    const api = this.params.api;
    const col = this.params.column;
    const uniqueValues = new Set<string>();

    api.forEachNode((node) => {
      if (node.data) {
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

    this.options = Array.from(uniqueValues).sort().map(v => ({ label: v, value: v }));
    this.cdr.detectChanges();
  }
}
