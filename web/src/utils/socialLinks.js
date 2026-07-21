// 7.7: "קישורים... כל אחד עם ולידציה של פורמט" — checks the value is a well-formed http(s) URL,
// and for the platform-specific fields, that the domain actually looks like that platform (a
// facebook.com link in the instagram field is a format error the owner would want caught).
const DOMAIN_HINTS = {
  facebook_url: ['facebook.com', 'fb.com', 'fb.me'],
  instagram_url: ['instagram.com'],
  tiktok_url: ['tiktok.com'],
  youtube_url: ['youtube.com', 'youtu.be'],
};

export function validateSocialUrl(field, value) {
  if (!value) return null; // empty is fine, these are all optional
  let url;
  try {
    url = new URL(value);
  } catch {
    return 'כתובת לא תקינה — יש לכלול https://';
  }
  if (!['http:', 'https:'].includes(url.protocol)) return 'כתובת לא תקינה — יש לכלול https://';

  const hints = DOMAIN_HINTS[field];
  if (hints && !hints.some((h) => url.hostname.endsWith(h))) {
    return `הכתובת לא נראית כמו קישור ל-${hints[0]}`;
  }
  return null;
}
