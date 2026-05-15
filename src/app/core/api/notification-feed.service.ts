import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { SKIP_LOADING } from '../interceptors/loading.interceptor';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  referenceId: string | null;
  title: string;
  content: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

const TOKEN_KEY = 'auth_token';

/**
 * Quản lý feed notification (chuông). REST + STOMP real-time.
 *  - Connect STOMP khi gọi connect() (sau khi user đã login)
 *  - Subscribe /user/queue/notifications → tự push vào signal `items`
 *  - Disconnect khi logout
 */
@Injectable({ providedIn: 'root' })
export class NotificationFeedService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private readonly wsUrl = environment.apiUrl.replace(/\/api$/, '') + '/ws';

  private readonly _items = signal<NotificationItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly unreadCount = computed(() => this._items().filter((n) => !n.read).length);

  private stompClient: Client | null = null;
  private subscription: StompSubscription | null = null;

  // ===== REST =====
  // Tất cả call notification chạy nền — không hiển thị thanh loading toàn cục
  private silent(): { context: HttpContext } {
    return { context: new HttpContext().set(SKIP_LOADING, true) };
  }

  loadInitial(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.apiUrl}/my`, this.silent()).pipe(
      tap((list) => this._items.set(list)),
    );
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {}, this.silent()).pipe(
      tap(() => {
        this._items.update((arr) =>
          arr.map((n) =>
            n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
          ),
        );
      }),
    );
  }

  markAllAsRead(): Observable<{ updated: number }> {
    return this.http.put<{ updated: number }>(`${this.apiUrl}/read-all`, {}, this.silent()).pipe(
      tap(() => {
        const now = new Date().toISOString();
        this._items.update((arr) => arr.map((n) => ({ ...n, read: true, readAt: now })));
      }),
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.silent()).pipe(
      tap(() => this._items.update((arr) => arr.filter((n) => n.id !== id))),
    );
  }

  // ===== WebSocket STOMP =====

  connect() {
    if (this.stompClient && this.stompClient.active) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    this.stompClient = new Client({
      // SockJS factory cho fallback
      webSocketFactory: () => new SockJS(this.wsUrl) as any,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {
        // tắt log debug
      },
      onConnect: () => {
        // Subscribe destination user-specific
        this.subscription = this.stompClient!.subscribe(
          '/user/queue/notifications',
          (msg: IMessage) => {
            try {
              const item = JSON.parse(msg.body) as NotificationItem;
              this._items.update((arr) => [item, ...arr]);
            } catch (e) {
              // ignore parse error
            }
          },
        );
      },
      onStompError: (frame) => {
        console.warn('STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (e) => {
        console.warn('WebSocket error', e);
      },
    });

    this.stompClient.activate();
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    this._items.set([]);
  }
}
