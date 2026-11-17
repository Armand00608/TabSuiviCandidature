import type { Application, StatusCategory, Tracker } from './types';
import { getStatus, isOpenCategory } from './status';
import { nextFollowUpDate } from './automation';

export type SortKey = 'priority' | 'company' | 'city' | 'sentAt' | 'followUp' | 'status' | 'updatedAt';

export interface Query {
  search: string;
  category: StatusCategory | 'all' | 'open';
  type: string;
  sort: SortKey;
  desc: boolean;
}

export const DEFAULT_QUERY: Query = { search: '', category: 'open', type: '', sort: 'priority', desc: false };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterApplications(apps: Application[], tracker: Tracker, q: Query): Application[] {
  const terms = norm(q.search).split(/\s+/).filter(Boolean);
  return apps.filter((a) => {
    const cat = getStatus(tracker, a.statusId).category;
    if (q.category === 'open' && !isOpenCategory(cat)) return false;
    if (q.category !== 'all' && q.category !== 'open' && cat !== q.category) return false;
    if (q.type && a.type !== q.type) return false;
    if (terms.length) {
      const hay = norm(
        [a.company, a.city, a.position, a.contactName, a.contactInfo, a.nextAction, a.notes, ...Object.values(a.custom)].join(' '),
      );
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

/**
 * Tri "priorité" (par défaut) : favoris, puis relances les plus urgentes,
 * puis échéances, puis ordre du pipeline.
 */
export function sortApplications(apps: Application[], tracker: Tracker, sort: SortKey, desc: boolean): Application[] {
  const statusIndex = new Map(tracker.statuses.map((s, i) => [s.id, i]));
  const far = '9999-12-31';
  const key = (a: Application): (string | number)[] => {
    switch (sort) {
      case 'priority':
        return [
          a.starred ? 0 : 1,
          isOpenCategory(getStatus(tracker, a.statusId).category) ? 0 : 1,
          [nextFollowUpDate(a, tracker), a.dueDate].filter(Boolean).sort()[0] ?? far,
          statusIndex.get(a.statusId) ?? 99,
          a.company.toLowerCase(),
        ];
      case 'company':
        return [a.company.toLowerCase()];
      case 'city':
        return [a.city.toLowerCase(), a.company.toLowerCase()];
      case 'sentAt':
        return [a.sentAt ?? far];
      case 'followUp':
        return [nextFollowUpDate(a, tracker) ?? far];
      case 'status':
        return [statusIndex.get(a.statusId) ?? 99, a.company.toLowerCase()];
      case 'updatedAt':
        return [a.updatedAt];
    }
  };
  const cmp = (x: (string | number)[], y: (string | number)[]) => {
    for (let i = 0; i < x.length; i++) {
      if (x[i] < y[i]) return -1;
      if (x[i] > y[i]) return 1;
    }
    return 0;
  };
  const sorted = [...apps].sort((a, b) => cmp(key(a), key(b)));
  return desc ? sorted.reverse() : sorted;
}
