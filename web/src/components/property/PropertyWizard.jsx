import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { propertyApi } from '../../api/client.js';
import { REGIONS, PROPERTY_TYPES, KOSHER_LEVELS, AMENITIES } from '../../data/propertyOptions.js';

const TOTAL_STEPS = 4;

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
      <span className="wizard-progress__label">{step} / {TOTAL_STEPS}</span>
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

/** PropertyWizard — same shell as DealWizard (.wizard-* classes), property fields instead of flight/hotel/car fields. */
export function PropertyWizard({ initialData = null, propertyId = null, onSuccess, onCancel }) {
  const { token } = useAgentAuth();
  const isEditing = Boolean(propertyId);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [nameError, setNameError] = useState('');

  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('zimmer');
  const [region, setRegion] = useState('north');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  const [guestCapacity, setGuestCapacity] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [beds, setBeds] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [amenities, setAmenities] = useState({});
  const [kosherLevel, setKosherLevel] = useState('not_applicable');

  const [basePrice, setBasePrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');
  const [holidayPrice, setHolidayPrice] = useState('');
  const [cleaningFee, setCleaningFee] = useState('');
  const [minNights, setMinNights] = useState('1');
  const [currency, setCurrency] = useState('ILS');

  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [imagesText, setImagesText] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name || '');
    setPropertyType(initialData.property_type || 'zimmer');
    setRegion(initialData.region || 'north');
    setCity(initialData.city || '');
    setAddress(initialData.address || '');
    setGuestCapacity(initialData.guest_capacity ? String(initialData.guest_capacity) : '');
    setBedrooms(initialData.bedrooms ? String(initialData.bedrooms) : '');
    setBeds(initialData.beds ? String(initialData.beds) : '');
    setBathrooms(initialData.bathrooms ? String(initialData.bathrooms) : '');
    const amenityState = {};
    for (const a of AMENITIES) amenityState[a.value] = Boolean(initialData[a.value]);
    setAmenities(amenityState);
    setKosherLevel(initialData.kosher_level || 'not_applicable');
    setBasePrice(initialData.base_price_night ? String(initialData.base_price_night) : '');
    setWeekendPrice(initialData.weekend_price ? String(initialData.weekend_price) : '');
    setHolidayPrice(initialData.holiday_price ? String(initialData.holiday_price) : '');
    setCleaningFee(initialData.cleaning_fee ? String(initialData.cleaning_fee) : '');
    setMinNights(initialData.min_nights ? String(initialData.min_nights) : '1');
    setCurrency(initialData.currency || 'ILS');
    setPhone(initialData.phone || '');
    setWhatsapp(initialData.whatsapp || '');
    setWebsite(initialData.website || '');
    setImagesText((initialData.owner_images || []).join('\n'));
    setDescription(initialData.description || '');
  }, [initialData]);

  function go(next) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function toggleAmenity(value) {
    setAmenities((prev) => ({ ...prev, [value]: !prev[value] }));
  }

  function validateAndNext() {
    if (step === 1) {
      if (!name.trim()) { setNameError('שם הנכס הוא שדה חובה'); return; }
      setNameError('');
    }
    go(step + 1);
  }

  async function handleSubmit() {
    if (!name.trim()) { setNameError('שם הנכס הוא שדה חובה'); setStep(1); return; }
    setSubmitting(true);
    setApiError(null);
    const payload = {
      name,
      property_type: propertyType,
      region,
      city: city || null,
      address: address || null,
      guest_capacity: guestCapacity ? Number(guestCapacity) : null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      beds: beds ? Number(beds) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      ...amenities,
      kosher_level: kosherLevel,
      base_price_night: basePrice ? Number(basePrice) : null,
      weekend_price: weekendPrice ? Number(weekendPrice) : null,
      holiday_price: holidayPrice ? Number(holidayPrice) : null,
      cleaning_fee: cleaningFee ? Number(cleaningFee) : null,
      min_nights: minNights ? Number(minNights) : 1,
      currency,
      phone: phone || null,
      whatsapp: whatsapp || null,
      website: website || null,
      owner_images: imagesText.split('\n').map((s) => s.trim()).filter(Boolean),
      description: description || null,
    };
    try {
      if (isEditing) {
        await propertyApi.update(token, propertyId, payload);
      } else {
        await propertyApi.create(token, payload);
      }
      onSuccess?.();
    } catch (err) {
      setApiError(err.message);
      setSubmitting(false);
    }
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
              <WizardStep title="פרטי הנכס">
                <div className="wizard-field">
                  <label className="wizard-label">שם הנכס</label>
                  <input className={`wizard-input${nameError ? ' wizard-input--error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: צימר הגליל העליון" />
                  {nameError && <p className="wizard-error">{nameError}</p>}
                </div>
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">סוג נכס</label>
                    <select className="wizard-input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                      {PROPERTY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">אזור</label>
                    <select className="wizard-input" value={region} onChange={(e) => setRegion(e.target.value)}>
                      {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">עיר / יישוב</label>
                    <input className="wizard-input" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">כתובת</label>
                    <input className="wizard-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
              </WizardStep>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="קיבולת ומתקנים">
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">מספר אורחים</label>
                    <input className="wizard-input" type="number" min="1" value={guestCapacity} onChange={(e) => setGuestCapacity(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">חדרי שינה</label>
                    <input className="wizard-input" type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                  </div>
                </div>
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">מיטות</label>
                    <input className="wizard-input" type="number" min="0" value={beds} onChange={(e) => setBeds(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">חדרי רחצה</label>
                    <input className="wizard-input" type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                  </div>
                </div>
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

          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="תמחור">
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">מחיר בסיס ללילה</label>
                    <input className="wizard-input" type="number" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">מחיר סופ"ש</label>
                    <input className="wizard-input" type="number" min="0" value={weekendPrice} onChange={(e) => setWeekendPrice(e.target.value)} />
                  </div>
                </div>
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">מחיר חג</label>
                    <input className="wizard-input" type="number" min="0" value={holidayPrice} onChange={(e) => setHolidayPrice(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">דמי ניקיון</label>
                    <input className="wizard-input" type="number" min="0" value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} />
                  </div>
                </div>
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">מינימום לילות</label>
                    <input className="wizard-input" type="number" min="1" value={minNights} onChange={(e) => setMinNights(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">מטבע</label>
                    <select className="wizard-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option value="ILS">₪ ILS</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                  </div>
                </div>
              </WizardStep>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title="יצירת קשר ותמונות">
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
                <div className="wizard-field">
                  <label className="wizard-label">תמונות — קישור לכל תמונה בשורה נפרדת</label>
                  <textarea className="wizard-input" rows={3} value={imagesText} onChange={(e) => setImagesText(e.target.value)} placeholder="https://…" />
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">תיאור</label>
                  <textarea className="wizard-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ספרו לאורחים על הנכס…" />
                </div>
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
          <motion.button type="button" className="wizard-btn wizard-btn--primary" whileTap={{ scale: 0.97 }} onClick={validateAndNext}>
            הבא →
          </motion.button>
        ) : (
          <motion.button type="button" className="wizard-btn wizard-btn--primary" whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'שולח…' : isEditing ? 'שמור שינויים' : 'פרסם נכס'}
          </motion.button>
        )}
      </div>
    </div>
  );
}
