import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private readonly uploadUrl = `${environment.apiUrl}/files/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Upload một hoặc nhiều file ảnh, trả về mảng URL trên server.
   */
  uploadImages(files: File[]): Observable<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<string[]>(this.uploadUrl, formData);
  }
}
