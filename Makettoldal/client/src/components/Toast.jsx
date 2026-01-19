import React from "react";

export default function Toast({ open, variant = "info", title, text, onClose }) {
  if (!open) return null;

  const cls =
    variant === "error" ? "toast toast--error" : "toast";

  return (
    <div className="toast-wrap">
      <div className={cls} role="status" aria-live="polite">
        <div className="toast__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M10.3 4.3h3.4c.8 0 1.5.4 1.9 1.1l6.2 10.8c.8 1.4-.2 3.1-1.9 3.1H4.1c-1.7 0-2.7-1.7-1.9-3.1l6.2-10.8c.4-.7 1.1-1.1 1.9-1.1Z"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.9"
            />
          </svg>
        </div>

        <div>
          <p className="toast__title">{title}</p>
          <p className="toast__text">{text}</p>
        </div>

        <div className="toast__actions">
          <button className="toast__btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
