import { useMemo, useState } from 'react';
import type { Tracker } from '@/domain/types';
import { columnOptions, guessColumns, rowsToApplications, targetToValue, valueToTarget, type ColumnTarget } from '@/domain/tableIO';
import { parseDelimited } from '@/lib/csv';
import { useStore } from '@/state/store';
import { Overlay } from '@/components/Overlay';
import { useToast } from '@/components/Toast';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Import depuis un tableur : on colle directement les cellules copiées
 * (Excel, Google Sheets, LibreOffice) ou on charge un fichier CSV.
 */
export function ImportDialog({ tracker, onClose }: { tracker: Tracker; onClose: () => void }) {
  const store = useStore();
  const notify = useToast();
  const [text, setText] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [overrides, setOverrides] = useState<Record<number, ColumnTarget>>({});

  const table = useMemo(() => (text.trim() ? parseDelimited(text) : []), [text]);
  const width = Math.max(0, ...table.map((r) => r.length));
  const headers = hasHeader ? table[0] ?? [] : Array.from({ length: width }, (_, i) => `Colonne ${i + 1}`);
  const body = hasHeader ? table.slice(1) : table;
  const guessed = useMemo(() => guessColumns(hasHeader ? headers : [], tracker), [headers, hasHeader, tracker]);
  const columns = Array.from({ length: width }, (_, i) => overrides[i] ?? guessed[i] ?? ({ kind: 'ignore' } as ColumnTarget));

  const parsed = useMemo(() => rowsToApplications(body, columns, tracker, store.today), [body, columns, tracker, store.today]);
  const existing = new Set(store.applicationsOf(tracker.id).map((a) => norm(a.company)));
  const toImport = skipDuplicates ? parsed.filter((p) => !existing.has(norm(p.input.company ?? ''))) : parsed;
  const duplicates = parsed.length - toImport.length;
  const warnings = parsed.flatMap((p) => p.warnings.map((w) => `${p.input.company} : ${w}`));
  const hasCompany = columns.some((c) => c.kind === 'core' && c.field === 'company');
  const options = columnOptions(tracker);

  const loadFile = async (file: File) => {
    setText(await file.text());
    setOverrides({});
  };

  const submit = () => {
    const n = store.addApplications(tracker.id, toImport.map((p) => p.input));
    notify(`${n} candidature(s) importée(s)`);
    onClose();
  };

  return (
    <Overlay
      title={`Importer dans « ${tracker.name} »`}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="left small muted">
            {parsed.length > 0 && `${toImport.length} à importer${duplicates ? `, ${duplicates} doublon(s) ignoré(s)` : ''}`}
          </span>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={!toImport.length || !hasCompany} onClick={submit}>
            Importer {toImport.length || ''}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="info-box">
          Sélectionnez les cellules dans votre tableur (en-têtes compris), copiez-les puis collez-les ci-dessous. Les colonnes sont
          reconnues automatiquement ; corrigez-les au besoin. Les dates « J+7 » futures sont ignorées : le site calcule lui-même les
          relances.
        </div>
        <textarea
          className="textarea"
          rows={6}
          placeholder={'Entreprise\tVille\tType\tPoste…\nEnedis\tChambéry\tOffre\t…'}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOverrides({});
          }}
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}
        />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="btn btn-sm">
            📄 Charger un fichier CSV
            <input type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </label>
          <label className="checkbox small">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            La première ligne contient les en-têtes
          </label>
          <label className="checkbox small">
            <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
            Ignorer les entreprises déjà présentes
          </label>
        </div>

        {width > 0 && (
          <>
            {!hasCompany && <div className="warning-box">Indiquez quelle colonne contient le nom de l’entreprise.</div>}
            <div className="preview-table">
              <table className="data">
                <thead>
                  <tr>
                    {columns.map((c, i) => (
                      <th key={i}>
                        <div className="muted small truncate" style={{ maxWidth: 160, marginBottom: 4 }}>
                          {headers[i] ?? ''}
                        </div>
                        <select
                          className="select"
                          value={targetToValue(c)}
                          onChange={(e) => setOverrides({ ...overrides, [i]: valueToTarget(e.target.value) })}
                        >
                          {options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.slice(0, 8).map((row, r) => (
                    <tr key={r} style={{ cursor: 'default' }}>
                      {columns.map((c, i) => (
                        <td key={i} className="truncate" style={{ maxWidth: 180, opacity: c.kind === 'ignore' ? 0.4 : 1 }}>
                          {row[i]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {body.length > 8 && <div className="small muted">… et {body.length - 8} autre(s) ligne(s)</div>}
            {warnings.length > 0 && (
              <div className="warning-box">
                <strong>{warnings.length} avertissement(s)</strong> (les lignes seront importées sans ces valeurs) :
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {warnings.slice(0, 6).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Overlay>
  );
}
