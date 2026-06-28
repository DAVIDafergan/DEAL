import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱 +972' },
  { code: '+1',   label: '🇺🇸 +1' },
  { code: '+44',  label: '🇬🇧 +44' },
  { code: '+49',  label: '🇩🇪 +49' },
  { code: '+33',  label: '🇫🇷 +33' },
  { code: '+39',  label: '🇮🇹 +39' },
  { code: '+34',  label: '🇪🇸 +34' },
];

const CURRENCIES = [
  { value: 'ILS', label: '₪ שקל (ILS)' },
  { value: 'USD', label: '$ דולר אמריקאי (USD)' },
  { value: 'EUR', label: '€ יורו (EUR)' },
  { value: 'GBP', label: '£ פאונד בריטי (GBP)' },
];

function SettingsField({ label, name, type = 'text', inputMode, placeholder, value, onChange }) {
  return (
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={`sf-${name}`}>{label}</label>
      <input
        id={`sf-${name}`}
        className="settings-field__input"
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function SettingsTextarea({ label, name, rows = 4, placeholder, value, onChange }) {
  return (
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={`sf-${name}`}>{label}</label>
      <textarea
        id={`sf-${name}`}
        className="settings-field__input settings-field__input--textarea"
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

const EMPTY_FORM = {
  business_name: '',
  contact_name: '',
  logo_url: '',
  description: '',
  response_hours: '',
  phone: '',
  whatsapp_country_code: '+972',
  whatsapp_number: '',
  preferred_currency: 'USD',
  whatsapp_template: '',
};

export function AgentSettingsPage() {
  const { token, agent, loading, refreshAgent } = useAgentAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState(null); // 'success' | 'error' | null
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!loading && !token) navigate('/agent/login', { replace: true });
  }, [loading, token, navigate]);

  // Sync local form state when agent data loads
  useEffect(() => {
    if (agent) {
      setForm({
        business_name: agent.business_name || '',
        contact_name: agent.contact_name || '',
        logo_url: agent.logo_url || '',
        description: agent.description || '',
        response_hours: agent.response_hours || '',
        phone: agent.phone || '',
        whatsapp_country_code: agent.whatsapp_country_code || '+972',
        whatsapp_number: agent.whatsapp_number || '',
        preferred_currency: agent.preferred_currency || 'USD',
        whatsapp_template: agent.whatsapp_template || '',
      });
    }
  }, [agent]);

  function set(key) {
    return e => setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveState(null);
    setSaveError('');
    try {
      await agentApi.updateMe(token, form);
      await refreshAgent();
      setSaveState('success');
      setTimeout(() => setSaveState(null), 3500);
    } catch (err) {
      setSaveError(err.message || 'שגיאה בשמירה, נסה שנית');
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !agent) {
    return <div className="settings-page settings-page--loading">טוען…</div>;
  }

  return (
    <div className="settings-page" dir="rtl">
      <div className="settings-page__header">
        <Link to="/agent/dashboard" className="settings-page__back">
          <ArrowLeft size={16} /> {t.dashboardLink || 'דשבורד'}
        </Link>
        <h1 className="settings-page__title">{t.settingsTitle || 'הגדרות חשבון'}</h1>
      </div>

      <form onSubmit={handleSave} noValidate>
        <div className="settings-page__grid">
          {/* Business info */}
          <section className="settings-card">
            <h2 className="settings-card__title">{t.businessDetailsTitle || 'פרטי עסק'}</h2>
            <SettingsField label={t.agencyNameLabel || 'שם הסוכנות'} name="business_name"
              value={form.business_name} onChange={set('business_name')} />
            <SettingsField label={t.contactNameLabel || 'שם איש קשר'} name="contact_name"
              value={form.contact_name} onChange={set('contact_name')} />
            <SettingsField label={t.logoUrlLabel || 'URL לוגו'} name="logo_url"
              value={form.logo_url} onChange={set('logo_url')} placeholder="https://…" />
          </section>

          {/* About / Bio */}
          <section className="settings-card">
            <h2 className="settings-card__title">{t.aboutTitle || 'אודות / ביו'}</h2>
            <SettingsTextarea
              label={t.agencyDescriptionLabel || 'תיאור קצר על הסוכנות'}
              name="description" rows={5} value={form.description} onChange={set('description')}
              placeholder={t.agencyDescriptionPlaceholder || 'ספר לנוסעים על הסוכנות, ההתמחויות ויעדי החלום שלך…'}
            />
            <SettingsField label={t.responseHoursLabel || 'שעות מענה'} name="response_hours"
              value={form.response_hours} onChange={set('response_hours')}
              placeholder={t.responseHoursPlaceholder || 'א׳–ה׳ 9:00–18:00'} />
          </section>

          {/* Contact / WhatsApp */}
          <section className="settings-card">
            <h2 className="settings-card__title">{t.contactTitle || 'יצירת קשר'}</h2>
            <SettingsField label={t.phoneLabel || 'טלפון'} name="phone"
              type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
            <div className="settings-field">
              <label className="settings-field__label">{t.whatsappLabel || 'WhatsApp'}</label>
              <div className="settings-field__wa-row">
                <select className="settings-field__country-code" value={form.whatsapp_country_code} onChange={set('whatsapp_country_code')}>
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  className="settings-field__input"
                  type="tel" inputMode="tel"
                  value={form.whatsapp_number}
                  onChange={set('whatsapp_number')}
                  placeholder="501234567"
                />
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-field__label">מטבע מועדף</label>
              <select className="settings-field__input settings-field__select" value={form.preferred_currency} onChange={set('preferred_currency')}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </section>

          {/* WhatsApp template */}
          <section className="settings-card">
            <h2 className="settings-card__title">{t.whatsappTemplateTitle || 'תבנית WhatsApp'}</h2>
            <SettingsTextarea
              label={t.whatsappTemplateLabel || 'הודעת WhatsApp אוטומטית'}
              name="whatsapp_template" rows={4} value={form.whatsapp_template} onChange={set('whatsapp_template')}
              placeholder={t.whatsappTemplatePlaceholder || 'שלום, ראיתי את הדיל שלכם ל-{destination} ({dates}) ואני מתעניין!'}
            />
            <p className="settings-card__note">
              משתנים זמינים: <code>{'{destination}'}</code> · <code>{'{dates}'}</code>
            </p>
          </section>
        </div>

        {/* ── Prominent Save Button ── */}
        <div className="settings-save-bar">
          <AnimatePresence mode="wait">
            {saveState === 'success' && (
              <motion.p
                key="ok"
                className="settings-save-bar__msg settings-save-bar__msg--ok"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle size={15} /> ההגדרות נשמרו בהצלחה
              </motion.p>
            )}
            {saveState === 'error' && (
              <motion.p
                key="err"
                className="settings-save-bar__msg settings-save-bar__msg--err"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {saveError}
              </motion.p>
            )}
          </AnimatePresence>
          <motion.button
            type="submit"
            className="settings-save-btn"
            disabled={saving}
            whileTap={{ scale: 0.97 }}
          >
            {saving ? (
              <span className="settings-save-btn__spinner" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'שומר…' : 'שמור הגדרות'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
