// Brand glyphs for owner social links (7.7) — lucide-react (this project's icon set) dropped
// brand/social icons a while back, so these are small inline SVGs instead of a new dependency.
const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'currentColor' };

export function FacebookIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.3" />
    </svg>
  );
}

export function TikTokIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M16.6 2h-3.2v13.7a3 3 0 1 1-2.1-2.86V9.6a6.2 6.2 0 1 0 5.3 6.13V8.9a7.6 7.6 0 0 0 4.4 1.4V7.1a4.4 4.4 0 0 1-4.4-4.4V2Z" />
    </svg>
  );
}

export function YouTubeIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" />
    </svg>
  );
}
