import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Category, CategoryCreateRequest } from '../models/category.model';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/categories`;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}
  //lấy tất cả danh mục
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  //thêm danh mục
  createCategory(category: CategoryCreateRequest): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category);
  }

  //cập nhật danh mục
  updateCategory(id: string, category: CategoryCreateRequest): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category);
  }

  //xoá danh mục
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  //lấy danh sách đã bị xoá mềm
  getDeletedCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/deleted`);
  }
  //khôi phục danh mục đã bị xoá mềm
  restoreCategory(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/restore`, {});
  }

  //xoá vĩnh viễn danh mục đã bị xoá mềm
  permanentlyDeleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/permanent`);
  }
}
