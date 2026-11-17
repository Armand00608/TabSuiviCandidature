import type { ReactNode } from 'react';
import { linkLabel, splitLinks, toHref } from '@/lib/links';

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

/** Plusieurs coordonnées dans un même champ (email + LinkedIn…), chacune cliquable. */
export function ContactLinks({ value, stacked = false }: { value: string; stacked?: boolean }) {
  const parts = splitLinks(value);
  if (parts.length <= 1) return <ExternalLink value={value} />;
  return (
    <>
      {parts.map((p, i) =>
        p.href ? (
          <span key={i} style={stacked ? { display: 'block' } : undefined} className={stacked ? 'truncate' : undefined}>
            {!stacked && i > 0 && ' '}
            <ExternalLink value={p.text} />
            {parts[i + 1] && !parts[i + 1].href && <span className="muted"> {parts[i + 1].text}</span>}
          </span>
        ) : i === 0 ? (
          <span key={i} className="muted">
            {p.text}{' '}
          </span>
        ) : null,
      )}
    </>
  );
}
