import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ResourceTemplate,
  ResourceTemplateCreateRequest,
  ResourceTemplateUpdateRequest,
} from '../models/resource-template.model';

@Injectable({
  providedIn: 'root',
})
export class ResourceTemplateService {
  private readonly apiUrl = `${environment.apiUrl}/resource-templates`;

  constructor(private http: HttpClient) {}

  /** Lấy tất cả resource template đang hoạt động */
  getAllActive(): Observable<ResourceTemplate[]> {
    return this.http.get<ResourceTemplate[]>(this.apiUrl);
  }

  /** Lấy danh sách resource template đã bị xoá mềm */
  getAllDeleted(): Observable<ResourceTemplate[]> {
    return this.http.get<ResourceTemplate[]>(`${this.apiUrl}/deleted`);
  }

  /** Lấy chi tiết 1 resource template theo id */
  getById(id: string): Observable<ResourceTemplate> {
    return this.http.get<ResourceTemplate>(`${this.apiUrl}/${id}`);
  }

  /** Tạo resource template mới */
  create(request: ResourceTemplateCreateRequest): Observable<ResourceTemplate> {
    return this.http.post<ResourceTemplate>(this.apiUrl, request);
  }

  /** Cập nhật resource template */
  update(id: string, request: ResourceTemplateUpdateRequest): Observable<ResourceTemplate> {
    return this.http.put<ResourceTemplate>(`${this.apiUrl}/${id}`, request);
  }

  /** Xoá mềm resource template */
  softDelete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Khôi phục resource template đã bị xoá mềm */
  restore(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/restore`, {});
  }
}
