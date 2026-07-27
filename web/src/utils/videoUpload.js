// 11.18 — client-side video validation before it's ever sent. The server enforces the same
// size cap again (see server/routes/uploads.js MAX_VIDEO_BYTES) — this is just so a phone user
// gets an immediate, specific Hebrew message instead of waiting through a doomed upload.
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp'];
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60MB
export const MAX_VIDEO_DURATION_SECONDS = 120; // 2 minutes — a walkthrough clip, not a movie

/** probeVideoDuration — loads just enough of the file (via an offscreen <video>, blob URL) to
 * read its duration, without uploading anything. Resolves null if the browser can't determine
 * it (some formats/codecs won't report duration from metadata alone) — callers should treat
 * null as "couldn't check" and let the server be the final word, not as a hard failure. */
export function probeVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => { cleanup(); resolve(null); };
    video.src = url;
  });
}
