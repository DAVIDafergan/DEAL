import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';

const STEPS = [
  {
    targetId: 'onb-add-deal',
    title: '✈️ העלאת דיל חדש',
    text: 'כאן מתחיל הכל! לחץ "הוסף דיל" כדי לפרסם את הדיל הראשון שלך — יופיע בפיד הציבורי תוך דקות.',
    position: 'below',
  },
  {
    targetId: 'onb-deals-list',
    title: '📋 הדילים שלך',
    text: 'כאן יופיעו כל הדילים שהעלית. תוכל לראות סטטוס אישור, לערוך, למחוק ולסמן כנרכש.',
    position: 'above',
  },
  {
    targetId: 'onb-kpis',
    title: '📊 הסטטיסטיקות שלך',
    text: 'מעקב אחרי קליקים, לידים ורכישות בזמן אמת. ככל שתוסיף יותר דילים — המספרים יעלו!',
    position: 'below',
  },
  {
    targetId: 'onb-settings',
    title: '⚙️ הגדרות ו-WhatsApp',
    text: 'חשוב! הגדר את מספר ה-WhatsApp שלך כדי שלקוחות יוכלו ליצור איתך קשר ישירות מהפיד.',
    position: 'above',
  },
];

function useElementRect(id, active) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!active) { setRect(null); return; }
    function measure() {
      const el = document.getElementById(id);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [id, active]);
  return rect;
}

function SpotlightOverlay({ rect, onSkip }) {
  if (!rect) return (
    <div className="onb-overlay" onClick={onSkip} />
  );

  const pad = 8;
  const holeTop = rect.top - pad;
  const holeLeft = rect.left - pad;
  const holeW = rect.width + pad * 2;
  const holeH = rect.height + pad * 2;

  return (
    <svg
      className="onb-overlay onb-overlay--svg"
      onClick={onSkip}
    >
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={holeLeft} y={holeTop}
            width={holeW} height={holeH}
            rx="8"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%" height="100%"
        fill="rgba(10,14,26,0.78)"
        mask="url(#spotlight-mask)"
      />
      {/* Glowing border around spotlight */}
      <rect
        x={holeLeft} y={holeTop}
        width={holeW} height={holeH}
        rx="8"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2"
        opacity="0.8"
      />
    </svg>
  );
}

function TooltipCard({ step, rect, stepIndex, totalSteps, onNext, onSkip }) {
  const TOOLTIP_H = 160;
  const TOOLTIP_W = 320;
  const pad = 8;

  let top = 0;
  let left = 0;

  if (rect) {
    if (step.position === 'below') {
      top = rect.top + rect.height + pad + 10;
    } else {
      top = rect.top - TOOLTIP_H - pad - 10;
    }
    left = Math.max(12, Math.min(
      rect.left + rect.width / 2 - TOOLTIP_W / 2,
      window.innerWidth - TOOLTIP_W - 12
    ));
  } else {
    top = window.innerHeight / 2 - TOOLTIP_H / 2;
    left = window.innerWidth / 2 - TOOLTIP_W / 2;
  }

  return (
    <motion.div
      className="onb-tooltip"
      style={{ top, left, width: TOOLTIP_W }}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <div className="onb-tooltip__header">
        <h3 className="onb-tooltip__title">{step.title}</h3>
        <button className="onb-tooltip__close" onClick={onSkip} aria-label="דלג על ההסבר">
          <X size={15} />
        </button>
      </div>
      <p className="onb-tooltip__text">{step.text}</p>
      <div className="onb-tooltip__footer">
        <span className="onb-tooltip__dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span key={i} className={`onb-dot${i === stepIndex ? ' onb-dot--active' : ''}`} />
          ))}
        </span>
        <div className="onb-tooltip__btns">
          <button className="onb-tooltip__skip-btn" onClick={onSkip}>דלג</button>
          <button className="onb-tooltip__next-btn" onClick={onNext}>
            {stepIndex === totalSteps - 1 ? 'סיום ✓' : 'הבא'}
            {stepIndex < totalSteps - 1 && <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function OnboardingTour({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const rect = useElementRect(step.targetId, true);

  const handleNext = useCallback(() => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      onComplete();
    }
  }, [stepIndex, onComplete]);

  // Scroll target element into view when step changes
  useEffect(() => {
    const el = document.getElementById(step.targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step.targetId]);

  return (
    <div className="onb-root" dir="rtl">
      <SpotlightOverlay rect={rect} onSkip={onComplete} />
      <AnimatePresence mode="wait">
        <TooltipCard
          key={stepIndex}
          step={step}
          rect={rect}
          stepIndex={stepIndex}
          totalSteps={STEPS.length}
          onNext={handleNext}
          onSkip={onComplete}
        />
      </AnimatePresence>
    </div>
  );
}
