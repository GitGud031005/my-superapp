import React, { useEffect, useId, useRef } from 'react';

const EXIT_FALLBACK_MS = 400;

export function Dialog({ open, title, onClose, actions, closeLabel = 'Close', children }) {
  const ref = useRef(null);
  const titleId = useId();
  const finishClosing = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      finishClosing.current?.cancel();
      el.classList.remove('is-closing');
      if (!el.open) el.showModal();
      return;
    }
    if (!el.open) return;
    // Play the exit animation, then close. Reduced motion (or no matchMedia) closes at once.
    if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.close();
      return;
    }
    el.classList.add('is-closing');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('animationend', onEnd);
      clearTimeout(timer);
      finishClosing.current = null;
      el.classList.remove('is-closing');
      if (el.open) el.close();
    };
    const onEnd = (e) => { if (e.target === el) finish(); };
    el.addEventListener('animationend', onEnd);
    const timer = setTimeout(finish, EXIT_FALLBACK_MS);
    finishClosing.current = { cancel: () => { done = true; el.removeEventListener('animationend', onEnd); clearTimeout(timer); finishClosing.current = null; } };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="p5r-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); if (open) onClose(); }}
      onClose={() => open && onClose()}
    >
      <h2 id={titleId} className="p5r-dialog__head">{title}</h2>
      <div className="p5r-dialog__body">{children}</div>
      {actions && <div className="p5r-dialog__actions">{actions}</div>}
      {/* Last in the DOM so the first control in the body gets the initial focus; CSS puts it in the header corner */}
      <button type="button" className="p5r-dialog__close" aria-label={closeLabel} onClick={() => open && onClose()}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5L19 19M19 5L5 19" /></svg>
      </button>
    </dialog>
  );
}
