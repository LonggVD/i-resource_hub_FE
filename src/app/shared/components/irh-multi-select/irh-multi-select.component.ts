import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TuiIcon } from '@taiga-ui/core';

export interface IrhMultiSelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-irh-multi-select',
  standalone: true,
  imports: [CommonModule, TuiIcon],
  templateUrl: './irh-multi-select.component.html',
  styleUrl: './irh-multi-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IrhMultiSelect),
      multi: true,
    },
  ],
})
export class IrhMultiSelect implements ControlValueAccessor {
  // ── Inputs ────────────────────────────────────────────────
  public readonly options = input<IrhMultiSelectOption[]>([]);
  public readonly placeholder = input('Chọn nhiều giá trị...');
  public readonly label = input('');
  public readonly searchPlaceholder = input('Tìm kiếm nhanh...');

  // ── Signals ──────────────────────────────────────────────
  public readonly isOpen = signal(false);
  public readonly searchTerm = signal('');
  public readonly selectedValues = signal<any[]>([]);

  // ── Computed ─────────────────────────────────────────────
  public readonly filteredOptions = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const opts = this.options();
    if (!term) return opts;
    return opts.filter((opt) => opt.label.toLowerCase().includes(term));
  });

  public readonly selectedOptions = computed(() => {
    return this.options().filter((opt) => this.selectedValues().includes(opt.value));
  });

  // ── ControlValueAccessor ─────────────────────────────────
  onChange: (value: any[]) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any[]): void {
    this.selectedValues.set(Array.isArray(value) ? value : []);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // ── Actions ──────────────────────────────────────────────
  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.searchTerm.set('');
    }
    this.onTouched();
    this.cdr.detectChanges();
  }

  updateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.cdr.markForCheck();
  }

  toggleOption(option: IrhMultiSelectOption): void {
    const current = this.selectedValues();
    const index = current.indexOf(option.value);

    if (index === -1) {
      const updated = [...current, option.value];
      this.selectedValues.set(updated);
      this.onChange(updated);
    } else {
      const updated = current.filter((v) => v !== option.value);
      this.selectedValues.set(updated);
      this.onChange(updated);
    }
    this.cdr.markForCheck();
  }

  removeOption(value: any, event: MouseEvent): void {
    event.stopPropagation();
    const updated = this.selectedValues().filter((v) => v !== value);
    this.selectedValues.set(updated);
    this.onChange(updated);
    this.cdr.markForCheck();
  }

  isSelected(value: any): boolean {
    return this.selectedValues().includes(value);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) {
        this.isOpen.set(false);
        this.cdr.markForCheck();
      }
    }
  }
}
