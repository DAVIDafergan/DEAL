import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Plane, Hotel, Car, Package } from 'lucide-react';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { agentApi } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

const DESTINATIONS = [
  { iata: 'BCN', name: 'Barcelona', country: 'Spain' },
  { iata: 'CDG', name: 'Paris', country: 'France' },
  { iata: 'FCO', name: 'Rome', country: 'Italy' },
  { iata: 'AMS', name: 'Amsterdam', country: 'Netherlands' },
  { iata: 'ATH', name: 'Athens', country: 'Greece' },
  { iata: 'LCA', name: 'Larnaca', country: 'Cyprus' },
  { iata: 'IST', name: 'Istanbul', country: 'Turkey' },
  { iata: 'DXB', name: 'Dubai', country: 'UAE' },
  { iata: 'BKK', name: 'Bangkok', country: 'Thailand' },
  { iata: 'LHR', name: 'London', country: 'UK' },
  { iata: 'MXP', name: 'Milan', country: 'Italy' },
  { iata: 'VIE', name: 'Vienna', country: 'Austria' },
  { iata: 'BUD', name: 'Budapest', country: 'Hungary' },
  { iata: 'PRG', name: 'Prague', country: 'Czech Republic' },
  { iata: 'LIS', name: 'Lisbon', country: 'Portugal' },
  { iata: 'MAD', name: 'Madrid', country: 'Spain' },
  { iata: 'RHO', name: 'Rhodes', country: 'Greece' },
  { iata: 'HER', name: 'Heraklion', country: 'Greece' },
  { iata: 'SKG', name: 'Thessaloniki', country: 'Greece' },
  { iata: 'DBV', name: 'Dubrovnik', country: 'Croatia' },
  { iata: 'SPU', name: 'Split', country: 'Croatia' },
  { iata: 'NRT', name: 'Tokyo', country: 'Japan' },
  { iata: 'SIN', name: 'Singapore', country: 'Singapore' },
  { iata: 'SYD', name: 'Sydney', country: 'Australia' },
  { iata: 'CPH', name: 'Copenhagen', country: 'Denmark' },
  { iata: 'OSL', name: 'Oslo', country: 'Norway' },
  { iata: 'ARN', name: 'Stockholm', country: 'Sweden' },
  { iata: 'JFK', name: 'New York', country: 'USA' },
  { iata: 'LAX', name: 'Los Angeles', country: 'USA' },
  { iata: 'WAW', name: 'Warsaw', country: 'Poland' },
  { iata: 'OTP', name: 'Bucharest', country: 'Romania' },
  { iata: 'SOF', name: 'Sofia', country: 'Bulgaria' },
  { iata: 'PMI', name: 'Palma', country: 'Spain' },
  { iata: 'ZAG', name: 'Zagreb', country: 'Croatia' },
  { iata: 'TLV', name: 'Tel Aviv', country: 'Israel' },
  { iata: 'EYL', name: 'Eilat', country: 'Israel' },
  { iata: 'CAI', name: 'Cairo', country: 'Egypt' },
  { iata: 'HRG', name: 'Hurghada', country: 'Egypt' },
  { iata: 'SSH', name: 'Sharm El Sheikh', country: 'Egypt' },
  { iata: 'MLA', name: 'Malta', country: 'Malta' },
];

const AIRLINES = [
  'Arkia', 'Israir', 'EL AL', 'Ryanair', 'EasyJet', 'Wizz Air', 'Vueling',
  'Turkish Airlines', 'Lufthansa', 'KLM', 'Air France', 'Swiss', 'Austrian',
  'British Airways', 'Iberia', 'Emirates', 'flydubai', 'Air Arabia',
  'LOT', 'Pegasus', 'SunExpress', 'Aegean', 'Corendon',
];

const expandAnim = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

function Field({ label, children, error }) {
  return (
    <div className="add-deal-form__field">
      {label && <label className="add-deal-form__label">{label}</label>}
      {children}
      {error && <span className="add-deal-form__field-error">{error}</span>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="deal-section-card">
      <div className="deal-section-card__header">
        <span className="icon-draw icon-draw--once deal-section-card__icon"><Icon size={18} strokeWidth={1.8} /></span>
        <span className="deal-section-card__title">{title}</span>
      </div>
      <div className="deal-section-card__body">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="deal-toggle">
      <div className={`deal-toggle__track${checked ? ' deal-toggle__track--on' : ''}`} onClick={() => onChange(!checked)}>
        <div className="deal-toggle__thumb" />
      </div>
      <span className="deal-toggle__label">{label}</span>
    </label>
  );
}

export function AddDealForm({ onSuccess, onCancel }) {
  const { token } = useAgentAuth();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [media, setMedia] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const [form, setForm] = useState({
    departure_date: '', return_date: '', price: '', currency: 'ILS',
    purchase_link: '', whatsapp_override: '', is_exclusive: false,
    expires_at: '', description: '',
    // flight
    airline: '', includes_checked_baggage: false, includes_cabin_baggage: true, includes_meal: false,
    // hotel
    hotel_name: '', hotel_stars: '', hotel_breakfast: false,
    // car
    car_type: '', car_company: '',
  });
  const [includeHotel, setIncludeHotel] = useState(false);
  const [includeCar, setIncludeCar] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const filtered = DESTINATIONS.filter(d =>
    !query || d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.iata.toLowerCase().includes(query.toLowerCase()) ||
    d.country.toLowerCase().includes(query.toLowerCase())
  );

  async function selectDest(dest) {
    setSelectedDest(dest);
    setQuery(`${dest.name}, ${dest.country}`);
    setShowDropdown(false);
    setErrors(e => ({ ...e, destination: undefined }));
    setLoadingMedia(true);
    setMedia(null);
    try {
      const m = await agentApi.getMedia(token, dest.iata);
      setMedia(m);
    } catch { setMedia(null); }
    finally { setLoadingMedia(false); }
  }

  async function replaceMedia() {
    if (!selectedDest) return;
    setLoadingMedia(true);
    try { const m = await agentApi.getMedia(token, selectedDest.iata); setMedia(m); }
    finally { setLoadingMedia(false); }
  }

  function set(key) {
    return (e) => {
      const val = e && e.target ? e.target.value : e;
      setForm(f => ({ ...f, [key]: val }));
      setErrors(errs => ({ ...errs, [key]: undefined }));
    };
  }
  function setBool(key) {
    return (val) => setForm(f => ({ ...f, [key]: val }));
  }

  function validate() {
    const errs = {};
    if (!selectedDest) errs.destination = t.requiredField || 'Required — select from dropdown';
    if (!form.departure_date) errs.departure_date = t.requiredField || 'Required';
    if (!form.price || Number(form.price) <= 0) errs.price = t.requiredField || 'Required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setApiError(null);
    try {
      await agentApi.createDeal(token, {
        destination: selectedDest.iata,
        destination_name: selectedDest.name,
        country: selectedDest.country,
        video_url: media?.video_url || null,
        photo_url: media?.photo_url || null,
        ...form,
        price: Number(form.price),
        is_exclusive: form.is_exclusive ? 1 : 0,
        includes_checked_baggage: form.includes_checked_baggage ? 1 : 0,
        includes_cabin_baggage: form.includes_cabin_baggage ? 1 : 0,
        includes_meal: form.includes_meal ? 1 : 0,
        hotel_name: includeHotel ? form.hotel_name || null : null,
        hotel_stars: includeHotel ? (form.hotel_stars ? Number(form.hotel_stars) : null) : null,
        hotel_breakfast: includeHotel ? (form.hotel_breakfast ? 1 : 0) : 0,
        car_type: includeCar ? form.car_type || null : null,
        car_company: includeCar ? form.car_company || null : null,
      });
      onSuccess?.();
    } catch (err) {
      setApiError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form className="add-deal-form add-deal-form--wide" onSubmit={handleSubmit} noValidate>
      <h3 className="add-deal-form__title">
        <span className="icon-draw icon-draw--once"><Package size={18} strokeWidth={1.8} /></span>
        {t.addDealTitle || 'Add new deal'}
      </h3>

      {/* ── Destination + media ──────────────────────────────────────────── */}
      <div className="add-deal-form__dest-row">
        <Field label={`${t.destinationLabel || 'Destination'} *`} error={errors.destination}>
          <div className="add-deal-form__dest-wrap">
            <Search size={16} className="add-deal-form__dest-icon" />
            <input
              className={`add-deal-form__input add-deal-form__input--dest${errors.destination ? ' add-deal-form__input--error' : ''}`}
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); setSelectedDest(null); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder={t.destinationSearchPlaceholder || 'Type city or IATA code…'}
              autoComplete="off"
            />
          </div>
          {showDropdown && filtered.length > 0 && (
            <ul className="add-deal-form__dest-dropdown">
              {filtered.slice(0, 8).map(d => (
                <li key={d.iata} className="add-deal-form__dest-option" onMouseDown={() => selectDest(d)}>
                  <span className="add-deal-form__dest-iata">{d.iata}</span> {d.name}, {d.country}
                </li>
              ))}
            </ul>
          )}
        </Field>

        {(loadingMedia || media) && (
          <div className="add-deal-form__media-preview">
            {loadingMedia && <div className="add-deal-form__media-loading">Loading…</div>}
            {!loadingMedia && media?.photo_url && (
              <>
                <img src={media.photo_url} alt={selectedDest?.name} className="add-deal-form__media-img" />
                <button type="button" className="add-deal-form__media-replace" onClick={replaceMedia}>
                  <RefreshCw size={13} /> {t.replaceMediaButton || 'Replace'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Price + dates ────────────────────────────────────────────────── */}
      <div className="add-deal-form__grid-3">
        <Field label={`${t.priceLabel || 'Price'} *`} error={errors.price}>
          <input className={`add-deal-form__input${errors.price ? ' add-deal-form__input--error' : ''}`}
            type="number" min="1" step="1" value={form.price} onChange={set('price')}
            placeholder="1299" inputMode="numeric" />
        </Field>
        <Field label={t.currencyLabel || 'Currency'}>
          <select className="add-deal-form__input" value={form.currency} onChange={set('currency')}>
            <option value="ILS">ILS ₪</option>
            <option value="USD">USD $</option>
            <option value="EUR">EUR €</option>
            <option value="GBP">GBP £</option>
          </select>
        </Field>
        <Field label={t.expiresAtLabel || 'Deal expires (optional)'}>
          <input className="add-deal-form__input" type="date" value={form.expires_at} onChange={set('expires_at')} />
        </Field>
        <Field label={`${t.departureDateLabel || 'Departure'} *`} error={errors.departure_date}>
          <input className={`add-deal-form__input${errors.departure_date ? ' add-deal-form__input--error' : ''}`}
            type="date" value={form.departure_date} onChange={set('departure_date')} />
        </Field>
        <Field label={t.returnDateLabel || 'Return (optional)'}>
          <input className="add-deal-form__input" type="date" value={form.return_date} onChange={set('return_date')} />
        </Field>
        <Field label={t.purchaseLinkLabel || 'Purchase link'}>
          <input className="add-deal-form__input" type="url" value={form.purchase_link}
            onChange={set('purchase_link')} placeholder="https://…" />
        </Field>
      </div>

      {/* ── Flight section ───────────────────────────────────────────────── */}
      <SectionCard icon={Plane} title={t.flightSectionTitle || 'Flight details'}>
        <div className="add-deal-form__grid-2">
          <Field label={t.airlineLabel || 'Airline'}>
            <select className="add-deal-form__input" value={form.airline} onChange={set('airline')}>
              <option value="">{t.selectAirline || 'Select airline…'}</option>
              {AIRLINES.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="other">{t.otherAirline || 'Other'}</option>
            </select>
          </Field>
          <Field label={t.whatsappOverrideLabel || 'WhatsApp (override)'}>
            <input className="add-deal-form__input" type="tel" value={form.whatsapp_override}
              onChange={set('whatsapp_override')} placeholder="+972501234567" />
          </Field>
        </div>
        <div className="add-deal-form__checkboxes">
          <label className="deal-checkbox">
            <input type="checkbox" checked={form.includes_cabin_baggage} onChange={e => setBool('includes_cabin_baggage')(e.target.checked)} />
            {t.cabinBaggageLabel || '✓ Cabin bag included'}
          </label>
          <label className="deal-checkbox">
            <input type="checkbox" checked={form.includes_checked_baggage} onChange={e => setBool('includes_checked_baggage')(e.target.checked)} />
            {t.checkedBaggageLabel || '✓ Checked baggage'}
          </label>
          <label className="deal-checkbox">
            <input type="checkbox" checked={form.includes_meal} onChange={e => setBool('includes_meal')(e.target.checked)} />
            {t.mealLabel || '✓ Meal included'}
          </label>
          <label className="deal-checkbox">
            <input type="checkbox" checked={form.is_exclusive} onChange={e => setBool('is_exclusive')(e.target.checked)} />
            {t.exclusiveDealLabel || '🔥 Exclusive deal'}
          </label>
        </div>
      </SectionCard>

      {/* ── Hotel section ────────────────────────────────────────────────── */}
      <SectionCard icon={Hotel} title={t.hotelSectionTitle || 'Hotel'}>
        <Toggle checked={includeHotel} onChange={setIncludeHotel} label={t.includeHotelToggle || 'Package includes hotel'} />
        <AnimatePresence>
          {includeHotel && (
            <motion.div {...expandAnim} className="add-deal-form__expand">
              <div className="add-deal-form__grid-2">
                <Field label={t.hotelNameLabel || 'Hotel name'}>
                  <input className="add-deal-form__input" type="text" value={form.hotel_name}
                    onChange={set('hotel_name')} placeholder="e.g. Hilton Garden Inn" />
                </Field>
                <Field label={t.hotelStarsLabel || 'Stars'}>
                  <select className="add-deal-form__input" value={form.hotel_stars} onChange={set('hotel_stars')}>
                    <option value="">—</option>
                    {[3,4,5].map(s => <option key={s} value={s}>{s} ★</option>)}
                  </select>
                </Field>
              </div>
              <label className="deal-checkbox">
                <input type="checkbox" checked={form.hotel_breakfast} onChange={e => setBool('hotel_breakfast')(e.target.checked)} />
                {t.hotelBreakfastLabel || '☕ Breakfast included'}
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* ── Car rental section ───────────────────────────────────────────── */}
      <SectionCard icon={Car} title={t.carSectionTitle || 'Car rental'}>
        <Toggle checked={includeCar} onChange={setIncludeCar} label={t.includeCarToggle || 'Package includes car rental'} />
        <AnimatePresence>
          {includeCar && (
            <motion.div {...expandAnim} className="add-deal-form__expand">
              <div className="add-deal-form__grid-2">
                <Field label={t.carTypeLabel || 'Car type'}>
                  <select className="add-deal-form__input" value={form.car_type} onChange={set('car_type')}>
                    <option value="">{t.selectCarType || 'Select…'}</option>
                    <option value="compact">{t.carCompact || 'Compact'}</option>
                    <option value="family">{t.carFamily || 'Family'}</option>
                    <option value="suv">{t.carSuv || 'SUV'}</option>
                    <option value="luxury">{t.carLuxury || 'Luxury'}</option>
                    <option value="other">{t.carOther || 'Other'}</option>
                  </select>
                </Field>
                <Field label={t.carCompanyLabel || 'Rental company'}>
                  <input className="add-deal-form__input" type="text" value={form.car_company}
                    onChange={set('car_company')} placeholder="e.g. Hertz, Avis…" />
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* ── Description ─────────────────────────────────────────────────── */}
      <Field label={t.dealDescriptionLabel || 'Description (optional)'}>
        <textarea className="add-deal-form__input add-deal-form__input--textarea"
          rows={2} value={form.description} onChange={set('description')} />
      </Field>

      {apiError && <p className="add-deal-form__error">{apiError}</p>}

      <div className="add-deal-form__actions">
        <button type="button" className="add-deal-form__btn add-deal-form__btn--ghost" onClick={onCancel}>
          {t.cancelButton || 'Cancel'}
        </button>
        <motion.button type="submit" className="add-deal-form__btn add-deal-form__btn--primary"
          disabled={submitting} whileTap={{ scale: 0.97 }}>
          {submitting ? (t.submittingLabel || 'Submitting…') : (t.submitDealButton || 'Submit for review')}
        </motion.button>
      </div>
    </form>
  );
}
