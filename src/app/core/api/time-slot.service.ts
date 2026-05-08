import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TimeSlotResponse {
  id: string;
  slotName: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number | null;
}

export interface TimeSlotRequest {
  slotName: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class TimeSlotService {
  private readonly apiUrl = `${environment.apiUrl}/time-slots`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TimeSlotResponse[]> {
    return this.http.get<TimeSlotResponse[]>(this.apiUrl);
  }

  getById(id: string): Observable<TimeSlotResponse> {
    return this.http.get<TimeSlotResponse>(`${this.apiUrl}/${id}`);
  }

  create(request: TimeSlotRequest): Observable<TimeSlotResponse> {
    return this.http.post<TimeSlotResponse>(this.apiUrl, request);
  }

  update(id: string, request: TimeSlotRequest): Observable<TimeSlotResponse> {
    return this.http.put<TimeSlotResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
