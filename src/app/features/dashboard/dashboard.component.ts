import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import {
  DashboardService,
  DashboardResponse,
  OverdueBooking,
} from '../../core/api/dashboard.service';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { NotificationService } from '../../core/api/notification';
import { HasRoleDirective } from '../../core/directives/has-role.directive';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { PenaltyDialogComponent } from '../penalties/penalty-dialog/penalty-dialog.component';
import { AuthService } from '../../core/api/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, TuiButton, HasRoleDirective],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private dialogs = inject(TuiDialogService);
  protected authService = inject(AuthService);

  stats = signal<DashboardResponse | null>(null);
  isLoading = signal<boolean>(true);
  isStudent = signal<boolean>(false);

  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly allSelected = computed(() => {
    const total = this.stats()?.overdueBookings?.length ?? 0;
    return total > 0 && this.selectedIds().size === total;
  });
  protected readonly someSelected = computed(() => {
    const count = this.selectedIds().size;
    const total = this.stats()?.overdueBookings?.length ?? 0;
    return count > 0 && count < total;
  });

  // ECharts Options
  lineChartOption: EChartsOption = {};
  donutChartOption: EChartsOption = {};

  ngOnInit(): void {
    const user = this.authService.user();
    const hasAccess = user?.roles.some(
      (r) => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER' || r === 'RESOURCE_MANAGE',
    );

    if (!hasAccess) {
      // Nếu là sinh viên bình thường, không cho xem Dashboard quản trị, đẩy ra trang tra cứu
      this.router.navigate(['/resources']);
      return;
    }

    this.loadData();
  }

  // Deep linking
  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  // Xuất báo cáo PDF
  exportReport(): void {
    window.print();
  }

  // Gửi nhắc nhở
  sendWarning(booking: OverdueBooking, event: Event): void {
    event.stopPropagation();
    // Dummy action: hiển thị thông báo thành công
    this.notificationService.showSuccess(
      `Đã gửi email nhắc nhở trả thiết bị "${booking.deviceName}" tới sinh viên ${booking.studentName}!`,
    );
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected toggleSelection(id: string, event: Event): void {
    event.stopPropagation();
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  protected toggleAll(): void {
    const items = this.stats()?.overdueBookings ?? [];
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(items.map((b) => b.bookingId)));
    }
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected sendBulkWarning(): void {
    const items = this.stats()?.overdueBookings ?? [];
    const selected = items.filter((b) => this.selectedIds().has(b.bookingId));
    if (selected.length === 0) return;
    // Dummy action — backend chưa có endpoint gửi nhắc nhở, khớp hành vi sendWarning
    this.notificationService.showSuccess(
      `Đã gửi email nhắc nhở tới ${selected.length} sinh viên.`,
    );
    this.clearSelection();
  }

  // Phạt sinh viên
  penalizeStudent(booking: OverdueBooking, event: Event): void {
    event.stopPropagation();
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(PenaltyDialogComponent), {
        label: 'Ghi nhận vi phạm quá hạn',
        size: 'l',
        data: {
          ...booking,
          expired: true,
        },
        dismissible: true,
      })
      .subscribe((result) => {
        if (result) {
          this.loadData();
        }
      });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.clearSelection();
    this.dashboardService.getDashboardStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.initCharts(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard stats', err);
        this.isLoading.set(false);
      },
    });
  }

  private initCharts(data: DashboardResponse): void {
    // 1. Line Chart (Tần suất mượn 7 ngày qua)
    this.lineChartOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#eee',
        textStyle: { color: '#333' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.bookingsChart.labels,
        axisLine: { lineStyle: { color: '#eee' } },
        axisLabel: { color: '#666' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } },
        axisLabel: { color: '#666' },
      },
      series: [
        {
          name: 'Lượt mượn',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#3b82f6' }, // Blue 500
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.0)' },
              ],
            },
          },
          data: data.bookingsChart.data,
        },
      ],
    };

    // 2. Donut Chart (Trạng thái thiết bị)
    this.donutChartOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        bottom: '5%',
        left: 'center',
        icon: 'circle',
      },
      series: [
        {
          name: 'Trạng thái',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold',
            },
          },
          labelLine: { show: false },
          data: [
            {
              value: data.equipmentStatusChart.available,
              name: 'Sẵn sàng',
              itemStyle: { color: '#10b981' },
            }, // Green
            {
              value: data.equipmentStatusChart.inUse,
              name: 'Đang dùng',
              itemStyle: { color: '#3b82f6' },
            }, // Blue
            {
              value: data.equipmentStatusChart.broken,
              name: 'Bị hỏng',
              itemStyle: { color: '#ef4444' },
            }, // Red
            {
              value: data.equipmentStatusChart.maintenance,
              name: 'Bảo trì',
              itemStyle: { color: '#f59e0b' },
            }, // Yellow
            {
              value: data.equipmentStatusChart.lost,
              name: 'Bị mất',
              itemStyle: { color: '#6b7280' },
            }, // Gray
          ],
        },
      ],
    };
  }
}
