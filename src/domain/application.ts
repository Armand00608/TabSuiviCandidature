import type { Application, Tracker } from './types';
import type { Clock } from './automation';
import { refreshAutoFields } from './automation';
import { uid } from '@/lib/id';

export type NewApplicationInput = Partial<
  Pick<
    Application,
    | 'company' | 'city' | 'type' | 'position' | 'contactName' | 'contactInfo' | 'sentAt' | 'followUps'
    | 'statusId' | 'nextAction' | 'dueDate' | 'link' | 'notes' | 'custom' | 'starred'
  >
>;

export function createApplication(tracker: Tracker, input: NewApplicationInput, clock: Clock): Application {
  const nextAction = input.nextAction?.trim() ?? '';
  const statusId =
    input.statusId && tracker.statuses.some((s) => s.id === input.statusId) ? input.statusId : tracker.statuses[0]?.id ?? '';
  const app: Application = {
    id: uid('app'),
    trackerId: tracker.id,
    company: input.company?.trim() ?? '',
    city: input.city?.trim() ?? '',
    type: input.type ?? tracker.applicationTypes[0] ?? '',
    position: input.position?.trim() ?? '',
    contactName: input.contactName?.trim() ?? '',
    contactInfo: input.contactInfo?.trim() ?? '',
    sentAt: input.sentAt ?? null,
    followUps: input.followUps ? [...input.followUps].sort() : [],
    statusId,
    nextAction,
    nextActionIsAuto: nextAction === '',
    dueDate: input.dueDate ?? null,
    link: input.link?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    custom: { ...(input.custom ?? {}) },
    starred: input.starred ?? false,
    history: [{ id: uid('h'), at: clock.now, kind: 'created', message: 'Candidature ajoutée' }],
    createdAt: clock.now,
    updatedAt: clock.now,
  };
  return refreshAutoFields(app, tracker, clock);
}
