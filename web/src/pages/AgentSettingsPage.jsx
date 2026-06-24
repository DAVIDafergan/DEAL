import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
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

function AutosaveField({ label, fieldKey, value, onSave, type = 'text', inputMode, placeholder }) {
  const [local, setLocal] = useState(value || '');
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => { setLocal(value || ''); }, [value]);

  function handleChange(e) {
    const v = e.target.value;
    setLocal(v);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await onSave(fieldKey, v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  }

  return (
    <div className="settings-field">
      <label className="settings-field__label">{label}</label>
      <div className="settings-field__input-wrap">
        <input className="settings-field__input" type={type} inputMode={inputMode} value={local} onChange={handleChange} placeholder={placeholder} />
        {saved && <Check size={14} className="settings-field__saved-icon" />}
      </div>
    </div>
  );
}

function AutosaveTextarea({ label, fieldKey, value, onSave, rows = 3, placeholder }) {
  const [local, setLocal] = useState(value || '');
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => { setLocal(value || ''); }, [value]);

  function handleChange(e) {
    const v = e.target.value;
    setLocal(v);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await onSave(fieldKey, v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  }

  return (
    <div className="settings-field">
      <label className="settings-field__label">{label}</label>
      <div className="settings-field__input-wrap">
        <textarea className="settings-field__input settings-field__input--textarea" rows={rows} value={local} onChange={handleChange} placeholder={placeholder} />
        {saved && <Check size={14} className="settings-field__saved-icon" />}
      </div>
    </div>
  );
}

export function AgentSettingsPage() {
  const { token, agent, loading, refreshAgent } = useAgentAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && !token) navigate('/agent/login', { replace: true });
  }, [loading, token, navigate]);

  async function saveField(key, value) {
    if (!token) return;
    try {
      await agentApi.updateMe(token, { [key]: value });
      await refreshAgent();
    } catch (err) {
      console.error('Save failed:', err.message);
    }
  }

  if (loading || !agent) return <div className="settings-page settings-page--loading">Loading…</div>;

  return (
    <div className="settings-page" dir="rtl">
      <div className="settings-page__header">
        <Link to="/agent/dashboard" className="settings-page__back">
          <ArrowLeft size={16} /> {t.dashboardLink || 'דשבורד'}
        </Link>
        <h1 className="settings-page__title">{t.settingsTitle || 'הגדרות חשבון'}</h1>
      </div>

      <div className="settings-page__grid">
        {/* Business info */}
        <section className="settings-card">
          <h2 className="settings-card__title">{t.businessDetailsTitle || 'פרטי עסק'}</h2>
          <AutosaveField
            label={t.agencyNameLabel || 'שם הסוכנות'}
            fieldKey="business_name" value={agent.business_name} onSave={saveField}
          />
          <AutosaveField
            label={t.contactNameLabel || 'שם איש קשר'}
            fieldKey="contact_name" value={agent.contact_name} onSave={saveField}
          />
          <AutosaveField
            label={t.licenseNumberLabel || 'מספר רישיון'}
            fieldKey="license_number" value={agent.license_number} onSave={saveField} placeholder="אופציונלי"
          />
          <AutosaveField
            label={t.logoUrlLabel || 'URL לוגו'}
            fieldKey="logo_url" value={agent.logo_url} onSave={saveField} placeholder="https://…"
          />
        </section>

        {/* About / Bio */}
        <section className="settings-card">
          <h2 className="settings-card__title">{t.aboutTitle || 'אודות / ביו'}</h2>
          <AutosaveTextarea
            label={t.agencyDescriptionLabel || 'תיאור קצר על הסוכנות'}
            fieldKey="description" value={agent.description} onSave={saveField}
            rows={5}
            placeholder={t.agencyDescriptionPlaceholder || 'ספר לנוסעים על הסוכנות, ההתמחויות ויעדי החלום שלך…'}
          />
          <AutosaveField
            label={t.responseHoursLabel || 'שעות מענה'}
            fieldKey="response_hours" value={agent.response_hours} onSave={saveField}
            placeholder={t.responseHoursPlaceholder || 'א׳–ה׳ 9:00–18:00'}
          />
        </section>

        {/* Contact / WhatsApp */}
        <section className="settings-card">
          <h2 className="settings-card__title">{t.contactTitle || 'יצירת קשר'}</h2>
          <AutosaveField
            label={t.phoneLabel || 'טלפון'}
            fieldKey="phone" value={agent.phone} onSave={saveField} type="tel" inputMode="tel"
          />
          <div className="settings-field">
            <label className="settings-field__label">{t.whatsappLabel || 'WhatsApp'}</label>
            <div className="settings-field__wa-row">
              <select className="settings-field__country-code">
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                className="settings-field__input"
                type="tel" inputMode="tel"
                defaultValue={agent.whatsapp_number || ''}
                onBlur={async e => { await saveField('whatsapp_number', e.target.value); await refreshAgent(); }}
                placeholder="501234567"
              />
            </div>
          </div>
          <AutosaveField
            label={t.preferredCurrencyLabel || 'מטבע מועדף'}
            fieldKey="preferred_currency" value={agent.preferred_currency || 'USD'} onSave={saveField}
          />
        </section>

        {/* WhatsApp template */}
        <section className="settings-card">
          <h2 className="settings-card__title">{t.whatsappTemplateTitle || 'תבנית WhatsApp'}</h2>
          <AutosaveTextarea
            label={t.whatsappTemplateLabel || 'הודעת WhatsApp אוטומטית'}
            fieldKey="whatsapp_template"
            value={agent.whatsapp_template}
            onSave={saveField}
            placeholder={t.whatsappTemplatePlaceholder || 'שלום, ראיתי את הדיל שלכם ל-{destination} ({dates}) ואני מתעניין!'}
            rows={4}
          />
          <p className="settings-card__note">
            משתנים זמינים: <code>{'{destination}'}</code> · <code>{'{dates}'}</code>
          </p>
        </section>
      </div>
    </div>
  );
}
