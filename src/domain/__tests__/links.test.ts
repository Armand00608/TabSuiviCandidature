import { describe, expect, it } from 'vitest';
import { linkLabel, toHref } from '@/lib/links';

describe('liens', () => {
  it.each([
    ['https://www.enedis.fr/emploi/1', 'https://www.enedis.fr/emploi/1'],
    ['jobs.yeswehack.com', 'https://jobs.yeswehack.com'],
    ['www.linkedin.com/in/test', 'https://www.linkedin.com/in/test'],
    ['rh@acme.fr', 'mailto:rh@acme.fr'],
    ['Thibaud Passet', null],
    ['', null],
  ])('%s -> %s', (input, expected) => expect(toHref(input)).toBe(expected));

  it('affiche le domaine', () => {
    expect(linkLabel('https://www.linkedin.com/jobs/view/1')).toBe('linkedin.com');
    expect(linkLabel('mailto:rh@acme.fr')).toBe('rh@acme.fr');
  });
});
