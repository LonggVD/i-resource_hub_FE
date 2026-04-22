import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ResourceTemplate } from '../models/resource-template.model';
import { TimeSlot } from '../models/booking.model';
import { TuiDay } from '@taiga-ui/cdk';
import { map, tap } from 'rxjs';

export interface CartItem {
  id: string; // ID của CartItem trong DB
  resource: ResourceTemplate;
  quantity: number;
  bookingDate: TuiDay;
  slot: TimeSlot | null;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cart`;

  // ── Signals ──────────────────────────────────────────────
  private readonly cartItems = signal<CartItem[]>([]);

  constructor() {
    this.loadCart();
  }

  // ── Computed ─────────────────────────────────────────────
  public readonly items = computed(() => this.cartItems());
  public readonly count = computed(() => 
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );
  public readonly isEmpty = computed(() => this.cartItems().length === 0);

  // ── Actions ──────────────────────────────────────────────
  loadCart() {
    this.http.get<any[]>(this.apiUrl).pipe(
      map(items => items.map(item => ({
        id: item.id,
        resource: { id: item.resourceTemplateId, name: item.resourceName, imageUrl: item.imageUrl, unit: { unitName: item.unitName } } as any,
        quantity: item.quantity,
        bookingDate: item.bookingDate ? this.parseDate(item.bookingDate) : TuiDay.currentLocal(),
        slot: item.slotId ? { id: item.slotId, slotName: item.slotName } as any : null
      })))
    ).subscribe(data => this.cartItems.set(data));
  }

  addToCart(resource: ResourceTemplate, quantity: number = 1) {
    const params = new HttpParams()
      .set('templateId', resource.id)
      .set('quantity', quantity.toString());

    this.http.post(this.apiUrl, {}, { params }).subscribe(() => {
      this.loadCart(); // Reload để lấy ID chính xác từ DB
    });
  }

  removeFromCart(cartItemId: string) {
    this.http.delete(`${this.apiUrl}/${cartItemId}`).subscribe(() => {
      this.cartItems.update(prev => prev.filter(item => item.id !== cartItemId));
    });
  }

  updateQuantity(cartItemId: string, quantity: number) {
    const params = new HttpParams().set('quantity', quantity.toString());
    this.http.put(`${this.apiUrl}/${cartItemId}`, {}, { params }).subscribe(() => {
      this.cartItems.update(prev => prev.map(item => 
        item.id === cartItemId ? { ...item, quantity } : item
      ));
    });
  }

  updateItemDetails(cartItemId: string, bookingDate: TuiDay, slot: TimeSlot | null) {
    const dateStr = `${bookingDate.year}-${String(bookingDate.month + 1).padStart(2, '0')}-${String(bookingDate.day).padStart(2, '0')}`;
    let params = new HttpParams().set('date', dateStr);
    if (slot) params = params.set('slotId', slot.id);

    this.http.put(`${this.apiUrl}/${cartItemId}`, {}, { params }).subscribe(() => {
      this.cartItems.update(prev => prev.map(item => 
        item.id === cartItemId ? { ...item, bookingDate, slot } : item
      ));
    });
  }

  clearCart() {
    this.http.delete(`${this.apiUrl}/clear`).subscribe(() => {
      this.cartItems.set([]);
    });
  }

  private parseDate(dateStr: string): TuiDay {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new TuiDay(y, m - 1, d);
  }
}

