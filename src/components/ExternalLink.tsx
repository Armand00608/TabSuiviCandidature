import type { ReactNode } from 'react';
import { linkLabel, toHref } from '@/lib/links';

/**
 * Lien externe (offre, profil LinkedIn, email). Ouvre un nouvel onglet et
 * n'ouvre pas la fiche quand il est cliqué dans une ligne du tableau.
 * Si la valeur n'est pas un lien, elle est affichée telle quelle.
 */
export function ExternalLink({ value, children, className }: { value: string; children?: ReactNode; className?: string }) {
  const href = toHref(value);
  if (!href) return <>{children ?? value}</>;
  const isMail = href.startsWith('mailto:');
  return (
    <a
      href={href}
      target={isMail ? undefined : '_blank'}
      rel="noreferrer noopener"
      className={className}
      title={href}
      onClick={(e) => e.stopPropagation()}
    >
      {children ?? linkLabel(href)}
    </a>
  );
}
