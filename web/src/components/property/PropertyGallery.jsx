import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, ImageOff } from 'lucide-react';

/** PropertyGallery — 9.4: main photo + secondary grid (Booking/Airbnb pattern), click opens a
 * full-screen lightbox. Falls back to a single placeholder tile when the owner hasn't uploaded
 * photos yet — never crashes, never shows a broken-image icon. */
export function PropertyGallery({ images = [], alt }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (images.length === 0) {
    return (
      <div className="pg pg--empty">
        <ImageOff size={28} strokeWidth={1.5} />
        <span>אין עדיין תמונות לנכס זה</span>
      </div>
    );
  }

  const secondary = images.slice(1, 5);

  return (
    <>
      <div className="pg">
        <button type="button" className="pg__main" onClick={() => setLightboxIndex(0)}>
          <img src={images[0]} alt={alt} loading="eager" />
        </button>
        {secondary.length > 0 && (
          <div className="pg__grid">
            {secondary.map((src, i) => (
              <button type="button" key={src + i} className="pg__thumb" onClick={() => setLightboxIndex(i + 1)}>
                <img src={src} alt="" loading="lazy" />
                {i === secondary.length - 1 && images.length > 5 && (
                  <span className="pg__more">+{images.length - 5}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && createPortal(
        <Lightbox images={images} index={lightboxIndex} alt={alt} onClose={() => setLightboxIndex(null)} onChange={setLightboxIndex} />,
        document.body
      )}
    </>
  );
}

function Lightbox({ images, index, alt, onClose, onChange }) {
  function prev() { onChange((index - 1 + images.length) % images.length); }
  function next() { onChange((index + 1) % images.length); }

  return (
    <div className="pg-lightbox" role="dialog" aria-modal="true" aria-label={alt}>
      <button type="button" className="pg-lightbox__close" onClick={onClose} aria-label="סגור">
        <X size={22} />
      </button>
      <button type="button" className="pg-lightbox__nav pg-lightbox__nav--prev" onClick={prev} aria-label="תמונה קודמת">
        <ChevronRight size={26} />
      </button>
      <img src={images[index]} alt={alt} className="pg-lightbox__img" />
      <button type="button" className="pg-lightbox__nav pg-lightbox__nav--next" onClick={next} aria-label="תמונה הבאה">
        <ChevronLeft size={26} />
      </button>
      <div className="pg-lightbox__counter" dir="ltr">{index + 1} / {images.length}</div>
    </div>
  );
}
