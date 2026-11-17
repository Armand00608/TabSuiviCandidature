import type { ISODate } from '@/domain/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale du jour au format `YYYY-MM-DD`. */
export function today(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse une date ISO `YYYY-MM-DD` en Date locale (minuit). */
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Nombre de jours de `from` à `to` (positif si `to` est après `from`). */
export function diffDays(from: ISODate, to: ISODate): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function isValidISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISODate(s);
  return !Number.isNaN(d.getTime()) && toISODate(d) === s;
}

/**
 * Accepte les formats courants saisis dans un tableur :
 * `2026-02-15`, `15/02/2026`, `15/02/26`, `15-02-2026`, `15.02.2026`.
 */
export function parseLooseDate(input: string): ISODate | null {
  const s = input.trim();
  if (!s) return null;
  if (isValidISODate(s as unknown)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!m) return null;
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const iso = `${year}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  return isValidISODate(iso) ? iso : null;
}

const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(s: ISODate | null | undefined): string {
  return s ? fmtShort.format(parseISODate(s)) : '';
}

export function formatLongDate(s: ISODate): string {
  return fmtLong.format(parseISODate(s));
}

/** Libellé relatif : "aujourd'hui", "demain", "dans 3 j", "il y a 2 j". */
export function relativeDays(target: ISODate, ref: ISODate): string {
  const d = diffDays(ref, target);
  if (d === 0) return "aujourd'hui";
  if (d === 1) return 'demain';
  if (d === -1) return 'hier';
  return d > 0 ? `dans ${d} j` : `il y a ${-d} j`;
}

export function formatDateTime(s: string): string {
  return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
