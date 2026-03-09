import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DateService {
  private dateSubject: BehaviorSubject<string>;

  constructor() {
    this.dateSubject = new BehaviorSubject<string>(this.isoLocal(new Date()));
  }

  get date$() { return this.dateSubject.asObservable(); }

  get currentDate(): string { return this.dateSubject.value; }

  getDate(): string { return this.dateSubject.value; }

  setDate(date: string) { this.dateSubject.next(date); }

  isoLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
