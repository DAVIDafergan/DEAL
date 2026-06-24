export function Logo({ size = 36 }) {
  return (
    <span className="logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="logo__mark"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="lgTeal" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#17c3b2" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>

        {/* Outer ring */}
        <circle cx="20" cy="20" r="17" stroke="url(#lgTeal)" strokeWidth="0.8" opacity="0.3" />
        {/* Middle ring */}
        <circle cx="20" cy="20" r="11" stroke="url(#lgTeal)" strokeWidth="0.8" opacity="0.5" />

        {/* Cardinal tick marks — N / E / S / W */}
        <line x1="20" y1="2"  x2="20" y2="5.5"  stroke="url(#lgTeal)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <line x1="38" y1="20" x2="34.5" y2="20"  stroke="url(#lgTeal)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <line x1="20" y1="38" x2="20" y2="34.5"  stroke="url(#lgTeal)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <line x1="2"  y1="20" x2="5.5" y2="20"   stroke="url(#lgTeal)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />

        {/* THE SIGNATURE: sweep arc  (120° clockwise from 12-o'clock)
            Start: (20, 3)  End: (34.7, 28.5)
            Arc length ≈ 35.6 → dasharray 36 */}
        <path
          d="M20 3 A17 17 0 0 1 34.7 28.5"
          stroke="url(#lgTeal)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          className="logo-sweep"
        />

        {/* Center dot — pulses with teal glow after draw completes */}
        <circle
          cx="20"
          cy="20"
          r="3"
          fill="url(#lgTeal)"
          className="logo-dot"
        />
      </svg>

      <span className="logo__wordmark">DEAL</span>
    </span>
  );
}
