import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi } from '../api/client.js';

const COUNTRY_CODES = [
  { code: '+972', label: '🇮🇱 +972' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
];

function SettingsField({ label, name, type = 'text', inputMode, placeholder, value, onChange }) {
  return (
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={`osf-${name}`}>{label}</label>
      <input id={`osf-${name}`} className="settings-field__input" type={type} inputMode={inputMode} value={value} onChange={onChange} placeholder={placeholder} />
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
  business_name: '', contact_name: '', logo_url: '', description: '', response_hours: '',
  phone: '', whatsapp_country_code: '+972', whatsapp_number: '',
};

/** OwnerSettingsPage — same settings-* shell as AgentSettingsPage; owner data lives in the same agents table. */
export function OwnerSettingsPage() {
  const { token, agent, loading, refreshAgent } = useAgentAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!loading && !token) navigate('/owner/login', { replace: true });
  }, [loading, token, navigate]);

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
      });
    }
  }, [agent]);

  function set(key) { return (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })); }

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
        <Link to="/owner/dashboard" className="settings-page__back">
          <ArrowLeft size={16} /> דשבורד
        </Link>
        <h1 className="settings-page__title">הגדרות חשבון</h1>
      </div>

      <form onSubmit={handleSave} noValidate>
        <div className="settings-page__grid">
          <section className="settings-card">
            <h2 className="settings-card__title">פרטי העסק</h2>
            <SettingsField label="שם הצימר / הווילה" name="business_name" value={form.business_name} onChange={set('business_name')} />
            <SettingsField label="שם איש קשר" name="contact_name" value={form.contact_name} onChange={set('contact_name')} />
            <SettingsField label="URL לוגו / תמונת פרופיל" name="logo_url" value={form.logo_url} onChange={set('logo_url')} placeholder="https://…" />
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
        </div>

        <div className="settings-save-bar">
          <AnimatePresence mode="wait">
            {saveState === 'success' && (
              <motion.p key="ok" className="settings-save-bar__msg settings-save-bar__msg--ok" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CheckCircle size={15} /> ההגדרות נשמרו בהצלחה
              </motion.p>
            )}
            {saveState === 'error' && (
              <motion.p key="err" className="settings-save-bar__msg settings-save-bar__msg--err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {saveError}
              </motion.p>
            )}
          </AnimatePresence>
          <motion.button type="submit" className="settings-save-btn" disabled={saving} whileTap={{ scale: 0.97 }}>
            {saving ? <span className="settings-save-btn__spinner" /> : <Save size={16} />}
            {saving ? 'שומר…' : 'שמור הגדרות'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
