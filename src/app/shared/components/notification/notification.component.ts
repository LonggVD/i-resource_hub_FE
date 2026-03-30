import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule } from '@angular/material/snack-bar';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [MatSnackBarModule, CommonModule, TuiIcon],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css',
})
export class NotificationComponent {
  // Inject MAT_SNACK_BAR_DATA để nhận message và type
  constructor(
    @Inject(MAT_SNACK_BAR_DATA)
    public data: { message: string; type: 'success' | 'error' | 'info' },
  ) {}
}
