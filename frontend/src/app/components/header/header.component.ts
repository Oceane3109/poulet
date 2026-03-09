import { Component } from '@angular/core';
import { DateService } from '../../services/date.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  styles: [`:host { display: contents; }`],
  template: `
    <div class="header-left">
      <div class="header-search">
        <i class="bi bi-search"></i>
        <input type="text" placeholder="Rechercher..." />
      </div>
    </div>
    <div class="header-right">
      <div class="header-date">
        <i class="bi bi-calendar3"></i>
        <input type="date" [ngModel]="dateService.currentDate" (ngModelChange)="onDateChange($event)" />
      </div>
    </div>
  `
})
export class HeaderComponent {
  constructor(public dateService: DateService) {}

  onDateChange(date: string) {
    this.dateService.setDate(date);
  }
}
