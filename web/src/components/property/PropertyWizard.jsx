import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Circle } from 'lucide-react';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { propertyApi } from '../../api/client.js';
import { REGIONS, PROPERTY_TYPES, KOSHER_LEVELS, AMENITIES } from '../../data/propertyOptions.js';
import { townsForRegion } from '../../data/israeliTowns.js';
import { PropertyUnitsStep } from './PropertyUnitsStep.jsx';
import { PropertyPhotoUploader } from './PropertyPhotoUploader.jsx';
import { PropertyCard } from '../PropertyCard.jsx';

const TOTAL_STEPS = 7;
const STEP_TITLES = ['פרטים בסיסיים', 'מיקום', 'יחידות במתחם', 'מתקנים משותפים וכשרות', 'תמונות המתחם', 'פרטי קשר', 'תצוגה מקדימה ופרסום'];

const CHECKLIST_LABELS = {
  region: 'בחירת אזור', city: 'עיר / יישוב', name: 'שם הנכס', property_type: 'סוג נכס',
  unit: 'לפחות יחידה אחת', unit_price_capacity: 'מחיר וקיבולת לכל יחידה',
  complex_photos: 'לפחות 3 תמונות למתחם', unit_photos: 'תמונה אחת לפחות לכל יחידה',
  contact: 'טלפון או וואטסאפ',
};

/** 9.5: builds a PropertyCard-shaped object straight from wizard state (no fetch — the wizard
 * already has everything in memory) for the step-7 live preview. */
function buildPreviewProperty({ name, region, city, ownerImages, units, amenities }) {
  const activeUnits = units.filter((u) => u.is_active !== false);
  const pricedUnits = activeUnits.filter((u) => u.base_price_night);
  return {
    id: 'preview',
    name: name || 'שם הנכס',
    region,
    city,
    status: 'claimed',
    owner_images: ownerImages,
    price_from: pricedUnits.length ? Math.min(...pricedUnits.map((u) => Number(u.base_price_night))) : null,
    total_guest_capacity: activeUnits.reduce((sum, u) => sum + (Number(u.max_guests) || 0), 0) || null,
    max_bedrooms: Math.max(0, ...activeUnits.map((u) => Number(u.bedrooms) || 0)) || null,
    unit_count: activeUnits.length,
    currency: 'ILS',
    ...amenities,
  };
}

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 28 } },
  exit: (dir) => ({ x: dir > 0 ? '-80%' : '80%', opacity: 0, transition: { duration: 0.22 } }),
};

function ProgressBar({ step }) {
  return (
    <div className="wizard-progress">
      <div className="wizard-progress__track">
        <motion.div className="wizard-progress__fill" animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
      </div>
      <span className="wizard-progress__label">
        {STEP_TITLES[step - 1]} — <span dir="ltr">{step}/{TOTAL_STEPS}</span>
      </span>
    </div>
  );
}

function WizardStep({ title, children }) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__title">{title}</h2>
      <div className="wizard-step__body">{children}</div>
    </div>
  );
}

/**
 * PropertyWizard — 7.4 multi-step listing form. Persists incrementally: the draft property is
 * created as soon as step 2 (location) is complete, and every later step saves straight to the
 * server — so closing the wizard at any point leaves a resumable draft (7.4: "שמירת טיוטה"),
 * with no separate save-draft action needed. Publishing (draft -> active) only happens on the
 * last step, gated by the server-side checklist (propertyStore.getPublishChecklist).
 */
export function PropertyWizard({ initialData = null, propertyId: initialPropertyId = null, onSuccess, onCancel }) {
  const { token } = useAgentAuth();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [units, setUnits] = useState(initialData?.units || []);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [nameError, setNameError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const [name, setName] = useState(initialData?.name || '');
  const [propertyType, setPropertyType] = useState(initialData?.property_type || 'zimmer');
  const [description, setDescription] = useState(initialData?.description || '');

  const [region, setRegion] = useState(initialData?.region || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [latitude, setLatitude] = useState(initialData?.latitude ?? null);
  const [longitude, setLongitude] = useState(initialData?.longitude ?? null);

  const [amenities, setAmenities] = useState(() => {
    const state = {};
    for (const a of AMENITIES) state[a.value] = Boolean(initialData?.[a.value]);
    return state;
  });
  const [kosherLevel, setKosherLevel] = useState(initialData?.kosher_level || 'not_applicable');

  const [ownerImages, setOwnerImages] = useState(initialData?.owner_images || []);

  const [phone, setPhone] = useState(initialData?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || '');
  const [website, setWebsite] = useState(initialData?.website || '');

  // Resuming an existing draft (or editing a live listing) — refetch the full owner-scoped
  // record so units/photos/etc. are current even if the dashboard's list view was stale.
  useEffect(() => {
    if (!initialPropertyId) return;
    propertyApi.getOneMine(token, initialPropertyId).then(({ property: p }) => {
      setStatus(p.status);
      setUnits(p.units || []);
      setName(p.name || '');
      setPropertyType(p.property_type || 'zimmer');
      setDescription(p.description || '');
      setRegion(p.region || '');
      setCity(p.city || '');
      setAddress(p.address || '');
      setLatitude(p.latitude ?? null);
      setLongitude(p.longitude ?? null);
      const amenityState = {};
      for (const a of AMENITIES) amenityState[a.value] = Boolean(p[a.value]);
      setAmenities(amenityState);
      setKosherLevel(p.kosher_level || 'not_applicable');
      setOwnerImages(p.owner_images || []);
      setPhone(p.phone || '');
      setWhatsapp(p.whatsapp || '');
      setWebsite(p.website || '');
    }).catch(() => {});
  }, [initialPropertyId, token]);

  const isNewDraft = status === 'draft';

  function go(next) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function toggleAmenity(value) {
    setAmenities((prev) => ({ ...prev, [value]: !prev[value] }));
  }

  async function persist(patch) {
    if (!propertyId) return;
    setSaving(true);
    setApiError(null);
    try {
      await propertyApi.update(token, propertyId, patch);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (step === 1) {
      if (!name.trim()) { setNameError('שם הנכס הוא שדה חובה'); return; }
      setNameError('');
      go(2);
      return;
    }

    if (step === 2) {
      if (!region || !city.trim()) { setLocationError('אזור ועיר הם שדות חובה'); return; }
      setLocationError('');
      setSaving(true);
      setApiError(null);
      try {
        if (!propertyId) {
          const { property } = await propertyApi.create(token, {
            name, property_type: propertyType, description: description || null,
            region, city, address: address || null, latitude, longitude,
          });
          setPropertyId(property.id);
          setUnits(property.units || []);
          setStatus(property.status);
        } else {
          await propertyApi.update(token, propertyId, {
            name, property_type: propertyType, description: description || null,
            region, city, address: address || null, latitude, longitude,
          });
        }
        go(3);
      } catch (err) {
        setApiError(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 4) {
      await persist({ ...amenities, kosher_level: kosherLevel });
      go(5);
      return;
    }

    if (step === 6) {
      await persist({ phone: phone || null, whatsapp: whatsapp || null, website: website || null });
      const { ok, missing } = await propertyApi.getPublishChecklist(token, propertyId);
      setChecklist({ ok, missing });
      go(7);
      return;
    }

    go(step + 1);
  }

  async function handlePublish() {
    setPublishing(true);
    setApiError(null);
    try {
      const result = await propertyApi.publish(token, propertyId);
      if (!result.ok) {
        setChecklist(result);
        setPublishing(false);
        return;
      }
      onSuccess?.();
    } catch (err) {
      setApiError(err.message);
      setPublishing(false);
    }
  }

  function handleFinishEditing() {
    onSuccess?.();
  }

  return (
    <div className="deal-wizard">
      <div className="wizard-header">
        <ProgressBar step={step} />
        <button type="button" className="wizard-header__close" onClick={onCancel} aria-label="סגור">
          <X size={20} />
        </button>
      </div>

      <div className="wizard-steps-wrap">
        <AnimatePresence mode="wait" custom={dir}>
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="פרטים בסיסיים">
                <div className="wizard-field">
                  <label className="wizard-label">שם הנכס</label>
                  <input className={`wizard-input${nameError ? ' wizard-input--error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: צימר הגליל העליון" />
                  {nameError && <p className="wizard-error">{nameError}</p>}
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">סוג נכס</label>
                  <select className="wizard-input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    {PROPERTY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">תיאור</label>
                  <textarea className="wizard-input wizard-input--textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ספרו לאורחים על הנכס…" />
                </div>
              </WizardStep>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="מיקום">
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">אזור</label>
                    <select className="wizard-input" value={region} onChange={(e) => setRegion(e.target.value)}>
                      <option value="">בחרו אזור</option>
                      {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">עיר / יישוב</label>
                    <input
                      className="wizard-input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      list="wizard-city-options"
                      placeholder="התחילו להקליד…"
                      autoComplete="off"
                    />
                    <datalist id="wizard-city-options">
                      {townsForRegion(region).map((town) => <option key={town} value={town} />)}
                    </datalist>
                  </div>
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">כתובת (אופציונלי)</label>
                  <input className="wizard-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="רחוב ומספר" />
                </div>
                {locationError && <p className="wizard-error">{locationError}</p>}
                <p className="wizard-hint">מיקום מדויק על המפה יושלם אוטומטית ברקע מהכתובת שהזנתם — לא צריך לסמן דבר.</p>
              </WizardStep>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="יחידות במתחם">
                {propertyId ? (
                  <PropertyUnitsStep propertyId={propertyId} units={units} onUnitsChange={setUnits} />
                ) : (
                  <p className="agent-form__hint">השלימו את שלב המיקום כדי להמשיך</p>
                )}
              </WizardStep>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="מתקנים משותפים וכשרות">
                <div className="wizard-checkboxes">
                  {AMENITIES.map((a) => (
                    <label key={a.value} className="wizard-checkbox">
                      <input type="checkbox" checked={Boolean(amenities[a.value])} onChange={() => toggleAmenity(a.value)} />
                      {a.label}
                    </label>
                  ))}
                </div>
                <div className="wizard-field" style={{ marginTop: 16 }}>
                  <label className="wizard-label">כשרות</label>
                  <select className="wizard-input" value={kosherLevel} onChange={(e) => setKosherLevel(e.target.value)}>
                    {KOSHER_LEVELS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
              </WizardStep>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="תמונות המתחם">
                <PropertyPhotoUploader
                  images={ownerImages}
                  onChange={(images) => { setOwnerImages(images); persist({ owner_images: images }); }}
                  label="תמונות המתחם (אזורים/מתקנים משותפים)"
                  minRequired={3}
                />
              </WizardStep>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="s6" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="פרטי קשר">
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">טלפון</label>
                    <input className="wizard-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">WhatsApp</label>
                    <input className="wizard-input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+972501234567" />
                  </div>
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">אתר אינטרנט (אופציונלי)</label>
                  <input className="wizard-input" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
                </div>
                {apiError && <p className="wizard-error">{apiError}</p>}
              </WizardStep>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div key="s7" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="תצוגה מקדימה ופרסום">
                <p className="agent-form__hint" style={{ marginBottom: 10 }}>ככה הנכס ייראה בתוצאות חיפוש:</p>
                {/* Reuses the real search-result card so the preview is pixel-accurate, not a
                    text summary. onClickCapture blocks the card's internal <Link> navigation
                    (preventDefault runs before Link's own click handler, in the capture phase). */}
                <div
                  onClickCapture={(e) => e.preventDefault()}
                  style={{ maxWidth: 300, margin: '0 auto 8px', cursor: 'default' }}
                >
                  <PropertyCard property={buildPreviewProperty({ name, region, city, ownerImages, units, amenities })} />
                </div>
                <p className="agent-form__hint">{units.length} יחידות · {ownerImages.length} תמונות מתחם</p>

                {checklist && (
                  <div className="wpc">
                    {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
                      <div key={key} className={`wpc__item ${checklist.missing.includes(key) ? 'wpc__item--missing' : 'wpc__item--ok'}`}>
                        {checklist.missing.includes(key) ? <Circle size={14} /> : <CheckCircle2 size={14} />}
                        {label}
                      </div>
                    ))}
                  </div>
                )}
                {apiError && <p className="wizard-error">{apiError}</p>}
              </WizardStep>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="wizard-footer">
        {step > 1 && (
          <motion.button type="button" className="wizard-btn wizard-btn--ghost" whileTap={{ scale: 0.97 }} onClick={() => go(step - 1)}>
            ← חזרה
          </motion.button>
        )}
        <div style={{ flex: 1 }} />
        {step < TOTAL_STEPS ? (
          <motion.button type="button" className="wizard-btn wizard-btn--primary" whileTap={{ scale: 0.97 }} onClick={handleNext} disabled={saving}>
            {saving ? 'שומר…' : 'הבא →'}
          </motion.button>
        ) : isNewDraft ? (
          <motion.button type="button" className="wizard-btn wizard-btn--primary" whileTap={{ scale: 0.97 }} onClick={handlePublish} disabled={publishing || (checklist && !checklist.ok)}>
            {publishing ? 'מפרסם…' : 'פרסם נכס'}
          </motion.button>
        ) : (
          <motion.button type="button" className="wizard-btn wizard-btn--primary" whileTap={{ scale: 0.97 }} onClick={handleFinishEditing}>
            סיום עריכה
          </motion.button>
        )}
      </div>
    </div>
  );
}
