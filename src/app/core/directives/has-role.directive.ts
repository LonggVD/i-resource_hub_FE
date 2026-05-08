import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthService } from '../api/auth.service';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private roles: string[] = [];
  private hasView = false;

  @Input() set hasRole(val: string | string[]) {
    this.roles = Array.isArray(val) ? val : [val];
    this.updateView();
  }

  constructor() {
    // Re-evaluate whenever user roles change
    effect(() => {
      const currentRoles = this.authService.roles();
      this.updateView();
    });
  }

  private updateView() {
    const isAuthorized = this.authService.hasAnyRole(this.roles);

    if (isAuthorized && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isAuthorized && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
