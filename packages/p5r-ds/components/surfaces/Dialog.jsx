import React, { useEffect, useId, useRef } from 'react';

export function Dialog({ open, title, onClose, actions, children }) {
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
    </dialog>
  );
}
