import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface OverlayProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'modal' | 'drawer';
  wide?: boolean;
  headerExtra?: ReactNode;
}

/** Modale centrée ou panneau latéral, fermé par Échap ou clic sur le fond. */
export function Overlay({ title, onClose, children, footer, variant = 'modal', wide, headerExtra }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus sur le panneau (et non sur un champ) : lecteurs d'écran + pas de saut de défilement.
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className={`overlay ${variant === 'drawer' ? 'right' : 'center'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        className={variant === 'drawer' ? 'drawer' : `modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        <div className="panel-head">
          <h2 className="truncate">{title}</h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {headerExtra}
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          </div>
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="panel-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
