/** 9.7 performance: request-time image optimization — webp + resized, without owning any image
 * processing ourselves. Detects the two sources this app actually serves images from (Cloudinary
 * for owner uploads, Unsplash for placeholder photos) and appends their respective transform
 * params; any other URL passes through unchanged (never breaks on an unrecognized host). */
export function optimizedImageUrl(url, { width = 480 } = {}) {
  if (!url) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/w_${width},c_limit,f_auto,q_auto/`);
  }
  if (url.includes('images.unsplash.com')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}w=${width}&fm=webp&q=75&auto=format`;
  }
  return url;
}
