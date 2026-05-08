import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ResourceItemResponse,
  ResourceItemCreateRequest,
  ResourceItemBatchCreateRequest,
  ResourceItemUpdateRequest,
} from '../models/resource-item.model';

export interface ResourceItemFilter {
  templateId?: string;
  unitId?: string;
  status?: string;
  conditionStatus?: string;
  keyword?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ResourceItemService {
  private readonly apiUrl = `${environment.apiUrl}/resource-items`;

  constructor(private http: HttpClient) {}

  /** Lấy tất cả tài nguyên đang hoạt động */
  getAllActive(): Observable<ResourceItemResponse[]> {
    return this.http.get<ResourceItemResponse[]>(this.apiUrl);
  }

  /** Lọc tài nguyên theo tiêu chí (templateId, unitId, status, conditionStatus, keyword) */
  filter(criteria: ResourceItemFilter): Observable<ResourceItemResponse[]> {
    let params = new HttpParams();
    if (criteria.templateId) params = params.set('templateId', criteria.templateId);
    if (criteria.unitId) params = params.set('unitId', criteria.unitId);
    if (criteria.status) params = params.set('status', criteria.status);
    if (criteria.conditionStatus) params = params.set('conditionStatus', criteria.conditionStatus);
    if (criteria.keyword) params = params.set('keyword', criteria.keyword);
    return this.http.get<ResourceItemResponse[]>(`${this.apiUrl}/filter`, { params });
  }

  /** Lấy chi tiết tài nguyên theo id */
  getById(id: string): Observable<ResourceItemResponse> {
    return this.http.get<ResourceItemResponse>(`${this.apiUrl}/${id}`);
  }

  /** Quét mã vạch / QR Code để lấy thông tin thiết bị */
  getBySerialNumber(serialNumber: string): Observable<ResourceItemResponse> {
    return this.http.get<ResourceItemResponse>(`${this.apiUrl}/scan/${serialNumber}`);
  }

  /** Tạo tài nguyên lẻ */
  create(request: ResourceItemCreateRequest): Observable<ResourceItemResponse> {
    return this.http.post<ResourceItemResponse>(this.apiUrl, request);
  }

  /** Nhập hàng loạt tài nguyên */
  batchCreate(request: ResourceItemBatchCreateRequest): Observable<ResourceItemResponse[]> {
    return this.http.post<ResourceItemResponse[]>(`${this.apiUrl}/batch`, request);
  }

  /** Cập nhật tài nguyên */
  update(id: string, request: ResourceItemUpdateRequest): Observable<ResourceItemResponse> {
    return this.http.put<ResourceItemResponse>(`${this.apiUrl}/${id}`, request);
  }

  /** Xoá tài nguyên (xoá mềm) */
  softDelete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Khôi phục tài nguyên đã xoá */
  restore(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/restore`, {});
  }
}
