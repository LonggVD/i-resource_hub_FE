import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiDialogContext, TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { GroupedBooking } from '../../../core/models/booking.model';
import { EvidenceService, EvidenceResponse } from '../../../core/api/evidence.service';
import { IrhImage } from '../../../shared/components/irh-image/irh-image.component';

@Component({
  selector: 'app-booking-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiBadge,
    TuiLoader,
    IrhImage,
  ],
  templateUrl: './booking-detail-dialog.component.html',
  styleUrls: ['./booking-detail-dialog.component.css'],
})
export class BookingDetailDialogComponent implements OnInit {
  private readonly context = inject<TuiDialogContext<boolean, GroupedBooking>>(POLYMORPHEUS_CONTEXT);
  private readonly evidenceService = inject(EvidenceService);

  group: GroupedBooking;
  evidences = signal<EvidenceResponse[]>([]);
  isLoadingEvidences = signal(true);

  constructor() {
    this.group = this.context.data;
  }

  ngOnInit() {
    this.loadEvidences();
  }

  loadEvidences() {
    const bookingIds = this.group.items.map((i) => i.id);
    if (bookingIds.length === 0) {
      this.isLoadingEvidences.set(false);
      return;
    }

    this.evidenceService.getEvidencesByBookings(bookingIds).subscribe({
      next: (res) => {
        this.evidences.set(res);
        this.isLoadingEvidences.set(false);
      },
      error: () => {
        this.isLoadingEvidences.set(false);
      },
    });
  }

  getEvidencesForBooking(bookingId: string) {
    return this.evidences().filter((e) => e.bookingId === bookingId);
  }

  getEvidenceUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('assets/')) return url;

    if (url.startsWith('/api/')) {
      return `http://localhost:2811${url}`;
    }

    return `/assets/images/damaged/${url}`;
  }

  splitUrls(urls: string | null | undefined): string[] {
    if (!urls) return [];
    return urls.split(',').map((u) => u.trim()).filter((u) => u.length > 0);
  }

  close() {
    this.context.completeWith(false);
  }
}
