import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TuiIcon } from '@taiga-ui/core';

export interface IrhSelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}

@Component({
  selector: 'app-irh-select, irh-select',
  standalone: true,
  imports: [CommonModule, TuiIcon],
  templateUrl: './irh-select.component.html',
  styleUrl: './irh-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IrhSelect),
      multi: true,
    },
  ],
})
export class IrhSelect implements ControlValueAccessor {
  // ── Inputs (Signals) ──────────────────────────────────────
  public readonly options = input<IrhSelectOption[]>([]);
  public readonly placeholder = input('-- Chọn một giá trị --');
  public readonly label = input('');
  public readonly searchPlaceholder = input('Tìm kiếm nhanh...');

  // ── Outputs ──────────────────────────────────────────────
  @Output() selectionChange = new EventEmitter<any>();

  // ── Signals ──────────────────────────────────────────────
  public readonly isOpen = signal(false);
  public readonly searchTerm = signal('');
  public readonly selectedValueInput = input<any>(null, { alias: 'selectedValue' });
  private readonly internalSelectedValue = signal<any>(null);

  // ── Computed ─────────────────────────────────────────────
  public readonly selectedValue = computed(() => this.selectedValueInput() || this.internalSelectedValue());
  
  public readonly filteredOptions = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const opts = this.options();
    if (!term) return opts;
    return opts.filter((opt) => opt.label.toLowerCase().includes(term));
  });

  public readonly displayLabel = computed(() => {
    const selected = this.options().find((opt) => opt.value === this.selectedValue());
    return selected ? selected.label : this.placeholder();
  });

  // ── ControlValueAccessor ─────────────────────────────────
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: any): void {
    this.internalSelectedValue.set(value);
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

  selectOption(option: IrhSelectOption): void {
    if (option.disabled) return;
    
    this.internalSelectedValue.set(option.value);
    this.onChange(option.value);
    this.selectionChange.emit(option.value);
    this.isOpen.set(false);
    this.cdr.markForCheck();
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
