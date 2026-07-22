import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, KeyRound, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi } from '../api/client.js';
import { PropertyPhotoUploader } from '../components/property/PropertyPhotoUploader.jsx';
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from '../components/SocialIcons.jsx';
import { validateSocialUrl } from '../utils/socialLinks.js';

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱 +972' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
];

const SOCIAL_FIELDS = [
  { key: 'website', label: 'אתר אינטרנט', Icon: Globe },
  { key: 'facebook_url', label: 'פייסבוק', Icon: FacebookIcon },
  { key: 'instagram_url', label: 'אינסטגרם', Icon: InstagramIcon },
  { key: 'tiktok_url', label: 'טיקטוק', Icon: TikTokIcon },
  { key: 'youtube_url', label: 'יוטיוב', Icon: YouTubeIcon },
];

function SettingsField({ label, name, type = 'text', inputMode, placeholder, value, onChange, error }) {
  return (
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={`osf-${name}`}>{label}</label>
      <input id={`osf-${name}`} className={`settings-field__input${error ? ' settings-field__input--error' : ''}`} type={type} inputMode={inputMode} value={value} onChange={onChange} placeholder={placeholder} />
      {error && <p className="settings-field__error">{error}</p>}
    </div>
  );
}

function SettingsTextarea({ label, name, rows = 4, placeholder, value, onChange }) {
  return (
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={`osf-${name}`}>{label}</label>
      <textarea id={`osf-${name}`} className="settings-field__input settings-field__input--textarea" rows={rows} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

const EMPTY_FORM = {
  business_name: '', contact_name: '', email: '', logo_url: '', description: '', response_hours: '',
  phone: '', whatsapp_country_code: '+972', whatsapp_number: '',
  website: '', facebook_url: '', instagram_url: '', tiktok_url: '', youtube_url: '',
};

function PasswordCard({ token }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState(null); // 'success' | 'error' | null
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('הסיסמה החדשה חייבת להכיל לפחות 8 תווים'); setState('error'); return; }
    if (next !== confirm) { setError('הסיסמאות אינן תואמות'); setState('error'); return; }
    setSaving(true);
    setState(null);
    try {
      await agentApi.changePassword(token, current, next);
      setState('success');
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(() => setState(null), 3000);
    } catch (err) {
      setError(err.message || 'שגיאה בשינוי הסיסמה');
      setState('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-card">
      <h2 className="settings-card__title"><KeyRound size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} /> שינוי סיסמה</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SettingsField label="סיסמה נוכחית" name="current-password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <SettingsField label="סיסמה חדשה" name="new-password" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <SettingsField label="אימות סיסמה חדשה" name="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {state === 'error' && <p className="agent-form__error-msg">{error}</p>}
        {state === 'success' && <p className="agent-form__hint" style={{ color: 'var(--color-success,#22c55e)' }}><CheckCircle size={13} style={{ verticalAlign: 'middle' }} /> הסיסמה שונתה בהצלחה</p>}
        <motion.button type="submit" className="agent-form__btn agent-form__btn--primary" style={{ alignSelf: 'flex-start' }} whileTap={{ scale: 0.97 }} disabled={saving || !current || !next}>
          {saving ? 'משנה…' : 'שנה סיסמה'}
        </motion.button>
      </form>
    </section>
  );
}

/** OwnerSettingsPanel — 11.2: extracted from what used to be the standalone OwnerSettingsPage
 * route, now rendered as the dashboard's "Settings" tab (see DECISIONS.md 11.2 — the consolidated
 * dashboard requirement). Autosaves ~800ms after the last edit (7.7); password change is a
 * separate, deliberate action below, not part of the autosave. Still entirely self-contained
 * (reads its own agent/token from context), so it drops straight into a tab panel with no props. */
export function OwnerSettingsPanel() {
  const { token, agent, loading, refreshAgent } = useAgentAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveState, setSaveState] = useState(null); // 'saving' | 'saved' | 'error' | null
  const [saveError, setSaveError] = useState('');
  const [socialErrors, setSocialErrors] = useState({});
  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (agent) {
      isFirstLoad.current = true;
      setForm({
        business_name: agent.business_name || '',
        contact_name: agent.contact_name || '',
        email: agent.email || '',
        logo_url: agent.logo_url || '',
        description: agent.description || '',
        response_hours: agent.response_hours || '',
        phone: agent.phone || '',
        whatsapp_country_code: agent.whatsapp_country_code || '+972',
        whatsapp_number: agent.whatsapp_number || '',
        website: agent.website || '',
        facebook_url: agent.facebook_url || '',
        instagram_url: agent.instagram_url || '',
        tiktok_url: agent.tiktok_url || '',
        youtube_url: agent.youtube_url || '',
      });
    }
  }, [agent]);

  // Debounced autosave — skips the very first render (loading the agent's own data shouldn't
  // immediately "save" it back).
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (!token) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const errors = {};
      for (const { key } of SOCIAL_FIELDS) {
        const err = validateSocialUrl(key, form[key]);
        if (err) errors[key] = err;
      }
      setSocialErrors(errors);
      if (Object.keys(errors).length > 0) return; // don't save invalid social links

      setSaveState('saving');
      setSaveError('');
      try {
        await agentApi.updateMe(token, form);
        await refreshAgent();
        setSaveState('saved');
        setTimeout(() => setSaveState((s) => (s === 'saved' ? null : s)), 2500);
      } catch (err) {
        setSaveError(err.message || 'שגיאה בשמירה');
        setSaveState('error');
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, token]);

  function set(key) { return (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })); }

  if (loading || !agent) {
    return <div className="settings-page settings-page--loading">טוען…</div>;
  }

  return (
    <div className="settings-page settings-page--embedded" dir="rtl">
      <div className="settings-page__header settings-page__header--embedded">
        <h2 className="settings-page__title">הגדרות חשבון</h2>
        <div className="settings-save-indicator">
          <AnimatePresence mode="wait">
            {saveState === 'saving' && (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="agent-form__hint">שומר…</motion.span>
            )}
            {saveState === 'saved' && (
              <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="agent-form__hint" style={{ color: 'var(--color-success,#22c55e)' }}>
                <CheckCircle size={13} style={{ verticalAlign: 'middle' }} /> נשמר
              </motion.span>
            )}
            {saveState === 'error' && (
              <motion.span key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="agent-form__error-msg">{saveError}</motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="settings-page__grid">
        <section className="settings-card">
          <h2 className="settings-card__title">פרטי העסק</h2>
          <SettingsField label="שם הצימר / הווילה" name="business_name" value={form.business_name} onChange={set('business_name')} />
          <SettingsField label="שם איש קשר" name="contact_name" value={form.contact_name} onChange={set('contact_name')} />
          <SettingsField label="אימייל" name="email" type="email" value={form.email} onChange={set('email')} />
          <div className="settings-field">
            <label className="settings-field__label">תמונת פרופיל / לוגו</label>
            <PropertyPhotoUploader
              images={form.logo_url ? [form.logo_url] : []}
              onChange={(imgs) => setForm((prev) => ({ ...prev, logo_url: imgs[0] || '' }))}
              maxImages={1}
            />
          </div>
        </section>

        <section className="settings-card">
          <h2 className="settings-card__title">אודות</h2>
          <SettingsTextarea
            label="תיאור קצר על הנכס/העסק" name="description" rows={5} value={form.description} onChange={set('description')}
            placeholder="ספרו לאורחים על הנכס, הסביבה והחוויה…"
          />
          <SettingsField label="שעות מענה" name="response_hours" value={form.response_hours} onChange={set('response_hours')} placeholder="א׳–ה׳ 9:00–18:00" />
        </section>

        <section className="settings-card">
          <h2 className="settings-card__title">יצירת קשר</h2>
          <SettingsField label="טלפון" name="phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
          <div className="settings-field">
            <label className="settings-field__label">WhatsApp</label>
            <div className="settings-field__wa-row">
              <select className="settings-field__country-code" value={form.whatsapp_country_code} onChange={set('whatsapp_country_code')}>
                {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <input className="settings-field__input" type="tel" inputMode="tel" value={form.whatsapp_number} onChange={set('whatsapp_number')} placeholder="501234567" />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <h2 className="settings-card__title">רשתות חברתיות</h2>
          {SOCIAL_FIELDS.map(({ key, label, Icon }) => (
            <div className="settings-field" key={key}>
              <label className="settings-field__label" htmlFor={`osf-${key}`}>
                <Icon style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} /> {label}
              </label>
              <input
                id={`osf-${key}`}
                className={`settings-field__input${socialErrors[key] ? ' settings-field__input--error' : ''}`}
                type="url"
                value={form[key]}
                onChange={set(key)}
                placeholder="https://…"
              />
              {socialErrors[key] && <p className="settings-field__error">{socialErrors[key]}</p>}
            </div>
          ))}
        </section>

        <PasswordCard token={token} />
      </div>
    </div>
  );
}

/** The old standalone route (/owner/dashboard/settings) now just redirects into the
 * consolidated dashboard's Settings tab — kept so existing bookmarks/links don't break. */
export function OwnerSettingsPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/owner/dashboard?tab=settings', { replace: true }); }, [navigate]);
  return null;
}
