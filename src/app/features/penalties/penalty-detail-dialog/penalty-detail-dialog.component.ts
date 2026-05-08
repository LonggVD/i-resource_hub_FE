import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiDialogContext, TuiLoader, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { PenaltyResponse } from '../../../core/api/penalty.service';
import { IrhImage } from '../../../shared/components/irh-image/irh-image.component';
import { environment } from '../../../../environments/environment';

interface GalleryImage {
  url: string;
  evidenceType: string;
  createdAt: string;
  description?: string;
}

@Component({
  selector: 'app-penalty-detail-dialog',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiLoader, IrhImage, TuiIcon],
  templateUrl: './penalty-detail-dialog.component.html',
  styleUrls: ['./penalty-detail-dialog.component.css'],
})
export class PenaltyDetailDialogComponent implements OnInit {
  readonly context = inject<TuiDialogContext<void, PenaltyResponse>>(POLYMORPHEUS_CONTEXT);

  isLoading = signal<boolean>(false);
  currentIndex = signal<number>(0);

  // Flatten tất cả ảnh từ mọi evidence thành 1 gallery liên tục
  galleryImages = computed<GalleryImage[]>(() => {
    const evidences = this.context.data.evidences ?? [];
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    const result: GalleryImage[] = [];

    for (const ev of evidences) {
      const urls = this.splitImageUrl(ev.imageUrl, baseUrl);
      for (const url of urls) {
        result.push({
          url,
          evidenceType: ev.evidenceType,
          createdAt: ev.createdAt,
          description: ev.description,
        });
      }
    }
    return result;
  });

  currentImage = computed<GalleryImage | null>(() => {
    const images = this.galleryImages();
    if (images.length === 0) return null;
    const idx = Math.min(this.currentIndex(), images.length - 1);
    return images[idx];
  });

  ngOnInit() {
    // Backend đã trả về đầy đủ List<EvidenceResponse> trong PenaltyResponse.evidences
  }

  selectImage(index: number) {
    this.currentIndex.set(index);
  }

  prev() {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.currentIndex.update((i) => (i - 1 + total) % total);
  }

  next() {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.currentIndex.update((i) => (i + 1) % total);
  }

  formatType(type: string): string {
    if (type === 'PENALTY_PROOF') return 'Xử phạt';
    if (type === 'DAMAGE') return 'Hư hỏng';
    if (type === 'CHECK_OUT') return 'Trả đồ';
    if (type === 'CHECK_IN') return 'Bàn giao';
    return type;
  }

  private splitImageUrl(imageUrl: string | string[] | undefined, baseUrl: string): string[] {
    if (!imageUrl) return [];
    const images = Array.isArray(imageUrl) ? imageUrl : imageUrl.split(',');
    return images
      .map((url) => {
        const trimmed = url.trim();
        if (trimmed.startsWith('/') && !trimmed.startsWith('http')) {
          return baseUrl + trimmed;
        }
        return trimmed;
      })
      .filter((url) => !!url);
  }
}
