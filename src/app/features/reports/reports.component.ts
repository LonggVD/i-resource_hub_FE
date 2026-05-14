import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { ReportService } from '../../core/api/report.service';
import { NotificationService } from '../../core/api/notification';

type ReportFormat = 'excel' | 'pdf';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiIcon, TuiLoader],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent {
  private reportService = inject(ReportService);
  private notification = inject(NotificationService);

  readonly today = new Date().toISOString().split('T')[0];
  readonly defaultFrom = this.getDateOffset(-30);

  readonly fromDate = signal<string>(this.defaultFrom);
  readonly toDate = signal<string>(this.today);
  readonly isLoading = signal<ReportFormat | null>(null);

  readonly isValidRange = computed(() => {
    const f = this.fromDate();
    const t = this.toDate();
    return !!f && !!t && f <= t;
  });

  setQuickRange(days: number): void {
    this.fromDate.set(this.getDateOffset(-days));
    this.toDate.set(this.today);
  }

  setCurrentMonth(): void {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate.set(this.toIso(first));
    this.toDate.set(this.today);
  }

  exportExcel(): void {
    if (!this.isValidRange()) return;
    this.isLoading.set('excel');
    this.reportService.exportBookingExcel(this.fromDate(), this.toDate()).subscribe({
      next: (blob) => {
        this.reportService.download(blob, this.buildFilename('xlsx'));
        this.notification.showSuccess('Đã tải báo cáo Excel thành công.');
        this.isLoading.set(null);
      },
      error: () => {
        this.notification.showError('Không thể xuất Excel. Vui lòng thử lại.');
        this.isLoading.set(null);
      },
    });
  }

  exportPdf(): void {
    if (!this.isValidRange()) return;
    this.isLoading.set('pdf');
    this.reportService.exportBookingPdf(this.fromDate(), this.toDate()).subscribe({
      next: (blob) => {
        this.reportService.download(blob, this.buildFilename('pdf'));
        this.notification.showSuccess('Đã tải báo cáo PDF thành công.');
        this.isLoading.set(null);
      },
      error: () => {
        this.notification.showError('Không thể xuất PDF. Vui lòng thử lại.');
        this.isLoading.set(null);
      },
    });
  }

  private buildFilename(ext: string): string {
    const f = this.fromDate().replace(/-/g, '');
    const t = this.toDate().replace(/-/g, '');
    return `bookings-${f}-${t}.${ext}`;
  }

  private getDateOffset(deltaDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + deltaDays);
    return this.toIso(d);
  }

  private toIso(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
