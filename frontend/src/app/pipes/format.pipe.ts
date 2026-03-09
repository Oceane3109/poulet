import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatNumber', standalone: true })
export class FormatNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '-';
    return value.toLocaleString('fr-FR');
  }
}

@Pipe({ name: 'formatAr', standalone: true })
export class FormatArPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '-';
    return value.toLocaleString('fr-FR') + ' Ar';
  }
}

@Pipe({ name: 'formatDate', standalone: true })
export class FormatDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
