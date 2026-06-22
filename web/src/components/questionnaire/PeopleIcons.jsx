/** אייקוני SVG מינימליים לשאלת "כמה אנשים" — לא קיטשי, בקו אחד תואם לאסתטיקה הקיימת */
function Person({ x = 0 }) {
  return (
    <g transform={`translate(${x},0)`}>
      <circle cx="0" cy="-5" r="3.2" />
      <path d="M-4 7 C-4 1, 4 1, 4 7 Z" />
    </g>
  );
}

export function SoloIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width="28" height="28" fill="currentColor" aria-hidden="true">
      <Person />
    </svg>
  );
}

export function CoupleIcon() {
  return (
    <svg viewBox="-14 -10 28 20" width="32" height="24" fill="currentColor" aria-hidden="true">
      <Person x={-5} />
      <Person x={5} />
    </svg>
  );
}

export function FamilyIcon() {
  return (
    <svg viewBox="-16 -10 32 20" width="34" height="22" fill="currentColor" aria-hidden="true">
      <Person x={-7} />
      <g transform="translate(7,3) scale(0.7)">
        <Person />
      </g>
      <Person x={1} />
    </svg>
  );
}

export function GroupIcon() {
  return (
    <svg viewBox="-18 -10 36 20" width="36" height="20" fill="currentColor" aria-hidden="true">
      <Person x={-9} />
      <Person x={0} />
      <Person x={9} />
    </svg>
  );
}
