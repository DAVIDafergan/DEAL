import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { agentApi } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { AnimatedIcon } from '../questionnaire/AnimatedIcon.jsx';

const DESTINATIONS = [
  { iata: 'BCN', name: 'ברצלונה', country: 'ספרד' },
  { iata: 'CDG', name: 'פריז', country: 'צרפת' },
  { iata: 'FCO', name: 'רומא', country: 'איטליה' },
  { iata: 'AMS', name: 'אמסטרדם', country: 'הולנד' },
  { iata: 'ATH', name: 'אתונה', country: 'יוון' },
  { iata: 'LCA', name: 'לרנקה', country: 'קפריסין' },
  { iata: 'IST', name: 'איסטנבול', country: 'טורקיה' },
  { iata: 'DXB', name: 'דובאי', country: 'איחוד האמירויות' },
  { iata: 'BKK', name: 'בנגקוק', country: 'תאילנד' },
  { iata: 'LHR', name: 'לונדון', country: 'בריטניה' },
  { iata: 'MXP', name: 'מילאנו', country: 'איטליה' },
  { iata: 'VIE', name: 'וינה', country: 'אוסטריה' },
  { iata: 'BUD', name: 'בודפשט', country: 'הונגריה' },
  { iata: 'PRG', name: 'פראג', country: 'צ׳כיה' },
  { iata: 'LIS', name: 'ליסבון', country: 'פורטוגל' },
  { iata: 'MAD', name: 'מדריד', country: 'ספרד' },
  { iata: 'RHO', name: 'רודוס', country: 'יוון' },
  { iata: 'HER', name: 'הרקליון', country: 'יוון' },
  { iata: 'SKG', name: 'תסלוניקי', country: 'יוון' },
  { iata: 'DBV', name: 'דוברובניק', country: 'קרואטיה' },
  { iata: 'NRT', name: 'טוקיו', country: 'יפן' },
  { iata: 'SIN', name: 'סינגפור', country: 'סינגפור' },
  { iata: 'JFK', name: 'ניו יורק', country: 'ארה"ב' },
  { iata: 'HRG', name: 'הורגדה', country: 'מצרים' },
  { iata: 'SSH', name: 'שארם א-שייח׳', country: 'מצרים' },
  { iata: 'MLA', name: 'מלטה', country: 'מלטה' },
  { iata: 'PMI', name: 'פאלמה', country: 'ספרד' },
  { iata: 'CPH', name: 'קופנהגן', country: 'דנמרק' },
  { iata: 'WAW', name: 'ורשה', country: 'פולין' },
  { iata: 'SPU', name: 'ספליט', country: 'קרואטיה' },
];

const AIRLINES = [
  'Arkia', 'Israir', 'EL AL', 'Ryanair', 'EasyJet', 'Wizz Air', 'Vueling',
  'Turkish Airlines', 'Lufthansa', 'KLM', 'Air France', 'Swiss', 'Austrian',
  'British Airways', 'Iberia', 'Emirates', 'flydubai', 'Air Arabia',
  'LOT', 'Pegasus', 'SunExpress', 'Aegean', 'Corendon',
];

const TOTAL_STEPS = 6;

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 28 } },
  exit: (dir) => ({ x: dir > 0 ? '-80%' : '80%', opacity: 0, transition: { duration: 0.22 } }),
};

function ProgressBar({ step }) {
  return (
    <div className="wizard-progress">
      <div className="wizard-progress__track">
        <motion.div
          className="wizard-progress__fill"
          animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>
      <span className="wizard-progress__label">{step} / {TOTAL_STEPS}</span>
    </div>
  );
}

function WizardStep({ title, iconName, children }) {
  return (
    <div className="wizard-step">
      {iconName && (
        <div className="wizard-step__icon">
          <AnimatedIcon name={iconName} size={48} />
        </div>
      )}
      <h2 className="wizard-step__title">{title}</h2>
      <div className="wizard-step__body">{children}</div>
    </div>
  );
}

function BigChoice({ label, icon, selected, onClick }) {
  return (
    <motion.button
      type="button"
      className={`wizard-choice${selected ? ' wizard-choice--selected' : ''}`}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
    >
      {icon && <span className="wizard-choice__icon">{icon}</span>}
      <span className="wizard-choice__label">{label}</span>
    </motion.button>
  );
}

export function DealWizard({ onSuccess, onCancel }) {
  const { token } = useAgentAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Step 1 — destination
  const [destQuery, setDestQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState(null);
  const [showDrop, setShowDrop] = useState(false);
  const [media, setMedia] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [destError, setDestError] = useState('');

  // Step 2 — dates
  const [departure, setDeparture] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [datesError, setDatesError] = useState('');

  // Step 3 — flight
  const [airline, setAirline] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [cabinBag, setCabinBag] = useState(true);
  const [checkedBag, setCheckedBag] = useState(false);
  const [meal, setMeal] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);

  // Step 4 — hotel
  const [includeHotel, setIncludeHotel] = useState(null); // null|true|false
  const [hotelName, setHotelName] = useState('');
  const [hotelStars, setHotelStars] = useState('');
  const [hotelBreakfast, setHotelBreakfast] = useState(false);
  const [hotelLunch, setHotelLunch] = useState(false);
  const [hotelDinner, setHotelDinner] = useState(false);
  const [hotelLink, setHotelLink] = useState('');

  // Step 5 — car
  const [includeCar, setIncludeCar] = useState(null);
  const [carType, setCarType] = useState('');
  const [carCompany, setCarCompany] = useState('');

  // Step 6 — price
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [priceError, setPriceError] = useState('');

  const filtered = DESTINATIONS.filter(d =>
    !destQuery || d.name.includes(destQuery) || d.iata.toLowerCase().includes(destQuery.toLowerCase()) || d.country.includes(destQuery)
  );

  async function selectDest(dest) {
    setSelectedDest(dest);
    setDestQuery(`${dest.name}, ${dest.country}`);
    setShowDrop(false);
    setDestError('');
    setMediaLoading(true);
    setMedia(null);
    try { setMedia(await agentApi.getMedia(token, dest.iata)); } catch {}
    finally { setMediaLoading(false); }
  }

  function go(next) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function validateAndNext() {
    if (step === 1) {
      if (!selectedDest) { setDestError(t.requiredField || 'בחר יעד מהרשימה'); return; }
      go(2);
    } else if (step === 2) {
      if (!departure) { setDatesError(t.requiredField || 'שדה חובה'); return; }
      setDatesError('');
      go(3);
    } else if (step === 3) {
      go(4);
    } else if (step === 4) {
      if (includeHotel === null) { return; }
      go(5);
    } else if (step === 5) {
      if (includeCar === null) { return; }
      go(6);
    }
  }

  async function handleSubmit() {
    if (!price || Number(price) <= 0) { setPriceError(t.requiredField || 'שדה חובה'); return; }
    setPriceError('');
    setSubmitting(true);
    setApiError(null);
    try {
      await agentApi.createDeal(token, {
        destination: selectedDest.iata,
        destination_name: selectedDest.name,
        country: selectedDest.country,
        photo_url: media?.photo_url || null,
        video_url: media?.video_url || null,
        departure_date: departure,
        return_date: returnDate || null,
        price: Number(price),
        currency,
        airline: airline || null,
        departure_time: departureTime || null,
        arrival_time: arrivalTime || null,
        includes_cabin_baggage: cabinBag ? 1 : 0,
        includes_checked_baggage: checkedBag ? 1 : 0,
        includes_meal: meal ? 1 : 0,
        is_exclusive: isExclusive ? 1 : 0,
        hotel_name: includeHotel ? hotelName || null : null,
        hotel_stars: includeHotel && hotelStars ? Number(hotelStars) : null,
        hotel_breakfast: includeHotel ? (hotelBreakfast ? 1 : 0) : 0,
        hotel_lunch: includeHotel ? (hotelLunch ? 1 : 0) : 0,
        hotel_dinner: includeHotel ? (hotelDinner ? 1 : 0) : 0,
        hotel_link: includeHotel ? hotelLink || null : null,
        car_type: includeCar ? carType || null : null,
        car_company: includeCar ? carCompany || null : null,
        purchase_link: purchaseLink || null,
        whatsapp_override: whatsapp || null,
        description: description || null,
        expires_at: expiresAt || null,
      });
      onSuccess?.();
    } catch (err) {
      setApiError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="deal-wizard">
      {/* Header */}
      <div className="wizard-header">
        <ProgressBar step={step} />
        <button type="button" className="wizard-header__close" onClick={onCancel} aria-label="סגור">
          <X size={20} />
        </button>
      </div>

      {/* Steps */}
      <div className="wizard-steps-wrap">
        <AnimatePresence mode="wait" custom={dir}>
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title={t.dealStepDest || 'לאן טסים?'} iconName="mapPin">
                <div className="wizard-dest-wrap">
                  <input
                    className="wizard-input wizard-input--dest"
                    value={destQuery}
                    onChange={e => { setDestQuery(e.target.value); setShowDrop(true); setSelectedDest(null); }}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                    placeholder="חפש עיר…"
                    autoComplete="off"
                  />
                  {showDrop && filtered.length > 0 && (
                    <ul className="wizard-dest-dropdown">
                      {filtered.slice(0, 8).map(d => (
                        <li key={d.iata} className="wizard-dest-option" onMouseDown={() => selectDest(d)}>
                          <span className="wizard-dest-iata">{d.iata}</span> {d.name}, {d.country}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {destError && <p className="wizard-error">{destError}</p>}
                {(mediaLoading || media?.photo_url) && (
                  <div className="wizard-media-preview">
                    {mediaLoading && <div className="wizard-media-loading">טוען תמונה…</div>}
                    {!mediaLoading && media?.photo_url && (
                      <img src={media.photo_url} alt={selectedDest?.name} className="wizard-media-img" />
                    )}
                  </div>
                )}
              </WizardStep>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title={t.dealStepDates || 'תאריכים'} iconName="calendar">
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">{t.departureDateLabel || 'יציאה'} *</label>
                    <input
                      className={`wizard-input${datesError ? ' wizard-input--error' : ''}`}
                      type="date"
                      value={departure}
                      onChange={e => { setDeparture(e.target.value); setDatesError(''); }}
                    />
                    {datesError && <p className="wizard-error">{datesError}</p>}
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">{t.returnDateLabel || 'חזרה (אופציונלי)'}</label>
                    <input className="wizard-input" type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                  </div>
                </div>
              </WizardStep>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title={t.dealStepFlight || 'פרטי טיסה'} iconName="mountain">
                <div className="wizard-field">
                  <label className="wizard-label">{t.airlineLabel || 'חברת תעופה'}</label>
                  <select className="wizard-input" value={airline} onChange={e => setAirline(e.target.value)}>
                    <option value="">{t.selectAirline || 'בחר חברת תעופה…'}</option>
                    {AIRLINES.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="other">{t.otherAirline || 'אחרת'}</option>
                  </select>
                </div>
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">{t.departureTimeLabel || '🛫 המראה'}</label>
                    <input className="wizard-input" type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">{t.arrivalTimeLabel || '🛬 נחיתה'}</label>
                    <input className="wizard-input" type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} />
                  </div>
                </div>
                {departureTime && arrivalTime && (() => {
                  const [dh, dm] = departureTime.split(':').map(Number);
                  const [ah, am] = arrivalTime.split(':').map(Number);
                  const mins = (ah * 60 + am) - (dh * 60 + dm);
                  if (mins > 0) {
                    const h = Math.floor(mins / 60), m = mins % 60;
                    return <p className="wizard-flight-duration">⏱ {t.flightDurationLabel || 'משך טיסה'}: {h}:{String(m).padStart(2,'0')}</p>;
                  }
                  return null;
                })()}
                <div className="wizard-checkboxes">
                  <label className="wizard-checkbox">
                    <input type="checkbox" checked={cabinBag} onChange={e => setCabinBag(e.target.checked)} />
                    {t.cabinBaggageLabel || '✓ כבודה לתא נוסעים'}
                  </label>
                  <label className="wizard-checkbox">
                    <input type="checkbox" checked={checkedBag} onChange={e => setCheckedBag(e.target.checked)} />
                    {t.checkedBaggageLabel || '✓ כבודה רשומה'}
                  </label>
                  <label className="wizard-checkbox">
                    <input type="checkbox" checked={meal} onChange={e => setMeal(e.target.checked)} />
                    {t.mealLabel || '✓ כולל ארוחה'}
                  </label>
                  <label className="wizard-checkbox">
                    <input type="checkbox" checked={isExclusive} onChange={e => setIsExclusive(e.target.checked)} />
                    {t.exclusiveDealLabel || '🔥 דיל בלעדי'}
                  </label>
                </div>
              </WizardStep>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title={t.dealStepHotel || 'מלון'} iconName="building">
                <div className="wizard-big-choices">
                  <BigChoice
                    label={t.yesInclude || 'כן, כולל מלון'}
                    icon="🏨"
                    selected={includeHotel === true}
                    onClick={() => setIncludeHotel(true)}
                  />
                  <BigChoice
                    label={t.noInclude || 'לא'}
                    icon="✈️"
                    selected={includeHotel === false}
                    onClick={() => setIncludeHotel(false)}
                  />
                </div>
                <AnimatePresence>
                  {includeHotel && (
                    <motion.div
                      className="wizard-expand"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3 } }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <div className="wizard-grid-2">
                        <div className="wizard-field">
                          <label className="wizard-label">{t.hotelNameLabel || 'שם המלון'}</label>
                          <input className="wizard-input" value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="למשל: Hilton Garden Inn" />
                        </div>
                        <div className="wizard-field">
                          <label className="wizard-label">{t.hotelStarsLabel || 'כוכבים'}</label>
                          <select className="wizard-input" value={hotelStars} onChange={e => setHotelStars(e.target.value)}>
                            <option value="">—</option>
                            {[3,4,5].map(s => <option key={s} value={s}>{s} ★</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="wizard-checkboxes">
                        <label className="wizard-checkbox">
                          <input type="checkbox" checked={hotelBreakfast} onChange={e => setHotelBreakfast(e.target.checked)} />
                          {t.hotelBreakfastLabel || '🍳 ארוחת בוקר'}
                        </label>
                        <label className="wizard-checkbox">
                          <input type="checkbox" checked={hotelLunch} onChange={e => setHotelLunch(e.target.checked)} />
                          {t.hotelLunchLabel || '🍽️ ארוחת צהריים'}
                        </label>
                        <label className="wizard-checkbox">
                          <input type="checkbox" checked={hotelDinner} onChange={e => setHotelDinner(e.target.checked)} />
                          {t.hotelDinnerLabel || '🌙 ארוחת ערב'}
                        </label>
                      </div>
                      <div className="wizard-field" style={{ marginTop: 12 }}>
                        <label className="wizard-label">{t.hotelLinkLabel || 'לינק למלון (אופציונלי)'}</label>
                        <input className="wizard-input" type="url" value={hotelLink} onChange={e => setHotelLink(e.target.value)} placeholder="https://…" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </WizardStep>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title={t.dealStepCar || 'רכב שכור'} iconName="wallet">
                <div className="wizard-big-choices">
                  <BigChoice
                    label={t.yesInclude || 'כן, כולל רכב'}
                    icon="🚗"
                    selected={includeCar === true}
                    onClick={() => setIncludeCar(true)}
                  />
                  <BigChoice
                    label={t.noInclude || 'לא'}
                    icon="✈️"
                    selected={includeCar === false}
                    onClick={() => setIncludeCar(false)}
                  />
                </div>
                <AnimatePresence>
                  {includeCar && (
                    <motion.div
                      className="wizard-expand"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3 } }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <div className="wizard-grid-2">
                        <div className="wizard-field">
                          <label className="wizard-label">{t.carTypeLabel || 'סוג הרכב'}</label>
                          <select className="wizard-input" value={carType} onChange={e => setCarType(e.target.value)}>
                            <option value="">{t.selectCarType || 'בחר…'}</option>
                            <option value="compact">{t.carCompact || 'קומפקטי'}</option>
                            <option value="family">{t.carFamily || 'משפחתי'}</option>
                            <option value="suv">{t.carSuv || 'SUV'}</option>
                            <option value="luxury">{t.carLuxury || 'יוקרה'}</option>
                            <option value="other">{t.carOther || 'אחר'}</option>
                          </select>
                        </div>
                        <div className="wizard-field">
                          <label className="wizard-label">{t.carCompanyLabel || 'חברת השכרה'}</label>
                          <input className="wizard-input" value={carCompany} onChange={e => setCarCompany(e.target.value)} placeholder="Hertz, Avis…" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </WizardStep>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="s6" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
              <WizardStep title={t.dealStepPrice || 'מחיר ופרטים'} iconName="infinity">
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">{t.priceLabel || 'מחיר'} *</label>
                    <input
                      className={`wizard-input${priceError ? ' wizard-input--error' : ''}`}
                      type="number" min="1" inputMode="numeric"
                      value={price} onChange={e => { setPrice(e.target.value); setPriceError(''); }}
                      placeholder="1299"
                    />
                    {priceError && <p className="wizard-error">{priceError}</p>}
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">{t.currencyLabel || 'מטבע'}</label>
                    <select className="wizard-input" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="ILS">ILS ₪</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                      <option value="GBP">GBP £</option>
                    </select>
                  </div>
                </div>
                <div className="wizard-grid-2">
                  <div className="wizard-field">
                    <label className="wizard-label">{t.purchaseLinkLabel || 'לינק רכישה'}</label>
                    <input className="wizard-input" type="url" value={purchaseLink} onChange={e => setPurchaseLink(e.target.value)} placeholder="https://…" />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">{t.whatsappOverrideLabel || 'WhatsApp'}</label>
                    <input className="wizard-input" type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+972501234567" />
                  </div>
                  <div className="wizard-field">
                    <label className="wizard-label">{t.expiresAtLabel || 'בתוקף עד'}</label>
                    <input className="wizard-input" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                  </div>
                </div>
                <div className="wizard-field">
                  <label className="wizard-label">{t.dealDescriptionLabel || 'תיאור'}</label>
                  <textarea className="wizard-input wizard-input--textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                {apiError && <p className="wizard-error">{apiError}</p>}
              </WizardStep>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="wizard-footer">
        {step > 1 && (
          <motion.button type="button" className="wizard-btn wizard-btn--ghost" whileTap={{ scale: 0.97 }} onClick={() => go(step - 1)}>
            {t.prevButton || '← חזרה'}
          </motion.button>
        )}
        <div style={{ flex: 1 }} />
        {step < TOTAL_STEPS ? (
          <motion.button
            type="button"
            className="wizard-btn wizard-btn--primary"
            whileTap={{ scale: 0.97 }}
            onClick={validateAndNext}
            disabled={step === 4 && includeHotel === null || step === 5 && includeCar === null}
          >
            {t.nextButton || 'הבא →'}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            className="wizard-btn wizard-btn--primary"
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (t.submittingLabel || 'שולח…') : (t.submitDealButton || 'שלח לאישור')}
          </motion.button>
        )}
      </div>
    </div>
  );
}
