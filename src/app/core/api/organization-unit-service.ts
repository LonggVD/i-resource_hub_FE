import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OrganizationUnitCreateRequest,
  OrganizationUnitResponse,
  OrganizationUnitUpdateRequest,
} from '../models/organization-unit.model';

@Injectable({
  providedIn: 'root',
})
export class OrganizationUnitService {
  private readonly apiUrl = `${environment.apiUrl}/organization-units`;

  constructor(private http: HttpClient) {}

  getAllUnits(): Observable<OrganizationUnitResponse[]> {
    return this.http.get<OrganizationUnitResponse[]>(this.apiUrl);
  }

  createUnit(request: OrganizationUnitCreateRequest): Observable<OrganizationUnitResponse> {
    return this.http.post<OrganizationUnitResponse>(this.apiUrl, request);
  }

  updateUnit(id: string, request: OrganizationUnitUpdateRequest): Observable<OrganizationUnitResponse> {
    return this.http.put<OrganizationUnitResponse>(`${this.apiUrl}/${id}`, request);
  }

  deleteUnit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
