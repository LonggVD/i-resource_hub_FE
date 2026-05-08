import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiDialogContext, TuiLoader, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { PenaltyResponse } from '../../../core/api/penalty.service';
import { EvidenceService, EvidenceResponse } from '../../../core/api/evidence.service';
import { IrhImage } from '../../../shared/components/irh-image/irh-image.component';
import { environment } from '../../../../environments/environment';
import { TuiCopyDirective } from '@taiga-ui/kit';

@Component({
  selector: 'app-penalty-detail-dialog',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiLoader, IrhImage, TuiCopyDirective, TuiIcon],
  templateUrl: './penalty-detail-dialog.component.html',
  styleUrls: ['./penalty-detail-dialog.component.css'],
})
export class PenaltyDetailDialogComponent implements OnInit {
  readonly context = inject<TuiDialogContext<void, PenaltyResponse>>(POLYMORPHEUS_CONTEXT);
  private evidenceService = inject(EvidenceService);

  isLoading = signal<boolean>(false);
  evidences = signal<EvidenceResponse[]>([]);

  ngOnInit() {
    // Backend đã trả về đầy đủ List<EvidenceResponse> trong PenaltyResponse.evidences
  }

  splitImages(imageUrl: string | string[] | undefined): string[] {
    if (!imageUrl) return [];
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    const images = Array.isArray(imageUrl) ? imageUrl : imageUrl.split(',');

    return images
      .map((url) => {
        let trimmed = url.trim();
        if (trimmed.startsWith('/') && !trimmed.startsWith('http')) {
          return baseUrl + trimmed;
        }
        return trimmed;
      })
      .filter((url) => !!url);
  }
}
