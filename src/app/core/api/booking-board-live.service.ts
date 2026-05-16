import { Injectable, signal } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'auth_token';
const TOPIC = '/topic/bookings-board-changed';

/**
 * Nhận tín hiệu "bookings đã thay đổi" từ BE. Payload không dùng (chỉ timestamp);
 * component tự gọi REST getKanbanBookings() để lấy dữ liệu đã lọc theo unit.
 */
@Injectable({ providedIn: 'root' })
export class BookingBoardLiveService {
  private readonly wsUrl = environment.apiUrl.replace(/\/api$/, '') + '/ws';

  readonly connected = signal(false);

  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  private handler: (() => void) | null = null;

  connect(handler: () => void): void {
    this.handler = handler;
    if (this.client && this.client.active) {
      this.resubscribe();
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(this.wsUrl) as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
      onConnect: () => {
        this.connected.set(true);
        this.resubscribe();
      },
      onDisconnect: () => this.connected.set(false),
      onWebSocketClose: () => this.connected.set(false),
      onStompError: (frame) => {
        console.warn('Board STOMP error', frame.headers['message'], frame.body);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.handler = null;
    this.connected.set(false);
  }

  private resubscribe(): void {
    if (!this.client || !this.client.active || !this.handler) return;
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.subscription = this.client.subscribe(TOPIC, () => {
      this.handler?.();
    });
  }
}
