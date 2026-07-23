import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Star, GripVertical } from 'lucide-react';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { uploadApi } from '../../api/client.js';
import { compressImageFile, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../utils/imageCompress.js';
import { optimizedImageUrl } from '../../utils/imageUrl.js';

const FRIENDLY_TYPE_ERROR = 'סוג הקובץ לא נתמך — אפשר להעלות JPG, PNG, WEBP או HEIC בלבד';
const FRIENDLY_SIZE_ERROR = 'הקובץ גדול מדי (מקסימום 10MB לפני דחיסה)';

/**
 * PropertyPhotoUploader — drag & drop + multi-select + immediate previews + drag-reorder + cover
 * pick + delete + per-file progress (7.4). `images` is the array of already-uploaded URLs (the
 * source of truth); uploads-in-progress are tracked locally and appended once each one finishes.
 * 11.5: propertyId/unitId associate uploads with a listing for the db ImageStorage backend
 * (ownership-checked server-side) — both are optional and omitted for the one non-property use
 * of this same component, the owner's own profile photo (OwnerSettingsPage).
 */
export function PropertyPhotoUploader({ images, onChange, label, minRequired = 0, maxImages = Infinity, propertyId, unitId }) {
  const { token } = useAgentAuth();
  const [uploading, setUploading] = useState([]); // [{ id, name, progress, error }]
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const inputRef = useRef(null);
  const atCapacity = images.length + uploading.length >= maxImages;

  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      if (images.length + uploading.length >= maxImages) break;

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        setUploading((prev) => [...prev, { id, name: file.name, progress: 0, error: FRIENDLY_TYPE_ERROR }]);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        setUploading((prev) => [...prev, { id, name: file.name, progress: 0, error: FRIENDLY_SIZE_ERROR }]);
        continue;
      }

      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      setUploading((prev) => [...prev, { id, name: file.name, progress: 0, error: null }]);
      try {
        const { file: compressed, thumbFile, width, height } = await compressImageFile(file);
        const { url } = await uploadApi.propertyImage(
          token, compressed,
          (p) => setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, progress: p } : u))),
          { thumbFile, fields: { propertyId, unitId, width, height } }
        );
        onChange([...images, url]);
      } catch (err) {
        setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, error: err.message || 'ההעלאה נכשלה, נסו שוב' } : u)));
        continue;
      }
      setUploading((prev) => prev.filter((u) => u.id !== id));
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeImage(index) {
    const url = images[index];
    onChange(images.filter((_, i) => i !== index));
    // Best-effort — the array (source of truth for the listing) is already updated regardless
    // of whether the server-side blob cleanup succeeds.
    uploadApi.deletePropertyImage(token, url).catch(() => {});
  }

  function makeCover(index) {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange(next);
  }

  function handleThumbDrop(index) {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
    setDragIndex(null);
  }

  function dismissError(id) {
    setUploading((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div className="ppu">
      {label && <p className="ppu__label">{label}{minRequired > 0 && <span className="ppu__label-req"> (לפחות {minRequired})</span>}</p>}

      {!atCapacity && (
        <div
          className={`ppu__dropzone ${dragOver ? 'ppu__dropzone--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <Upload size={22} />
          <span>גררו תמונות לכאן או לחצו לבחירה</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple={maxImages > 1}
            hidden
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {(images.length > 0 || uploading.length > 0) && (
        <div className="ppu__grid">
          {images.map((url, i) => (
            <div
              key={url + i}
              className="ppu__thumb"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleThumbDrop(i)}
            >
              <img src={optimizedImageUrl(url, { width: 160 })} alt="" className="ppu__thumb-img" />
              <span className="ppu__thumb-drag"><GripVertical size={13} /></span>
              {i === 0 ? (
                <span className="ppu__thumb-cover">תמונה ראשית</span>
              ) : (
                <button type="button" className="ppu__thumb-star" onClick={() => makeCover(i)} title="הפוך לתמונה ראשית">
                  <Star size={13} />
                </button>
              )}
              <button type="button" className="ppu__thumb-remove" onClick={() => removeImage(i)} aria-label="מחק תמונה">
                <X size={13} />
              </button>
            </div>
          ))}
          {uploading.map((u) => (
            <div key={u.id} className={`ppu__thumb ppu__thumb--uploading${u.error ? ' ppu__thumb--error' : ''}`}>
              {u.error ? (
                <>
                  <span className="ppu__thumb-error">{u.error}</span>
                  <button type="button" className="ppu__thumb-remove" onClick={() => dismissError(u.id)} aria-label="סגור הודעה">
                    <X size={13} />
                  </button>
                </>
              ) : (
                <>
                  <motion.div className="ppu__progress-ring" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                  <span className="ppu__thumb-progress">{Math.round(u.progress * 100)}%</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
