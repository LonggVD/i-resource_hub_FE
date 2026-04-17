import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal, model, ElementRef, viewChild } from '@angular/core';
import { TuiButton, TuiIcon, TuiHint } from '@taiga-ui/core';
import { TuiDialog } from '@taiga-ui/experimental';

@Component({
  selector: 'irh-image',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon, TuiHint, TuiDialog, DecimalPipe],
  templateUrl: './irh-image.component.html',
  styleUrl: './irh-image.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IrhImage {
  // --- Inputs ---
  public readonly src = input.required<string>();
  public readonly alt = input<string>('');
  public readonly className = input<string>('');
  public readonly width = input<string | number>('100%');
  public readonly height = input<string | number>('auto');
  public readonly showPreviewOnClick = input<boolean>(true);

  // --- States ---
  public readonly openPreview = model(false);
  public readonly zoomLevel = signal(1);
  
  // --- Pan State ---
  public readonly translateX = signal(0);
  public readonly translateY = signal(0);
  public readonly isDragging = signal(false);
  private startX = 0;
  private startY = 0;

  // --- Actions ---
  public togglePreview(state: boolean): void {
    if (!state || this.showPreviewOnClick()) {
      this.openPreview.set(state);
      if (!state) {
        this.resetView(); // Reset both zoom and pan when closing
      }
    }
  }

  public zoomIn(): void {
    this.zoomLevel.update(v => Math.min(v + 0.25, 4));
  }

  public zoomOut(): void {
    this.zoomLevel.update(v => {
      const newZoom = Math.max(v - 0.25, 0.5);
      if (newZoom <= 1.1) this.resetPan(); // Centering if zoom is low
      return newZoom;
    });
  }

  public resetView(): void {
    this.zoomLevel.set(1);
    this.resetPan();
  }

  private resetPan(): void {
    this.translateX.set(0);
    this.translateY.set(0);
  }

  public downloadImage(): void {
    const link = document.createElement('a');
    link.href = this.src();
    link.download = this.alt() || 'downloaded-image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Pan Logic ---
  public onMouseDown(event: MouseEvent): void {
    if (this.zoomLevel() <= 1) return; // Only pan when zoomed in
    
    this.isDragging.set(true);
    this.startX = event.clientX - this.translateX();
    this.startY = event.clientY - this.translateY();
    
    // Prevent image ghost dragging
    event.preventDefault();
  }

  public onMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;
    
    this.translateX.set(event.clientX - this.startX);
    this.translateY.set(event.clientY - this.startY);
  }

  public onMouseUp(): void {
    this.isDragging.set(false);
  }

  public onMouseLeave(): void {
    this.isDragging.set(false);
  }
}
