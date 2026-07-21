import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * PropertyImageCarousel — no new global CSS: the frame reuses .deal-modal__media exactly (same
 * as the single-image version it replaces), and prev/next reuse .world-heatmap__zoom-button
 * (the existing glass circular button already used for map controls) rather than a new class.
 * Only the thumbnail strip/dots are new markup, styled entirely via var(--ds-*) inline styles —
 * same tokens as theme.css, no new stylesheet rules.
 */
export function PropertyImageCarousel({ images, alt }) {
  const [index, setIndex] = useState(0);
  const hasMultiple = images && images.length > 1;

  if (!images || images.length === 0) {
    return (
      <div className="deal-modal__media" style={{ borderRadius: 'var(--radius-lg)', height: 280 }}>
        <div className="deal-modal__media-placeholder" />
        <div className="deal-modal__media-gradient" />
      </div>
    );
  }

  function prev() { setIndex((i) => (i - 1 + images.length) % images.length); }
  function next() { setIndex((i) => (i + 1) % images.length); }

  return (
    <div>
      <div className="deal-modal__media" style={{ borderRadius: 'var(--radius-lg)', height: 280 }}>
        <img src={images[index]} alt={alt} className="deal-modal__media-img" />
        <div className="deal-modal__media-gradient" />

        {hasMultiple && (
          <>
            <button
              type="button"
              className="world-heatmap__zoom-button"
              style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', zIndex: 2 }}
              onClick={prev}
              aria-label="תמונה קודמת"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className="world-heatmap__zoom-button"
              style={{ position: 'absolute', top: '50%', insetInlineEnd: 12, transform: 'translateY(-50%)', zIndex: 2 }}
              onClick={next}
              aria-label="תמונה הבאה"
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ position: 'absolute', bottom: 10, insetInlineStart: 0, insetInlineEnd: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 2 }}>
              {images.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i === index ? 'var(--ds-teal)' : 'rgba(255,255,255,0.5)',
                    transition: 'background 0.2s ease',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {hasMultiple && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              style={{
                flexShrink: 0, width: 64, height: 48, padding: 0, cursor: 'pointer',
                borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                border: i === index ? '2px solid var(--ds-teal)' : '2px solid transparent',
                opacity: i === index ? 1 : 0.7,
              }}
              aria-label={`תמונה ${i + 1}`}
            >
              <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
