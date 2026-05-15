import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, LoadingBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('i-resource_hub_FE');
}
