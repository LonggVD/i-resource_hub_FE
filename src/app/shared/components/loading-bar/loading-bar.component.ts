import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/api/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  templateUrl: './loading-bar.component.html',
  styleUrls: ['./loading-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingBarComponent {
  protected readonly loading = inject(LoadingService).loading;
}
