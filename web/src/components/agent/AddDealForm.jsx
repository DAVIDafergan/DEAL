import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, CheckCircle } from 'lucide-react';
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
];

export function AddDealForm({ onSuccess, onCancel }) {
  const { token } = useAgentAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [media, setMedia] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [form, setForm] = useState({
    departure_date: '', return_date: '', price: '', currency: 'USD',
    purchase_link: '', whatsapp_override: '', is_exclusive: false,
    expires_at: '', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const filtered = DESTINATIONS.filter(d =>
    !query || d.name.toLowerCase().includes(query.toLowerCase()) || d.iata.toLowerCase().includes(query.toLowerCase()) || d.country.toLowerCase().includes(query.toLowerCase())
  );

  async function selectDest(dest) {
    setSelectedDest(dest);
    setQuery(dest.name);
    setShowDropdown(false);
    setLoadingMedia(true);
    setMedia(null);
    try {
      const m = await agentApi.getMedia(token, dest.iata);
      setMedia(m);
    } catch {
      setMedia(null);
    } finally {
      setLoadingMedia(false);
    }
  }

  async function replaceMedia() {
    if (!selectedDest) return;
    setLoadingMedia(true);
    try {
      const m = await agentApi.getMedia(token, selectedDest.iata);
      setMedia(m);
    } finally {
      setLoadingMedia(false);
    }
  }

  function set(key) { return (e) => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedDest || !form.departure_date || !form.price) {
      setError('Destination, departure date, and price are required');
      return;
    }
    setSubmitting(true);
    setError(null);
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
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form className="add-deal-form" onSubmit={handleSubmit}>
      <h3 className="add-deal-form__title">{t.addDealTitle || 'Add new deal'}</h3>

      {/* Destination */}
      <div className="add-deal-form__field">
        <label className="add-deal-form__label">{t.destinationLabel || 'Destination'} <span className="add-deal-form__required">*</span></label>
        <div className="add-deal-form__dest-wrap">
          <Search size={16} className="add-deal-form__dest-icon" />
          <input
            className="add-deal-form__input add-deal-form__input--dest"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); setSelectedDest(null); }}
            onFocus={() => setShowDropdown(true)}
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
      </div>

      {/* Media preview */}
      {(loadingMedia || media) && (
        <div className="add-deal-form__media-preview">
          {loadingMedia && <div className="add-deal-form__media-loading">Loading media…</div>}
          {!loadingMedia && media?.photo_url && (
            <>
              <img src={media.photo_url} alt={selectedDest?.name} className="add-deal-form__media-img" />
              <button type="button" className="add-deal-form__media-replace" onClick={replaceMedia}>
                <RefreshCw size={14} /> {t.replaceMediaButton || 'Replace'}
              </button>
            </>
          )}
          {!loadingMedia && !media?.photo_url && <p className="add-deal-form__media-none">No media found for this destination</p>}
        </div>
      )}

      {/* Dates */}
      <div className="add-deal-form__row">
        <div className="add-deal-form__field">
          <label className="add-deal-form__label">{t.departureDateLabel || 'Departure'} <span className="add-deal-form__required">*</span></label>
          <input className="add-deal-form__input" type="date" value={form.departure_date} onChange={set('departure_date')} required />
        </div>
        <div className="add-deal-form__field">
          <label className="add-deal-form__label">{t.returnDateLabel || 'Return (optional)'}</label>
          <input className="add-deal-form__input" type="date" value={form.return_date} onChange={set('return_date')} />
        </div>
      </div>

      {/* Price */}
      <div className="add-deal-form__row">
        <div className="add-deal-form__field">
          <label className="add-deal-form__label">{t.priceLabel || 'Price'} <span className="add-deal-form__required">*</span></label>
          <input className="add-deal-form__input" type="number" min="0" step="1" value={form.price} onChange={set('price')} placeholder="299" inputMode="numeric" required />
        </div>
        <div className="add-deal-form__field">
          <label className="add-deal-form__label">{t.currencyLabel || 'Currency'}</label>
          <select className="add-deal-form__input" value={form.currency} onChange={set('currency')}>
            <option value="USD">USD $</option>
            <option value="ILS">ILS ₪</option>
            <option value="EUR">EUR €</option>
            <option value="GBP">GBP £</option>
          </select>
        </div>
      </div>

      {/* Links */}
      <div className="add-deal-form__field">
        <label className="add-deal-form__label">{t.purchaseLinkLabel || 'Purchase link'}</label>
        <input className="add-deal-form__input" type="url" value={form.purchase_link} onChange={set('purchase_link')} placeholder="https://…" />
      </div>

      <div className="add-deal-form__field">
        <label className="add-deal-form__label">{t.whatsappOverrideLabel || 'WhatsApp for this deal (override)'}</label>
        <input className="add-deal-form__input" type="tel" inputMode="tel" value={form.whatsapp_override} onChange={set('whatsapp_override')} placeholder="+972501234567" />
      </div>

      {/* Description */}
      <div className="add-deal-form__field">
        <label className="add-deal-form__label">{t.dealDescriptionLabel || 'Description'}</label>
        <textarea className="add-deal-form__input add-deal-form__input--textarea" rows={3} value={form.description} onChange={set('description')} />
      </div>

      {/* Options row */}
      <div className="add-deal-form__row add-deal-form__row--inline">
        <div className="add-deal-form__field">
          <label className="add-deal-form__label">{t.expiresAtLabel || 'Deal expires'}</label>
          <input className="add-deal-form__input" type="date" value={form.expires_at} onChange={set('expires_at')} />
        </div>
        <label className="add-deal-form__checkbox-label">
          <input type="checkbox" checked={form.is_exclusive} onChange={e => setForm(f => ({ ...f, is_exclusive: e.target.checked }))} />
          {t.exclusiveDealLabel || 'Exclusive deal'}
        </label>
      </div>

      {error && <p className="add-deal-form__error">{error}</p>}

      <div className="add-deal-form__actions">
        <button type="button" className="add-deal-form__btn add-deal-form__btn--ghost" onClick={onCancel}>{t.cancelButton || 'Cancel'}</button>
        <motion.button
          type="submit"
          className="add-deal-form__btn add-deal-form__btn--primary"
          disabled={submitting}
          whileTap={{ scale: 0.97 }}
        >
          {submitting ? (t.submittingLabel || 'Submitting…') : (t.submitDealButton || 'Submit for review')}
        </motion.button>
      </div>
    </form>
  );
}
