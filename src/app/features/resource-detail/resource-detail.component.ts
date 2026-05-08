import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiButton, TuiIcon, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { ResourceTemplateService } from '../../core/api/resource-template-service';
import { ResourceTemplate } from '../../core/models/resource-template.model';
import { BookingService } from '../../core/api/booking.service';
import { CartService } from '../../core/service/cart.service';
import { IrhSelect } from '../../shared/components/irh-select/irh-select.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiBadge } from '@taiga-ui/kit';

import { IrhImage } from '../../shared/components/irh-image/irh-image.component';
import { NotificationService } from '../../core/api/notification';

@Component({
  selector: 'app-resource-detail',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    IrhSelect,
    ReactiveFormsModule,
    TuiScrollbar,
    TuiBadge,
    IrhImage,
  ],
  templateUrl: './resource-detail.component.html',
  styleUrl: './resource-detail.component.css',
})
export class ResourceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private resourceService = inject(ResourceTemplateService);
  private cartService = inject(CartService);

  private notificationService = inject(NotificationService);

  readonly resource = signal<ResourceTemplate | null>(null);
  readonly isLoading = signal(false);

  readonly bookingForm = new FormGroup({
    quantity: new FormControl(1, [Validators.required, Validators.min(1)]),
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDetail(id);
    }
  }

  loadDetail(id: string) {
    this.isLoading.set(true);
    this.resourceService.getById(id).subscribe({
      next: (data) => {
        this.resource.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/student-shop']);
      },
    });
  }

  updateQty(delta: number) {
    const current = this.bookingForm.get('quantity')?.value || 1;
    const available = this.resource()?.availableQuantity || 1;
    const newValue = Math.min(Math.max(1, current + delta), available);
    this.bookingForm.get('quantity')?.setValue(newValue);
  }

  addToCart(item: ResourceTemplate) {
    const qty = this.bookingForm.get('quantity')?.value || 1;
    this.cartService.addToCart(item, qty);
    this.notificationService.showSuccess(`Đã thêm ${qty} ${item.name} vào giỏ hàng!`);
  }

  onQuickBook(item: ResourceTemplate) {
    this.addToCart(item);
    this.router.navigate(['/cart']);
  }

  goBack() {
    this.router.navigate(['/student-shop']);
  }
}
