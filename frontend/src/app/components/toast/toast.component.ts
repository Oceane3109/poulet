import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of (toastService.toasts$ | async); track toast.id) {
        <div class="toast" [ngClass]="'toast-' + toast.type">
          <i class="bi" [ngClass]="{
            'bi-check-circle': toast.type === 'success',
            'bi-exclamation-triangle': toast.type === 'warning',
            'bi-x-circle': toast.type === 'danger',
            'bi-info-circle': toast.type === 'info'
          }"></i>
          {{ toast.message }}
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
