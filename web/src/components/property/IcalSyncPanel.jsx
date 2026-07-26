import { useEffect, useState } from 'react';
import { RefreshCw, Copy, Check, Link2 } from 'lucide-react';
import { propertyApi, icalFeedUrl } from '../../api/client.js';

/** IcalSyncPanel — 11.13: export this unit's blocked dates as a subscribable calendar link
 * (paste into Airbnb/Booking/Google Calendar), and/or import an external calendar link so its
 * busy dates flow into our own availability table (which is also what feeds the "עודכן לפני X"
 * freshness badge — see icalSyncService.js). Operates on the property's first unit — same
 * "single-unit complex stays invisible" assumption AvailabilityCalendar above it already makes. */
export function IcalSyncPanel({ propertyId, token }) {
  const [unitId, setUnitId] = useState(null);
  const [exportToken, setExportToken] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    propertyApi.getOneMine(token, propertyId)
      .then(({ property }) => {
        const unit = property.units?.[0];
        if (unit) {
          setUnitId(unit.id);
          setExportToken(unit.ical_export_token || null);
          setImportUrl(unit.ical_import_url || '');
        }
      })
      .finally(() => setLoading(false));
  }, [propertyId, token]);

  async function handleGenerateToken() {
    const { token: newToken } = await propertyApi.generateIcalExportToken(token, propertyId, unitId);
    setExportToken(newToken);
  }

  function copyFeedUrl() {
    navigator.clipboard?.writeText(icalFeedUrl(exportToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveImportUrl() {
    await propertyApi.setIcalImportUrl(token, propertyId, unitId, importUrl.trim());
  }

  async function handleSyncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await propertyApi.syncIcalImport(token, propertyId, unitId);
      setSyncResult(result);
    } catch (err) {
      setSyncResult({ ok: false, reason: err.message });
    } finally {
      setSyncing(false);
    }
  }

  if (loading || !unitId) return null;

  return (
    <div className="settings-card" dir="rtl" style={{ maxWidth: 420, marginTop: 16 }}>
      <h3 className="settings-card__title" style={{ fontSize: '1rem', margin: '0 0 10px' }}><Link2 size={16} /> סנכרון יומן (iCal)</h3>

      <p style={{ fontSize: '0.8rem', color: 'var(--ds-ash)', margin: '0 0 6px' }}>ייצוא — קישור למינוי יומן חיצוני (Airbnb, Booking, Google Calendar):</p>
      {exportToken ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="text" className="agent-form__input" readOnly value={icalFeedUrl(exportToken)} onFocus={(e) => e.target.select()} style={{ fontSize: '0.75rem' }} />
          <button type="button" className="dash-quick-pill" onClick={copyFeedUrl}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
        </div>
      ) : (
        <button type="button" className="dash-quick-pill dash-quick-pill--primary" onClick={handleGenerateToken}>צור קישור ייצוא</button>
      )}

      <p style={{ fontSize: '0.8rem', color: 'var(--ds-ash)', margin: '14px 0 6px' }}>ייבוא — קישור יומן חיצוני שממנו נמשוך תאריכים תפוסים:</p>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          className="agent-form__input"
          placeholder="https://…/calendar.ics"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          onBlur={handleSaveImportUrl}
          style={{ fontSize: '0.75rem' }}
        />
        <button type="button" className="dash-quick-pill" disabled={!importUrl.trim() || syncing} onClick={handleSyncNow} title="סנכרן עכשיו">
          <RefreshCw size={15} className={syncing ? 'icon-spin' : ''} />
        </button>
      </div>
      {syncResult && (
        <p style={{ fontSize: '0.75rem', marginTop: 6, color: syncResult.ok ? 'var(--ds-olive)' : 'var(--ds-wine)' }}>
          {syncResult.ok ? `סונכרן — ${syncResult.blockedCount} תאריכים תפוסים נטענו.` : 'הסנכרון נכשל — בדקו שהקישור תקין ונגיש.'}
        </p>
      )}
    </div>
  );
}
