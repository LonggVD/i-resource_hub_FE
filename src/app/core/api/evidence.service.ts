import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EvidenceResponse {
  id: string;
  bookingId: string;
  resourceItemId: string;
  evidenceType: string;
  imageUrl: string;
  description: string;
  resolution: string;
  isResolved: boolean;
  createdBy: string;
  createdAt: string;
  borrowerName?: string;
  borrowerId?: string;
  userId?: string;
  serialNumber?: string;
  deviceName?: string;
  ownerUnitName?: string;
}

export interface EvidenceRequest {
  bookingId: string;
  evidenceType: string; // 'CHECK_IN' | 'CHECK_OUT' | 'DAMAGE'
  imageUrl: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class EvidenceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/evidences`;

  addEvidence(request: EvidenceRequest): Observable<EvidenceResponse> {
    return this.http.post<EvidenceResponse>(this.apiUrl, request);
  }

  getEvidencesByBooking(bookingId: string): Observable<EvidenceResponse[]> {
    return this.http.get<EvidenceResponse[]>(`${this.apiUrl}/booking/${bookingId}`);
  }

  getEvidencesByBookings(bookingIds: string[]): Observable<EvidenceResponse[]> {
    return this.http.get<EvidenceResponse[]>(`${this.apiUrl}/bookings`, {
      params: { bookingIds: bookingIds.join(',') }
    });
  }
}
