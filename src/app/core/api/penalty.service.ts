import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvidenceResponse } from './evidence.service';

export interface PenaltyRequest {
  userId: string;
  bookingId?: string;
  penaltyType: string;
  penaltyPoint: number;
  description: string;
  fineAmount?: number;
  requiresReview?: boolean;
}

export interface PenaltyResponse {
  id: string;
  userId: string;
  studentCode: string;
  studentName: string;
  bookingId: string;
  penaltyType: string;
  penaltyPoint: number;
  description: string;
  status: string;
  createdByName: string;
  createdAt: string;
  currentCreditScore: number;
  userStatus: string;
  totalActivePenalties: number;
  evidences?: EvidenceResponse[];
  fineAmount?: number;
  requiresReview?: boolean;
  reviewStatus?: string;
  bookingBatchToken?: string;
  bookingDate?: string;
  bookingSlot?: string;
  bookingDeviceName?: string;
  thumbnailUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PenaltyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/penalties`;

  createPenalty(request: PenaltyRequest): Observable<PenaltyResponse> {
    return this.http.post<PenaltyResponse>(this.apiUrl, request);
  }

  getAllPenalties(): Observable<PenaltyResponse[]> {
    return this.http.get<PenaltyResponse[]>(this.apiUrl);
  }

  getPenaltyById(penaltyId: string): Observable<PenaltyResponse> {
    return this.http.get<PenaltyResponse>(`${this.apiUrl}/${penaltyId}`);
  }

  getPenaltiesByUser(userId: string): Observable<PenaltyResponse[]> {
    return this.http.get<PenaltyResponse[]>(`${this.apiUrl}/user/${userId}`);
  }

  revokePenalty(penaltyId: string): Observable<PenaltyResponse> {
    return this.http.patch<PenaltyResponse>(`${this.apiUrl}/${penaltyId}/revoke`, {});
  }

  deletePenalty(penaltyId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${penaltyId}`);
  }
}
