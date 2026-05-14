import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  exportBookingExcel(from: string, to: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/bookings/excel`, {
      params: { from, to },
      responseType: 'blob',
    });
  }

  exportBookingPdf(from: string, to: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/bookings/pdf`, {
      params: { from, to },
      responseType: 'blob',
    });
  }

  /** Tải Blob xuống máy với tên file chỉ định */
  download(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}
