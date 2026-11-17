/**
 * Transforme une saisie libre en lien utilisable :
 * "jobs.exemple.com" -> "https://jobs.exemple.com", "a@b.fr" -> "mailto:a@b.fr".
 * Renvoie `null` si la valeur ne ressemble pas à un lien.
 */
export function toHref(value: string): string | null {
  const v = value.trim();
  if (!v || /\s/.test(v)) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^mailto:/i.test(v)) return v;
  if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)) return `mailto:${v}`;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(v)) return `https://${v}`;
  return null;
}

/** Nom de domaine lisible d'une URL ("www.linkedin.com/jobs/..." -> "linkedin.com"). */
export function linkLabel(href: string): string {
  if (href.startsWith('mailto:')) return href.slice(7);
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}
