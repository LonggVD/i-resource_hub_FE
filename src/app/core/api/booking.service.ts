import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, BookingStatus, TimeSlot } from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly apiUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  // Lấy đơn mượn của riêng Sinh viên hiện tại
  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/my`);
  }

  // Lấy danh sách khung giờ
  getTimeSlots(): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${environment.apiUrl}/time-slots`);
  }

  // Lấy danh sách booking (Toàn bộ - dành cho SuperAdmin)
  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.apiUrl);
  }

  // Lấy danh sách booking theo Đơn vị (Dành cho bảng Kanban)
  getKanbanBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/kanban`);
  }

  // Đặt lịch mới (Dùng templateId thay vì itemId để tránh tranh chấp)
  createBooking(request: {
    resourceTemplateId: string;
    bookingDate: string;
    slotId: string;
    quantity?: number;
    purpose?: string;
  }): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, request);
  }

  // Mượn nhiều loại thiết bị cùng lúc (Bulk)
  createBulkBookings(request: {
    items: Array<{ 
      resourceTemplateId: string; 
      quantity: number; 
      bookingDate: string; 
      slotId: string 
    }>;
    purpose?: string;
  }): Observable<string> {
    return this.http.post(`${this.apiUrl}/bulk`, request, { responseType: 'text' });
  }

  // Phê duyệt / Từ chối
  processAction(
    bookingId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
  ): Observable<string> {
    return this.http.put(
      `${this.apiUrl}/${bookingId}/process`,
      { action, reason },
      { responseType: 'text' },
    );
  }

  // Hủy đơn (Bắt buộc kèm lý do từ Rule 1)
  cancelBooking(bookingId: string, reason: string): Observable<string> {
    return this.http.put(
      `${this.apiUrl}/${bookingId}/cancel`,
      {},
      {
        params: new HttpParams().set('reason', reason),
        responseType: 'text',
      },
    );
  }

  // Bàn giao (Check-in qua QR)
  checkIn(token: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/check-in`,
      {},
      {
        params: new HttpParams().set('token', token),
        responseType: 'text',
      },
    );
  }

  // Trả đồ (Check-out)
  checkOut(request: any): Observable<string> {
    return this.http.post(`${this.apiUrl}/check-out`, request, { responseType: 'text' });
  }

  // Thêm minh chứng bổ sung (Rule bổ sung: Add Evidence)
  addEvidence(request: {
    bookingId: string;
    description: string;
    imageUrls: string[];
  }): Observable<string> {
    return this.http.post(`${this.apiUrl}/evidence`, request, { responseType: 'text' });
  }
}
