import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Film } from 'lucide-react';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { uploadApi } from '../../api/client.js';
import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_BYTES, MAX_VIDEO_DURATION_SECONDS, probeVideoDuration } from '../../utils/videoUpload.js';

const FRIENDLY_TYPE_ERROR = 'סוג הקובץ לא נתמך — אפשר להעלות MP4, MOV או WEBM בלבד';
const FRIENDLY_SIZE_ERROR = `הסרטון גדול מדי (מקסימום ${MAX_VIDEO_BYTES / (1024 * 1024)}MB)`;
const FRIENDLY_DURATION_ERROR = `הסרטון ארוך מדי (מקסימום ${MAX_VIDEO_DURATION_SECONDS} שניות) — סרטון היכרות קצר עובד הכי טוב`;

/**
 * PropertyVideoUploader — 11.18: one optional walkthrough video per property, Cloudinary-only
 * (see server/routes/uploads.js — the db ImageStorage backend has no realistic way to serve
 * video). Mirrors PropertyPhotoUploader's shape (dropzone, progress, remove) but for a single
 * file with a poster preview instead of a thumbnail grid.
 */
export function PropertyVideoUploader({ videoUrl, posterUrl, onChange, propertyId }) {
  const { token } = useAgentAuth();
  const [uploading, setUploading] = useState(null); // { name, progress, error } | null
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setUploading({ name: file.name, progress: 0, error: FRIENDLY_TYPE_ERROR });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUploading({ name: file.name, progress: 0, error: FRIENDLY_SIZE_ERROR });
      return;
    }
    const duration = await probeVideoDuration(file);
    if (duration !== null && duration > MAX_VIDEO_DURATION_SECONDS) {
      setUploading({ name: file.name, progress: 0, error: FRIENDLY_DURATION_ERROR });
      return;
    }

    setUploading({ name: file.name, progress: 0, error: null });
    try {
      const { url, posterUrl: newPoster } = await uploadApi.propertyVideo(
        token, file,
        (p) => setUploading((prev) => (prev ? { ...prev, progress: p } : prev)),
        { fields: { propertyId } }
      );
      onChange({ videoUrl: url, posterUrl: newPoster });
      setUploading(null);
    } catch (err) {
      setUploading((prev) => (prev ? { ...prev, error: err.message || 'ההעלאה נכשלה, נסו שוב' } : prev));
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function removeVideo() {
    if (videoUrl) uploadApi.deletePropertyVideo(token, videoUrl, propertyId).catch(() => {});
    onChange({ videoUrl: null, posterUrl: null });
  }

  return (
    <div className="ppu ppu--video">
      <p className="ppu__label">סרטון היכרות (אופציונלי)</p>

      {videoUrl ? (
        <div className="ppu__video-preview">
          <video src={videoUrl} poster={posterUrl || undefined} controls preload="metadata" className="ppu__video-el" />
          <button type="button" className="ppu__thumb-remove" onClick={removeVideo} aria-label="מחק סרטון">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div
          className={`ppu__dropzone ${dragOver ? 'ppu__dropzone--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          {uploading ? (
            uploading.error ? (
              <>
                <span className="ppu__thumb-error">{uploading.error}</span>
                <button type="button" className="agent-form__btn agent-form__btn--ghost" onClick={(e) => { e.stopPropagation(); setUploading(null); }}>
                  נסו שוב
                </button>
              </>
            ) : (
              <>
                <motion.div className="ppu__progress-ring" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                <span>מעלה… {Math.round(uploading.progress * 100)}%</span>
              </>
            )
          ) : (
            <>
              <Film size={22} />
              <span>גררו סרטון לכאן או לחצו לבחירה</span>
              <span className="wizard-hint">MP4/MOV/WEBM, עד {MAX_VIDEO_BYTES / (1024 * 1024)}MB, עד {MAX_VIDEO_DURATION_SECONDS} שניות</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_VIDEO_TYPES.join(',')}
            hidden
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </div>
      )}
    </div>
  );
}
