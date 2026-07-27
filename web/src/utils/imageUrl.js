/** 9.7 performance: request-time image optimization — webp + resized, without owning any image
 * processing ourselves. Detects the sources this app actually serves images from (Cloudinary
 * for owner uploads, Unsplash for placeholder photos, and — 11.5 — this app's own /api/images/
 * db-backed storage) and appends their respective transform params; any other URL passes
 * through unchanged (never breaks on an unrecognized host). */
export function optimizedImageUrl(url, { width = 480 } = {}) {
  if (!url) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/w_${width},c_limit,f_auto,q_auto/`);
  }
  if (url.includes('images.unsplash.com')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}w=${width}&fm=webp&q=75&auto=format`;
  }
  // db ImageStorage: there's no on-the-fly resize, only the two copies generated at upload
  // time (full + 400px thumb) — card-sized requests (<=480, the width every card component
  // already asks for) get the pre-made thumb instead of downloading the full image just to
  // shrink it in the browser. A CSS box slightly above 400px showing a 400px source is an
  // imperceptible difference; the bandwidth saved on the grid is not.
  if (/\/api\/images\/\d+/.test(url) && width <= 480) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}size=thumb`;
  }
  return url;
}

// 11.18 — density-descriptor srcset (1x/1.5x/2x) for retina/high-DPI screens, Cloudinary only:
// it's the one backend that can actually produce three different real resolutions on the fly.
// Density descriptors (vs width descriptors) need no `sizes` attribute — the browser just picks
// based on devicePixelRatio, which is exactly what a fixed-CSS-size card/thumb/hero image wants.
const SRCSET_DENSITIES = [1, 1.5, 2];

export function srcSetForImage(url, { width = 480 } = {}) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return undefined;
  return SRCSET_DENSITIES.map((d) => `${optimizedImageUrl(url, { width: Math.round(width * d) })} ${d}x`).join(', ');
}
