import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentLinkResponse {
  checkoutUrl: string;
  qrCode: string;
  orderCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payments`;

  createPenaltyPayment(penaltyId: string): Observable<PaymentLinkResponse> {
    return this.http.post<PaymentLinkResponse>(`${this.apiUrl}/penalty/${penaltyId}`, {});
  }

  verifyPayment(orderCode: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/verify/${orderCode}`, {}, { responseType: 'text' });
  }
}
