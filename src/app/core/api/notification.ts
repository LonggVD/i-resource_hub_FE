import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationComponent } from '../../shared/components/notification/notification.component';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  showSuccess(message: string, duration?: number) {
    this.openSnackBar(message, 'success', duration);
  }

  showError(message: string, duration?: number) {
    this.openSnackBar(message, 'error', duration);
  }

  showInfo(message: string, duration?: number) {
    this.openSnackBar(message, 'info', duration);
  }

  showWarning(message: string, duration?: number) {
    this.openSnackBar(message, 'warning', duration);
  }

  private openSnackBar(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    duration = 3000,
  ) {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: { message, type },
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [`${type}`],
    });
  }
}
