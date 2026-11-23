import React, { useEffect, useId, useRef } from 'react';

export function Dialog({ open, title, onClose, actions, closeLabel = 'Close', children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="p5r-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClose={() => open && onClose()}
    >
      <h2 id={titleId} className="p5r-dialog__head">{title}</h2>
      <div className="p5r-dialog__body">{children}</div>
      {actions && <div className="p5r-dialog__actions">{actions}</div>}
      {/* Last in the DOM so the first control in the body gets the initial focus; CSS puts it in the header corner */}
      <button type="button" className="p5r-dialog__close" aria-label={closeLabel} onClick={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5L19 19M19 5L5 19" /></svg>
      </button>
    </dialog>
  );
}
