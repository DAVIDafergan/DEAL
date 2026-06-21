/**
 * Logo — סימן מסחרי SVG מצויר ישירות (לא קובץ תמונה חיצוני): טבעות רדאר זוהרות + מילה "DEAL".
 * אינליין כדי לא להוסיף בקשת רשת נוספת לתמונה — חשוב לטעינה מהירה במובייל.
 *
 * Inline SVG wordmark — no external image request, important for fast mobile loads.
 */
export function Logo({ size = 28 }) {
  return (
    <span className="logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="logo__mark"
      >
        <defs>
          <linearGradient id="logoGradient" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--color-accent-from)" />
            <stop offset="1" stopColor="var(--color-accent-to)" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14.5" stroke="url(#logoGradient)" strokeWidth="1.4" opacity="0.45" />
        <circle cx="16" cy="16" r="9.5" stroke="url(#logoGradient)" strokeWidth="1.6" opacity="0.7" />
        <circle cx="16" cy="16" r="4" fill="url(#logoGradient)" />
      </svg>
      <span className="logo__wordmark">DEAL</span>
    </span>
  );
}
