import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _pendingCount = signal(0);
  readonly loading = computed(() => this._pendingCount() > 0);

  increment(): void {
    this._pendingCount.update((c) => c + 1);
  }

  decrement(): void {
    this._pendingCount.update((c) => Math.max(0, c - 1));
  }
}
