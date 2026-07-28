import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Home, Sparkles, Waves, Baby, UtensilsCrossed, Mountain, Utensils,
  Users, Search, CheckCircle2, Mail, Phone, User as UserIcon,
} from 'lucide-react';
import { RegionPicker } from '../components/RegionPicker.jsx';
import { HeroDateRangeField } from '../components/HeroDateRangeField.jsx';
import { PropertyGrid } from '../components/PropertyGrid.jsx';
import { BackButton } from '../components/BackButton.jsx';
import { requestApi } from '../api/client.js';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Link } from '../components/LocalizedLink.jsx';

const AMENITY_CHIPS = [
  { value: 'has_private_jacuzzi', labelKey: 'reqAmenityJacuzzi', icon: Sparkles },
  { value: 'has_private_pool', labelKey: 'reqAmenityPool', icon: Waves },
  { value: 'has_heated_pool', labelKey: 'reqAmenityHeatedPool', icon: Waves },
  { value: 'is_kid_friendly', labelKey: 'reqAmenityKids', icon: Baby },
  { value: 'kosher', labelKey: 'reqAmenityKosher', icon: UtensilsCrossed },
  { value: 'has_view', labelKey: 'reqAmenityView', icon: Mountain },
  { value: 'has_bbq', labelKey: 'reqAmenityBbq', icon: Utensils },
];

const EASE = [0.16, 1, 0.3, 1];
const slide = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2, ease: EASE } },
};

function StepShell({ title, sub, children }) {
  return (
    <motion.div className="req-step" variants={slide} initial="enter" animate="center" exit="exit">
      <h2 className="req-step__title">{title}</h2>
      {sub && <p className="req-step__sub">{sub}</p>}
      <div className="req-step__body">{children}</div>
    </motion.div>
  );
}

/** SearchingAnimation — 11.23 §2: "not a spinner". A wave of house icons lighting up in
 * sequence, looping while the real POST /api/requests is in flight — never shows a number here
 * (that only ever appears once, and only as the real count, in the result phase right after).
 * transform/opacity only, respects prefers-reduced-motion (falls back to a plain "loading" line
 * via CSS — see .req-searching in index.css). */
function SearchingAnimation({ label }) {
  const icons = Array.from({ length: 9 });
  return (
    <motion.div className="req-searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="req-searching__grid">
        {icons.map((_, i) => (
          <motion.div
            key={i}
            className="req-searching__house"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.9, 1.08, 0.9] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: (i % 3) * 0.15 + Math.floor(i / 3) * 0.25, ease: 'easeInOut' }}
          >
            <Home size={22} />
          </motion.div>
        ))}
      </div>
      <p className="req-searching__label">{label}</p>
    </motion.div>
  );
}

function GuestStepper({ label, value, onChange, min = 0 }) {
  return (
    <div className="req-stepper">
      <span className="req-stepper__label">{label}</span>
      <div className="req-stepper__controls">
        <button type="button" className="req-stepper__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <span className="req-stepper__value">{value}</span>
        <button type="button" className="req-stepper__btn" onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

export function RequestPage() {
  const { t, dir } = useLanguage();
  const { traveler, travelerToken } = useTravelerAuth();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(travelerToken);

  const steps = useMemo(() => (isLoggedIn ? ['where', 'when', 'guests', 'vibe'] : ['where', 'when', 'guests', 'vibe', 'contact']), [isLoggedIn]);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    region: '', city: '', checkIn: '', checkOut: '', adults: 2, children: 0,
    budgetMax: '', amenities: [], kosherLevel: '', notes: '',
    contactName: '', contactEmail: '', contactPhone: '',
  });
  const [phase, setPhase] = useState('form'); // 'form' | 'searching' | 'result'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(patch) { setForm((f) => ({ ...f, ...patch })); }

  function toggleAmenity(value) {
    if (value === 'kosher') { set({ kosherLevel: form.kosherLevel === 'kosher' ? '' : 'kosher' }); return; }
    set({ amenities: form.amenities.includes(value) ? form.amenities.filter((a) => a !== value) : [...form.amenities, value] });
  }

  const step = steps[stepIndex];
  const canGoNext = step !== 'where' || Boolean(form.region);
  const canGoNextContact = step !== 'contact' || /\S+@\S+\.\S+/.test(form.contactEmail);

  function goNext() {
    if (stepIndex < steps.length - 1) { setStepIndex((i) => i + 1); return; }
    handleSubmit();
  }
  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    setPhase('searching');
    const payload = {
      region: form.region, city: form.city || undefined,
      checkIn: form.checkIn || undefined, checkOut: form.checkOut || undefined,
      adults: form.adults, children: form.children,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      amenities: form.amenities, kosherLevel: form.kosherLevel || undefined,
      notes: form.notes || undefined,
      contactName: isLoggedIn ? traveler.name : form.contactName,
      contactEmail: isLoggedIn ? traveler.email : form.contactEmail,
      contactPhone: form.contactPhone || undefined,
    };
    const minDelay = new Promise((resolve) => setTimeout(resolve, 2400));
    try {
      const [res] = await Promise.all([requestApi.create(payload, travelerToken), minDelay]);
      setResult(res);
      setPhase('result');
    } catch (err) {
      await minDelay;
      setError(err.message || t.requestSubmitError);
      setPhase('form');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'searching') {
    return (
      <div className="req-page" dir={dir}>
        <AnimatePresence mode="wait">
          <SearchingAnimation key="searching" label={t.requestSearchingLabel} />
        </AnimatePresence>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const hasGoodMatches = result.matchedPropertiesCount > 0;
    return (
      <div className="req-page" dir={dir}>
        <BackButton fallbackTo="/" />
        <motion.div className="req-result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}>
            <CheckCircle2 size={40} className="req-result__icon" />
          </motion.div>
          {hasGoodMatches ? (
            <>
              <h1 className="req-result__title">{t.requestFoundTitle(result.matchedPropertiesCount)}</h1>
              <p className="req-result__sub">{t.requestFoundSub(result.notifiedOwnerCount)}</p>
            </>
          ) : (
            <>
              <h1 className="req-result__title">{t.requestFewFoundTitle(result.matchedPropertiesCount)}</h1>
              <p className="req-result__sub">
                {result.notifiedOwnerCount > 0 ? t.requestFewFoundSub(result.notifiedOwnerCount) : t.requestZeroFoundSub}
              </p>
            </>
          )}
        </motion.div>

        {result.properties?.length > 0 && (
          <motion.div className="container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
            <PropertyGrid properties={result.properties} isLoading={false} hasActiveFilters />
          </motion.div>
        )}

        <div className="req-result__actions">
          {isLoggedIn && <Link to="/account" className="req-result__link">{t.requestViewMineLink}</Link>}
          <Link to="/" className="req-result__link req-result__link--muted">{t.requestBackHomeLink}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="req-page" dir={dir}>
      <BackButton fallbackTo="/" />

      <div className="req-header">
        <h1 className="req-header__title">{t.requestPageTitle}</h1>
        <p className="req-header__sub">{t.requestPageSub}</p>
        <div className="req-progress">
          {steps.map((s, i) => (
            <span key={s} className={`req-progress__dot${i <= stepIndex ? ' is-active' : ''}`} />
          ))}
        </div>
      </div>

      <div className="req-form">
        <AnimatePresence mode="wait">
          {step === 'where' && (
            <StepShell key="where" title={t.requestStepWhereTitle} sub={t.requestStepWhereSub}>
              <RegionPicker onSelectRegion={(r) => set({ region: form.region === r ? '' : r, city: '' })} activeRegion={form.region} />
              {form.region && (
                <input
                  className="req-input"
                  type="text"
                  placeholder={t.requestCityPlaceholder}
                  value={form.city}
                  onChange={(e) => set({ city: e.target.value })}
                />
              )}
            </StepShell>
          )}

          {step === 'when' && (
            <StepShell key="when" title={t.requestStepWhenTitle} sub={t.requestStepWhenSub}>
              <HeroDateRangeField checkIn={form.checkIn} checkOut={form.checkOut} onChange={set} />
            </StepShell>
          )}

          {step === 'guests' && (
            <StepShell key="guests" title={t.requestStepGuestsTitle} sub={t.requestStepGuestsSub}>
              <GuestStepper label={t.requestAdultsLabel} value={form.adults} onChange={(v) => set({ adults: v })} min={1} />
              <GuestStepper label={t.requestChildrenLabel} value={form.children} onChange={(v) => set({ children: v })} min={0} />
              <div className="req-field">
                <label className="req-field__label" htmlFor="req-budget">{t.requestBudgetLabel}</label>
                <input
                  id="req-budget"
                  className="req-input"
                  type="range"
                  min="150"
                  max="3000"
                  step="50"
                  value={form.budgetMax || 1500}
                  onChange={(e) => set({ budgetMax: e.target.value })}
                />
                <span className="req-budget__value">{t.requestBudgetUpTo(form.budgetMax || 1500)}</span>
              </div>
            </StepShell>
          )}

          {step === 'vibe' && (
            <StepShell key="vibe" title={t.requestStepVibeTitle} sub={t.requestStepVibeSub}>
              <div className="req-chips">
                {AMENITY_CHIPS.map(({ value, labelKey, icon: Icon }) => {
                  const active = value === 'kosher' ? form.kosherLevel === 'kosher' : form.amenities.includes(value);
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      className={`req-chip${active ? ' is-active' : ''}`}
                      onClick={() => toggleAmenity(value)}
                      whileTap={{ scale: 0.93 }}
                      animate={active ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 0.25 }}
                    >
                      <Icon size={16} /> {t[labelKey]}
                    </motion.button>
                  );
                })}
              </div>
              <textarea
                className="req-input req-input--textarea"
                rows={3}
                placeholder={t.requestNotesPlaceholder}
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </StepShell>
          )}

          {step === 'contact' && (
            <StepShell key="contact" title={t.requestStepContactTitle} sub={t.requestStepContactSub}>
              <div className="req-field">
                <label className="req-field__label" htmlFor="req-name"><UserIcon size={14} /> {t.requestContactNameLabel}</label>
                <input id="req-name" className="req-input" type="text" value={form.contactName} onChange={(e) => set({ contactName: e.target.value })} />
              </div>
              <div className="req-field">
                <label className="req-field__label" htmlFor="req-email"><Mail size={14} /> {t.requestContactEmailLabel} *</label>
                <input id="req-email" className="req-input" type="email" required value={form.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
              </div>
              <div className="req-field">
                <label className="req-field__label" htmlFor="req-phone"><Phone size={14} /> {t.requestContactPhoneLabel}</label>
                <input id="req-phone" className="req-input" type="tel" inputMode="tel" value={form.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
              </div>
            </StepShell>
          )}
        </AnimatePresence>

        {error && <p className="req-error">{error}</p>}

        <div className="req-nav">
          {stepIndex > 0 && (
            <button type="button" className="req-nav__btn req-nav__btn--ghost" onClick={goBack}>
              <ArrowRight size={16} /> {t.requestBackButton}
            </button>
          )}
          <motion.button
            type="button"
            className="req-nav__btn req-nav__btn--primary"
            onClick={goNext}
            disabled={!canGoNext || !canGoNextContact || submitting}
            whileTap={{ scale: 0.97 }}
          >
            {stepIndex === steps.length - 1 ? (
              <><Search size={16} /> {t.requestSubmitButton}</>
            ) : (
              <>{t.requestNextButton} <ArrowLeft size={16} /></>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
