import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { OverdueBooking } from '../../../core/api/dashboard.service';

export interface RemindDialogData {
  items: OverdueBooking[];
}

@Component({
  selector: 'app-remind-dialog',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon],
  templateUrl: './remind-dialog.component.html',
  styleUrls: ['./remind-dialog.component.css'],
})
export class RemindDialogComponent {
  private readonly context = inject<TuiDialogContext<boolean, RemindDialogData>>(POLYMORPHEUS_CONTEXT);

  protected get items(): OverdueBooking[] {
    return this.context.data?.items ?? [];
  }

  protected confirm(): void {
    this.context.completeWith(true);
  }

  protected cancel(): void {
    this.context.completeWith(false);
  }
}
