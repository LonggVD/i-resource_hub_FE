import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationComponent } from '../../shared/components/notification/notification.component';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  showSuccess(message: string) {
    this.openSnackBar(message, 'success');
  }

  showError(message: string) {
    this.openSnackBar(message, 'error');
  }

  showInfo(message: string) {
    this.openSnackBar(message, 'info');
  }

  private openSnackBar(message: string, type: 'success' | 'error' | 'info') {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: { message, type },
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [`${type}`],
    });
  }
}
