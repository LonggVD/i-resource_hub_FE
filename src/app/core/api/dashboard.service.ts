import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardResponse {
  totalEquipment: number;
  availableEquipment: number;
  inUseEquipment: number;
  brokenEquipment: number;
  pendingBookings: number;
  bookingsChart: ChartData;
  equipmentStatusChart: EquipmentStatusChart;
  topEquipments: TopEquipment[];
  overdueBookings: OverdueBooking[];
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface EquipmentStatusChart {
  available: number;
  inUse: number;
  broken: number;
  maintenance: number;
  lost: number;
}

export interface TopEquipment {
  templateName: string;
  borrowCount: number;
}

export interface OverdueBooking {
  bookingId: string;
  studentCode: string;
  studentName: string;
  deviceName: string;
  serialNumber: string;
  expectedReturnTime: string;
  overdueDays: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getDashboardStats(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/stats`);
  }
}
