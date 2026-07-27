import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Eye, RefreshCw, ArrowLeft, Trash2, ChevronLeft, ChevronRight, User, LogOut, Users, LayoutDashboard, Clock, Home, Search, Bot, ShieldCheck, PlayCircle, MapPin, AlertTriangle, ImageOff, Pencil, Save, X, EyeOff } from 'lucide-react';
import { Link } from '../components/LocalizedLink.jsx';
import { adminApi } from '../api/client.js';
import { Logo } from '../components/Logo.jsx';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { regionLabel } from '../data/propertyOptions.js';

const AGENTS_PER_PAGE = 10;
const PROPERTIES_PER_PAGE = 10;
const REVIEW_QUEUE_PER_PAGE = 10;
const USERS_PER_PAGE = 10;
const CONTACT_PER_PAGE = 10;

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="adm-pagination">
      <button className="adm-pagination__btn" disabled={page === 1} onClick={() => onPage(page - 1)}><ChevronRight size={16} /></button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} className={`adm-pagination__btn${p === page ? ' is-active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button className="adm-pagination__btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}><ChevronLeft size={16} /></button>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) { setError('נדרשים שם משתמש וסיסמה'); return; }
    setLoading(true);
    setError('');
    try {
      const { token } = await adminApi.login(username, password);
      adminApi.setToken(token);
      onLogin(token);
    } catch (err) {
      setError(err.message || 'שגיאה בכניסה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-login-page" dir="rtl">
      <motion.div
        className="adm-login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="adm-login-card__logo">
          <Link to="/"><Logo size={40} /></Link>
        </div>
        <h1 className="adm-login-card__title">כניסת מנהל</h1>
        <p className="adm-login-card__sub">Dealim — Admin</p>
        <form onSubmit={handleSubmit} className="adm-login-form">
          <div className="adm-login-field">
            <label className="adm-login-label">שם משתמש</label>
            <input
              className="adm-login-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="adm-login-field">
            <label className="adm-login-label">סיסמה</label>
            <input
              className="adm-login-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="adm-login-error">{error}</p>}
          <motion.button
            type="submit"
            className="adm-login-btn"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            {loading ? 'מתחבר…' : 'כניסה לפאנל'}
          </motion.button>
        </form>

        <Link to="/" className="adm-login-back"><ArrowLeft size={14} /> חזרה לאתר</Link>
      </motion.div>
    </div>
  );
}

function ComplianceReportBlock({ report }) {
  if (!report) return null;
  return (
    <div className="adm-agent-detail" style={{ marginTop: 12 }}>
      <div className="adm-agent-detail__row"><span>תמונות שהורדו:</span> {report.imagesDownloaded} {report.imagesDownloaded === 0 ? '✓' : '⚠️'}</div>
      <div className="adm-agent-detail__row"><span>דומיינים שדולגו (robots.txt):</span> {report.domainsSkippedRobots?.length || 0}</div>
      <div className="adm-agent-detail__row"><span>דומיינים שדולגו (blocklist):</span> {report.domainsSkippedBlocklist?.length || 0}</div>
      <div className="adm-agent-detail__row">
        <span>פלטפורמות חסומות — אימות:</span>
        {' '}
        {report.hardBlockedDomainsVerified?.every((d) => d.blocked) ? '✓ כולן נחסמו' : '⚠️ בדוק ידנית'}
        {' '}({report.hardBlockedDomainsVerified?.length || 0} נבדקו)
      </div>
      <div className="adm-agent-detail__row">
        <span>בדיקת 8-מילים (העתקת תיאור):</span>
        {' '}
        {(report.descriptionOverlapChecks || []).filter((c) => c.result === 'FAIL').length > 0 ? '⚠️ נמצאה חפיפה!' : `✓ ${report.descriptionOverlapChecks?.length || 0} נבדקו, תקין`}
      </div>
      {report.llmCost && (
        <div className="adm-agent-detail__row"><span>עלות LLM (ריצה זו):</span> ${report.llmCost.costUsd} ({report.llmCost.callCount} קריאות)</div>
      )}
    </div>
  );
}

function EngineTab({ token, notify }) {
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [queryStats, setQueryStats] = useState(null);
  const pollRef = useRef(null);

  async function loadStatus() {
    try {
      const s = await adminApi.getEngineStatus(token);
      setStatus(s);
      return s;
    } catch { return null; }
  }

  async function loadRuns() {
    try { const { runs: r } = await adminApi.getEngineRuns(token); setRuns(r || []); } catch {}
  }

  async function loadQueryStats() {
    try { const { stats } = await adminApi.getEngineQueries(token); setQueryStats(stats); } catch {}
  }

  useEffect(() => {
    loadStatus();
    loadRuns();
    loadQueryStats();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function pollUntilDone(successMsg) {
    pollRef.current = setInterval(async () => {
      const s = await loadStatus();
      if (s && !s.running) {
        clearInterval(pollRef.current);
        loadRuns();
        notify(successMsg);
      }
    }, 2000);
  }

  async function handleRun() {
    setStarting(true);
    try {
      await adminApi.runEngineLive(token, null);
      notify('הריצה החלה — גילוי מ-seedSources.json וחילוץ ללא מפתחות API');
      pollUntilDone('הריצה הסתיימה ✓');
    } catch (err) {
      notify(err.message || 'שגיאה בהפעלת המנוע', 'error');
    } finally {
      setStarting(false);
    }
  }

  async function handleEmergencyStop() {
    setStopping(true);
    try {
      await adminApi.emergencyStopEngine(token);
      notify('עצירת חירום נשלחה — הריצה תיעצר לפני הבקשה הבאה');
      loadStatus();
    } catch (err) {
      notify(err.message || 'שגיאה בעצירה', 'error');
    } finally {
      setStopping(false);
    }
  }

  async function handleSyncQueries() {
    try {
      const res = await adminApi.syncEngineQueries(token);
      notify(`מטריצת שאילתות סונכרנה — ${res.total} שאילתות`);
      loadQueryStats();
    } catch (err) {
      notify(err.message || 'שגיאה בסנכרון', 'error');
    }
  }

  const latest = status?.latestRun;

  return (
    <div dir="rtl">
      <div className="adm-quick-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', flexWrap: 'wrap' }}>
        <motion.button
          className="adm-row__approve"
          whileTap={{ scale: 0.97 }}
          onClick={handleRun}
          disabled={starting || status?.running}
        >
          <PlayCircle size={16} /> {status?.running ? 'רץ כרגע…' : starting ? 'מפעיל…' : 'הרץ מנוע'}
        </motion.button>
        {status?.running && (
          <motion.button
            className="adm-row__reject"
            whileTap={{ scale: 0.97 }}
            onClick={handleEmergencyStop}
            disabled={stopping || status?.emergencyStopped}
          >
            <AlertTriangle size={16} /> {status?.emergencyStopped ? 'עצירה נשלחה…' : stopping ? 'עוצר…' : 'עצירת חירום'}
          </motion.button>
        )}
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          מריץ את שרשרת האיסוף האמיתית: SeedSourceProvider (engine/discovery/seedSources.json) +
          RuleBasedExtractor — סורק אתרים אמיתיים, בלי צורך ב-SEARCH_API_KEY או ANTHROPIC_API_KEY.
          נכסים חדשים נכנסים כ"ממתין לאישור" בלבד, אף אחד לא מתפרסם אוטומטית.
        </span>
      </div>

      {status?.running && status?.liveCost && (
        <div style={{ padding: '0 20px 12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          עלות מצטברת בזמן אמת: ${status.liveCost.costUsd} ({status.liveCost.callCount} קריאות LLM)
        </div>
      )}

      {status?.running && status?.liveProgress && (
        <div className="adm-analytics__grid" style={{ padding: '0 20px 12px' }}>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-hearth)', background: 'rgba(193,89,43,0.12)' }}><MapPin size={26} /></div>
            <div className="adm-analytics-kpi__value">{status.liveProgress.domainsDiscovered}</div>
            <div className="adm-analytics-kpi__label">דומיינים שהתגלו</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-ash)', background: 'rgba(122,108,91,0.12)' }}><ShieldCheck size={26} /></div>
            <div className="adm-analytics-kpi__value">{status.liveProgress.approved}</div>
            <div className="adm-analytics-kpi__label">סווגו כצימר</div>
            <div className="adm-analytics-kpi__sub">מתוך {status.liveProgress.classified} שסווגו</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-olive)', background: 'rgba(91,107,78,0.12)' }}><Home size={26} /></div>
            <div className="adm-analytics-kpi__value">{status.liveProgress.propertiesCreated + status.liveProgress.propertiesUpdated}</div>
            <div className="adm-analytics-kpi__label">נשמרו (ממתינים לאישור)</div>
            <div className="adm-analytics-kpi__sub">{status.liveProgress.propertiesCreated} חדשים · {status.liveProgress.propertiesUpdated} עודכנו</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-gold)', background: 'rgba(184,134,11,0.12)' }}><XCircle size={26} /></div>
            <div className="adm-analytics-kpi__value">{status.liveProgress.pagesRejected}</div>
            <div className="adm-analytics-kpi__label">נדחו</div>
            <div className="adm-analytics-kpi__sub">מתוך {status.liveProgress.pagesFetched} שנטענו</div>
          </div>
        </div>
      )}

      {status?.running && status?.liveProgress?.recentRejections?.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <h3 className="dash-section-title" style={{ margin: '4px 0' }}>דחיות אחרונות</h3>
          <div className="adm-list">
            {status.liveProgress.recentRejections.map((r, i) => (
              <div key={i} className="adm-row" style={{ padding: '8px 12px' }}>
                <div className="adm-row__info">
                  <span style={{ fontSize: '0.82rem' }}>{r.site}</span>
                  <span className="adm-row__meta" style={{ color: 'var(--ds-wine)' }}>{r.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {queryStats && (
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem' }}>
            מטריצת שאילתות: {queryStats.total} סה"כ · {queryStats.productive || 0} פרודוקטיביות ·
            {' '}{queryStats.unproductive || 0} ריקות · {queryStats.pending || 0} טרם רצו
          </span>
          <button className="adm-row__delete" onClick={handleSyncQueries} style={{ fontSize: '0.78rem' }}>
            סנכרן מטריצה
          </button>
        </div>
      )}

      {latest && (
        <>
          <div className="adm-analytics__grid" style={{ padding: '0 20px' }}>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-hearth)', background: 'rgba(193,89,43,0.12)' }}><MapPin size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.domains_discovered}</div>
              <div className="adm-analytics-kpi__label">דומיינים שהתגלו</div>
            </div>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-olive)', background: 'rgba(91,107,78,0.12)' }}><CheckCircle size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.pages_extracted}</div>
              <div className="adm-analytics-kpi__label">דפים חולצו בהצלחה</div>
              <div className="adm-analytics-kpi__sub">{latest.pages_rejected} נדחו</div>
            </div>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-gold)', background: 'rgba(184,134,11,0.12)' }}><Home size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.properties_created}</div>
              <div className="adm-analytics-kpi__label">נכסים חדשים</div>
              <div className="adm-analytics-kpi__sub">{latest.properties_updated} עודכנו</div>
            </div>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-hearth-dark)', background: 'rgba(156,67,30,0.12)' }}><AlertTriangle size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.properties_queued_for_review}</div>
              <div className="adm-analytics-kpi__label">ממתינים לאישור ידני</div>
            </div>
          </div>
          <div style={{ padding: '4px 20px 20px' }}>
            <h3 className="dash-section-title" style={{ margin: '12px 0 4px' }}>דוח תאימות — ריצה אחרונה</h3>
            <ComplianceReportBlock report={latest.compliance_report} />
          </div>
        </>
      )}

      {!latest && <p className="adm-list__empty">עדיין לא בוצעה ריצה</p>}

      {runs.length > 0 && (
        <div className="adm-list" style={{ padding: '0 20px 20px' }}>
          <h3 className="dash-section-title">היסטוריית ריצות</h3>
          {runs.map((r) => (
            <div key={r.id} className="adm-row">
              <div className="adm-row__info">
                <strong>
                  ריצה #{r.id} — {r.status === 'completed' ? '✓ הושלמה' : r.status === 'failed' ? '✗ נכשלה' : '⏳ רצה'}
                  {r.mode === 'dry_run' && (
                    <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-muted)', marginRight: 8 }}>
                      (בדיקה פנימית — אתרי fixture מקומיים, לא אתרים אמיתיים)
                    </span>
                  )}
                </strong>
                <span className="adm-row__date">{new Date(r.started_at).toLocaleString('he-IL')}</span>
                <span>
                  דומיינים: {r.domains_discovered} · נכסים: {r.properties_created} חדשים, {r.properties_updated} עודכנו,{' '}
                  {r.properties_queued_for_review} נפסלו בסף · עלות: ${r.llm_cost_usd}
                </span>
                {r.status === 'failed' && r.error_message && (
                  <span className="adm-row__meta" style={{ color: 'var(--ds-wine)' }}>סיבת הכישלון: {r.error_message}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PROPERTY_REVIEW_REGIONS = ['north', 'galilee', 'golan', 'carmel', 'center', 'jerusalem', 'south', 'dead_sea', 'eilat'];
const PROPERTY_REVIEW_TYPES = ['zimmer', 'villa', 'cottage', 'suite'];
const PROPERTY_EDIT_FIELDS = ['name', 'property_type', 'region', 'city', 'address', 'phone', 'whatsapp', 'email', 'guest_capacity', 'bedrooms', 'beds', 'bathrooms', 'description'];

function PropertyReviewTab({ token, notify }) {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletePropertyConfirmId, setDeletePropertyConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [queuePage, setQueuePage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const [{ properties }, statsRes] = await Promise.all([
        adminApi.getPropertyReviewQueue(token),
        adminApi.getPropertyStats(token),
      ]);
      setQueue(properties || []);
      setStats(statsRes);
    } catch (err) {
      notify(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id) {
    try {
      await adminApi.approveAutoProperty(token, id);
      notify('הנכס אושר ופורסם ✓');
      setQueue((prev) => prev.filter((p) => p.id !== id));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function reject(id) {
    try {
      await adminApi.rejectAutoProperty(token, id);
      notify('הנכס נדחה והוסתר');
      setQueue((prev) => prev.filter((p) => p.id !== id));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function hardDelete(id) {
    try {
      await adminApi.hardDeleteProperty(token, id);
      notify('הנכס נמחק לצמיתות');
      setQueue((prev) => prev.filter((p) => p.id !== id));
      setDeletePropertyConfirmId(null);
    } catch (err) { notify(err.message, 'error'); }
  }

  function startEdit(p) {
    const form = {};
    for (const key of PROPERTY_EDIT_FIELDS) form[key] = p[key] ?? '';
    setEditForm(form);
    setEditingId(p.id);
  }

  async function saveEdit(id) {
    setSavingEdit(true);
    try {
      const payload = {};
      for (const key of PROPERTY_EDIT_FIELDS) {
        const raw = editForm[key];
        payload[key] = raw === '' ? null : (['guest_capacity', 'bedrooms', 'beds', 'bathrooms'].includes(key) ? Number(raw) : raw);
      }
      await adminApi.updateAutoProperty(token, id, payload);
      notify('הנכס עודכן ✓');
      setQueue((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
      setEditingId(null);
    } catch (err) { notify(err.message, 'error'); }
    finally { setSavingEdit(false); }
  }

  return (
    <div dir="rtl">
      {stats && (
        <div className="adm-analytics__grid" style={{ padding: '16px 20px 0' }}>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-olive)', background: 'rgba(91,107,78,0.12)' }}><Bot size={26} /></div>
            <div className="adm-analytics-kpi__value">{stats.autoCollection.totalAuto}</div>
            <div className="adm-analytics-kpi__label">סה"כ נכסים מהמנוע</div>
            <div className="adm-analytics-kpi__sub">{stats.autoCollection.successRate}% אחוז פרסום</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-gold)', background: 'rgba(184,134,11,0.12)' }}><Clock size={26} /></div>
            <div className="adm-analytics-kpi__value">{stats.autoCollection.pendingReview}</div>
            <div className="adm-analytics-kpi__label">ממתינים לאישור</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: 'var(--ds-hearth-dark)', background: 'rgba(156,67,30,0.12)' }}><ShieldCheck size={26} /></div>
            <div className="adm-analytics-kpi__value">{stats.autoCollection.avgConfidence}</div>
            <div className="adm-analytics-kpi__label">confidence ממוצע</div>
          </div>
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>טוען…</p>}

      {!loading && (
        <div className="adm-list">
          {queue.length === 0 && <p className="adm-list__empty">אין נכסים הממתינים לאישור</p>}
          {queue.slice((queuePage - 1) * REVIEW_QUEUE_PER_PAGE, queuePage * REVIEW_QUEUE_PER_PAGE).map((p) => (
            <div key={p.id} className="adm-row">
              {editingId === p.id ? (
                <div className="adm-row__info" style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <label>שם<input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>סוג נכס
                      <select value={editForm.property_type} onChange={(e) => setEditForm((f) => ({ ...f, property_type: e.target.value }))}>
                        {PROPERTY_REVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label style={{ flex: 1 }}>אזור
                      <select value={editForm.region} onChange={(e) => setEditForm((f) => ({ ...f, region: e.target.value }))}>
                        {PROPERTY_REVIEW_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>עיר<input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>כתובת<input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} /></label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>טלפון<input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>וואטסאפ<input value={editForm.whatsapp} onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>אימייל<input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>אורחים<input type="number" value={editForm.guest_capacity} onChange={(e) => setEditForm((f) => ({ ...f, guest_capacity: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>חדרי שינה<input type="number" value={editForm.bedrooms} onChange={(e) => setEditForm((f) => ({ ...f, bedrooms: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>מיטות<input type="number" value={editForm.beds} onChange={(e) => setEditForm((f) => ({ ...f, beds: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>חדרי רחצה<input type="number" value={editForm.bathrooms} onChange={(e) => setEditForm((f) => ({ ...f, bathrooms: e.target.value }))} /></label>
                  </div>
                  <label>תיאור<textarea rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></label>
                </div>
              ) : (
                <div className="adm-row__info">
                  <strong>{p.name}</strong>
                  <span>{p.property_type} · {p.region} · {p.city || '—'} · confidence: {p.confidence}</span>
                  <span className="adm-row__meta">
                    טלפון: {p.phone || '—'} · וואטסאפ: {p.whatsapp || '—'} · אימייל: {p.email || '—'} · אורחים: {p.guest_capacity ?? '—'} ·
                    חדרי שינה: {p.bedrooms ?? '—'} · מיטות: {p.beds ?? '—'} · חדרי רחצה: {p.bathrooms ?? '—'}
                  </span>
                  {p.source_url && (
                    <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="adm-agent-detail__link">
                      <Eye size={12} /> מקור
                    </a>
                  )}
                  {/* 11.15 — display-only (never downloaded/proxied to our server): straight <img>
                      tags pointing at the source site's own image URLs, so an admin can actually
                      see the property before approving it. */}
                  {p.source_image_urls?.length > 0 ? (
                    <div className="adm-row__photos">
                      {p.source_image_urls.slice(0, 6).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="adm-row__photo"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="adm-row__no-photos"><ImageOff size={13} /> אין תמונות מקור</span>
                  )}
                  {p.description && <span className="adm-row__meta">{p.description}</span>}
                  <span className="adm-row__date">נאסף: {new Date(p.collected_at).toLocaleDateString('he-IL')}</span>
                </div>
              )}
              <div className="adm-row__actions">
                {editingId === p.id ? (
                  <>
                    <motion.button className="adm-row__approve" whileTap={{ scale: 0.97 }} disabled={savingEdit} onClick={() => saveEdit(p.id)}>
                      <Save size={16} /> שמור
                    </motion.button>
                    <button onClick={() => setEditingId(null)} disabled={savingEdit}><X size={14} /> ביטול</button>
                  </>
                ) : (
                  <>
                    <motion.button className="adm-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approve(p.id)}>
                      <CheckCircle size={16} /> אשר ופרסם
                    </motion.button>
                    <button onClick={() => startEdit(p)}>
                      <Pencil size={14} /> ערוך
                    </button>
                    <motion.button className="adm-row__reject" whileTap={{ scale: 0.97 }} onClick={() => reject(p.id)}>
                      <XCircle size={16} /> דחה והסתר
                    </motion.button>
                    {deletePropertyConfirmId === p.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ds-wine)' }}>מחיקה קשיחה — לצמיתות, לא ניתן לשחזור. בטוח?</span>
                        <button className="adm-row__reject" onClick={() => hardDelete(p.id)}>כן, מחק לצמיתות</button>
                        <button onClick={() => setDeletePropertyConfirmId(null)}>ביטול</button>
                      </div>
                    ) : (
                      <button
                        className="adm-row__delete"
                        style={{ color: 'var(--ds-wine)', borderColor: 'rgba(140,47,57,0.3)' }}
                        onClick={() => setDeletePropertyConfirmId(p.id)}
                      >
                        <Trash2 size={14} /> מחק לצמיתות
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <Pagination page={queuePage} totalPages={Math.ceil(queue.length / REVIEW_QUEUE_PER_PAGE)} onPage={setQueuePage} />
        </div>
      )}
    </div>
  );
}

const PROPERTY_STATUS_VALUES = ['unclaimed', 'claimed', 'active', 'hidden', 'pending', 'draft'];
const PROPERTY_STATUS_LABELS = {
  unclaimed: 'לא נתבע', claimed: 'נתבע', active: 'פעיל', hidden: 'מוסתר', pending: 'ממתין לבעלים', draft: 'טיוטה',
};

/** PropertiesListTab — 11.16: browsable, editable list of properties for a single `source`
 * ('manual' or 'auto'), with search + region/status filters and quick actions (edit/hide/delete).
 * Used for both the "נכסים פעילים" tab (source='manual') and, embedded inside the "נכסים מהמנוע"
 * tab, to browse auto-collected properties beyond the pending-review queue (already
 * approved/rejected ones). Filters/pagination are server-side (adminApi.getAllProperties) since
 * this table has no natural size cap the way the review queue does. `source` is always passed
 * explicitly to the API — the two tabs must never blend manual and auto-collected rows. */
function PropertiesListTab({ token, notify, source }) {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const searchDebounceRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const result = await adminApi.getAllProperties(token, { search: searchQ, region, status, source, page });
      setProperties(result.properties || []);
      setTotal(result.total || 0);
    } catch (err) {
      notify(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token, searchQ, region, status, source, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(e) {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { setSearchQ(v.trim()); setPage(1); }, 280);
  }

  async function toggleHide(p) {
    const newStatus = p.status === 'hidden' ? 'active' : 'hidden';
    try {
      await adminApi.setPropertyStatus(token, p.id, newStatus);
      notify(newStatus === 'hidden' ? 'הנכס הוסתר' : 'הנכס גלוי שוב');
      setProperties((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: newStatus } : x)));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function hardDelete(id) {
    try {
      await adminApi.hardDeleteProperty(token, id);
      notify('הנכס נמחק לצמיתות');
      setProperties((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } catch (err) { notify(err.message, 'error'); }
  }

  function startEdit(p) {
    setEditForm({
      name: p.name || '', property_type: p.property_type, region: p.region, city: p.city || '',
      address: p.address || '', phone: p.phone || '', whatsapp: p.whatsapp || '', email: p.email || '',
      guest_capacity: p.guest_capacity ?? '', bedrooms: p.bedrooms ?? '', beds: p.beds ?? '', bathrooms: p.bathrooms ?? '',
      description: p.description || '',
    });
    setEditingId(p.id);
  }

  async function saveEdit(id) {
    setSavingEdit(true);
    try {
      const payload = { ...editForm };
      for (const key of ['guest_capacity', 'bedrooms', 'beds', 'bathrooms']) {
        payload[key] = payload[key] === '' ? null : Number(payload[key]);
      }
      await adminApi.updateProperty(token, id, payload);
      notify('הנכס עודכן ✓');
      setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
      setEditingId(null);
    } catch (err) { notify(err.message, 'error'); }
    finally { setSavingEdit(false); }
  }

  const totalPages = Math.ceil(total / PROPERTIES_PER_PAGE);

  return (
    <div dir="rtl">
      <div className="adm-search-bar" style={{ margin: '0 20px 12px' }}>
        <Search size={15} className="adm-search-bar__icon" />
        <input
          className="adm-search-bar__input"
          type="text"
          placeholder="חיפוש לפי שם / עיר / טלפון…"
          value={search}
          onChange={handleSearchChange}
          autoComplete="off"
        />
        {search && <button className="adm-search-bar__clear" onClick={() => { setSearch(''); setSearchQ(''); setPage(1); }}>×</button>}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 14px', flexWrap: 'wrap' }}>
        <select value={region} onChange={(e) => { setRegion(e.target.value); setPage(1); }}>
          <option value="">כל האזורים</option>
          {PROPERTY_REVIEW_REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r, 'he')}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">כל הסטטוסים</option>
          {PROPERTY_STATUS_VALUES.map((s) => <option key={s} value={s}>{PROPERTY_STATUS_LABELS[s]}</option>)}
        </select>
        <span style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--ds-ash)' }}>{total} נכסים</span>
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--ds-ash)' }}>טוען…</p>}

      {!loading && (
        <div className="adm-list">
          {properties.length === 0 && <p className="adm-list__empty">לא נמצאו נכסים</p>}
          {properties.map((p) => (
            <div key={p.id} className="adm-row">
              {editingId === p.id ? (
                <div className="adm-row__info" style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <label>שם<input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>עיר<input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>כתובת<input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} /></label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>טלפון<input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>וואטסאפ<input value={editForm.whatsapp} onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value }))} /></label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1 }}>אורחים<input type="number" value={editForm.guest_capacity} onChange={(e) => setEditForm((f) => ({ ...f, guest_capacity: e.target.value }))} /></label>
                    <label style={{ flex: 1 }}>חדרי שינה<input type="number" value={editForm.bedrooms} onChange={(e) => setEditForm((f) => ({ ...f, bedrooms: e.target.value }))} /></label>
                  </div>
                  <label>תיאור<textarea rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></label>
                </div>
              ) : (
                <div className="adm-row__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{p.name}</strong>
                    <span className={`adm-status ${p.status === 'active' || p.status === 'claimed' ? 'adm-status--approved' : p.status === 'hidden' ? 'adm-status--rejected' : 'adm-status--pending'}`}>
                      {PROPERTY_STATUS_LABELS[p.status] || p.status}
                    </span>
                  </div>
                  <span>{p.property_type} · {regionLabel(p.region, 'he')} · {p.city || '—'}</span>
                  <span className="adm-row__meta">טלפון: {p.phone || '—'} · וואטסאפ: {p.whatsapp || '—'}</span>
                  <span className="adm-row__date">עודכן: {new Date(p.updated_at).toLocaleDateString('he-IL')}</span>
                </div>
              )}
              <div className="adm-row__actions">
                {editingId === p.id ? (
                  <>
                    <motion.button className="adm-row__approve" whileTap={{ scale: 0.97 }} disabled={savingEdit} onClick={() => saveEdit(p.id)}>
                      <Save size={16} /> שמור
                    </motion.button>
                    <button onClick={() => setEditingId(null)} disabled={savingEdit}><X size={14} /> ביטול</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(p)}><Pencil size={14} /> ערוך</button>
                    <button onClick={() => toggleHide(p)}>
                      {p.status === 'hidden' ? <><Eye size={14} /> הצג</> : <><EyeOff size={14} /> הסתר</>}
                    </button>
                    {deleteConfirmId === p.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ds-wine)' }}>מחיקה קשיחה — לצמיתות. בטוח?</span>
                        <button className="adm-row__reject" onClick={() => hardDelete(p.id)}>כן, מחק לצמיתות</button>
                        <button onClick={() => setDeleteConfirmId(null)}>ביטול</button>
                      </div>
                    ) : (
                      <button className="adm-row__delete" onClick={() => setDeleteConfirmId(p.id)}>
                        <Trash2 size={14} /> מחק לצמיתות
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

/** PendingClaimsSection — 11.16: an owner who verifies a phone/whatsapp number on an unclaimed
 * auto-collected listing (see POST /properties/:id/claim/verify) lands here awaiting admin
 * approval. This queue and its endpoints already existed in the backend/API client but had no
 * admin-panel UI at all — wiring it up here, inside "נכסים מהמנוע", because approving a claim is
 * exactly the moment a property moves from source='auto' to source='manual' (see
 * propertyStore.approveClaim) and reappears in "נכסים פעילים" instead. */
function PendingClaimsSection({ token, notify }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { properties } = await adminApi.getPendingPropertyClaims(token);
      setClaims(properties || []);
    } catch (err) {
      notify(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id) {
    try {
      await adminApi.approvePropertyClaim(token, id);
      notify('התביעה אושרה — הנכס עבר לבעלות הטוען ✓');
      setClaims((prev) => prev.filter((p) => p.id !== id));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function reject(id) {
    try {
      await adminApi.rejectPropertyClaim(token, id);
      notify('התביעה נדחתה');
      setClaims((prev) => prev.filter((p) => p.id !== id));
    } catch (err) { notify(err.message, 'error'); }
  }

  if (loading || claims.length === 0) return null;

  return (
    <div dir="rtl" style={{ padding: '16px 20px 0' }}>
      <h3 style={{ margin: '0 0 10px' }}>תביעות בעלות ממתינות לאישור ({claims.length})</h3>
      <div className="adm-list">
        {claims.map((p) => (
          <div key={p.id} className="adm-row">
            <div className="adm-row__info">
              <strong>{p.name}</strong>
              <span>{p.property_type} · {regionLabel(p.region, 'he')} · {p.city || '—'}</span>
              <span className="adm-row__meta">טוען הבעלות: {p.claimant_business_name} · {p.claimant_email}</span>
            </div>
            <div className="adm-row__actions">
              <motion.button className="adm-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approve(p.id)}>
                <CheckCircle size={16} /> אשר תביעה
              </motion.button>
              <motion.button className="adm-row__reject" whileTap={{ scale: 0.97 }} onClick={() => reject(p.id)}>
                <XCircle size={16} /> דחה
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** EngineSourcedPropertiesTab — 11.16: "נכסים מהמנוע", the single tab for everything
 * source='auto' — ownership claims awaiting approval, the pending-review queue (approve/edit/
 * reject newly scraped listings), and a browsable list of every other auto-collected property
 * (already approved or rejected). Deliberately separate from "נכסים פעילים" (PropertiesListTab
 * with source='manual') per the manual/auto split — see propertyStore.listPropertiesForAdmin. */
function EngineSourcedPropertiesTab({ token, notify }) {
  return (
    <div>
      <PendingClaimsSection token={token} notify={notify} />
      <PropertyReviewTab token={token} notify={notify} />
      <div style={{ margin: '28px 20px 0', paddingTop: 16, borderTop: '1px solid rgba(140,47,57,0.15)' }}>
        <h3 style={{ margin: '0 0 4px' }}>כל הנכסים מהמנוע</h3>
        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          כולל נכסים שכבר אושרו או נדחו — לעריכה, הסתרה או מחיקה.
        </p>
      </div>
      <PropertiesListTab token={token} notify={notify} source="auto" />
    </div>
  );
}

export function AdminPage() {
  const [token, setToken] = useState(() => adminApi.getToken());
  const [tab, setTab] = useState('active-properties');
  const [pendingAgents, setPendingAgents] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [notification, setNotification] = useState(null);
  const [agentsPage, setAgentsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [contactPage, setContactPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [propertyCounts, setPropertyCounts] = useState({ manual: 0, auto: 0 });
  const [contactSubmissions, setContactSubmissions] = useState([]);
  const [deleteAgentConfirmId, setDeleteAgentConfirmId] = useState(null);
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef(null);
  const [searchQ, setSearchQ] = useState('');

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [{ agents: pending }, { agents: all }, usersRes, contactRes, statsRes] = await Promise.all([
        adminApi.getPendingAgents(token),
        adminApi.getAllAgents(token),
        adminApi.getUsers(token).catch(() => ({ users: [] })),
        fetch('/api/contact', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ submissions: [] })),
        adminApi.getPropertyStats(token).catch(() => null),
      ]);
      setPendingAgents(pending || []);
      setAllAgents(all || []);
      setAllUsers(usersRes?.users || []);
      const bySource = statsRes?.bySource || [];
      setPropertyCounts({
        manual: bySource.find((s) => s.source === 'manual')?.count || 0,
        auto: bySource.find((s) => s.source === 'auto')?.count || 0,
      });
      setContactSubmissions(contactRes?.submissions || []);
    } catch (err) {
      const isAuthError = err.message?.includes('401')
        || err.message?.includes('Unauthorized')
        || err.message?.includes('Invalid or expired token')
        || err.message?.includes('Forbidden');
      if (isAuthError) {
        adminApi.clearToken();
        setToken(null);
      } else {
        notify(err.message || 'שגיאה בטעינה', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) load(); }, [token]);

  function handleLogin(tok) { setToken(tok); }
  function handleLogout() { adminApi.clearToken(); setToken(null); }

  function handleSearchChange(e) {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQ(v.toLowerCase().trim()), 280);
  }

  async function approveAgent(id) {
    try {
      await adminApi.approveAgent(token, id);
      notify('הסוכן אושר ✓');
      setPendingAgents(prev => prev.filter(a => a.id !== id));
      setAllAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function rejectAgent(id) {
    try {
      await adminApi.rejectAgent(token, id, rejectReason);
      notify('הסוכן נדחה');
      setPendingAgents(prev => prev.filter(a => a.id !== id));
      setAllAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
      setRejectId(null); setRejectReason('');
    } catch (err) { notify(err.message, 'error'); }
  }

  async function deleteAgent(id) {
    try {
      await adminApi.deleteAgent(token, id);
      notify('הסוכן נמחק ✓');
      setAllAgents(prev => prev.filter(a => a.id !== id));
      setPendingAgents(prev => prev.filter(a => a.id !== id));
      setDeleteAgentConfirmId(null);
      setSelectedAgent(null);
    } catch (err) { notify(err.message, 'error'); }
  }

  async function deleteUser(id) {
    try {
      await adminApi.deleteUser(token, id);
      notify('הלקוח נמחק ✓');
      setAllUsers(prev => prev.filter(u => u.id !== id));
      setDeleteUserConfirmId(null);
    } catch (err) { notify(err.message, 'error'); }
  }

  function startReject(id, target) { setRejectId(id); setRejectTarget(target); setRejectReason(''); }

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  // Filtered lists based on search
  const filteredAgents = searchQ
    ? allAgents.filter(a =>
        (a.business_name || '').toLowerCase().includes(searchQ) ||
        (a.email || '').toLowerCase().includes(searchQ) ||
        (a.contact_name || '').toLowerCase().includes(searchQ)
      )
    : allAgents;

  const totalAgentsPages = Math.ceil(filteredAgents.length / AGENTS_PER_PAGE);
  const pagedAgents = filteredAgents.slice((agentsPage - 1) * AGENTS_PER_PAGE, agentsPage * AGENTS_PER_PAGE);

  function statusLabel(s) {
    if (s === 'approved') return { label: 'מאושר', cls: 'adm-status--approved' };
    if (s === 'rejected') return { label: 'נדחה', cls: 'adm-status--rejected' };
    return { label: 'ממתין', cls: 'adm-status--pending' };
  }

  const showSearch = tab === 'owners-agents' || tab === 'users';

  return (
    <div className="adm-page" dir="rtl">
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`adm-toast adm-toast--${notification.type}`}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="adm-header">
        <div className="adm-header__brand">
          <Link to="/"><Logo size={28} /></Link>
        </div>

        <nav className="adm-header__nav">
          <Link to="/" className="adm-header__nav-item">
            <Home size={17} />
            <span>אתר</span>
          </Link>
          <div className="adm-header__nav-item is-active">
            <LayoutDashboard size={17} />
            <span>ניהול</span>
          </div>
        </nav>

        <div className="adm-header__actions">
          <button className="adm-icon-btn" onClick={load} disabled={loading} title="רענן">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="adm-icon-btn adm-icon-btn--danger" onClick={handleLogout} title="התנתקות">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* KPI row */}
      <div className="adm-kpi-row">
        <div className="adm-kpi">
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(91,107,78,0.12)', color: 'var(--ds-olive)' }}>
            <Home size={22} />
          </div>
          <span className="adm-kpi__value">{propertyCounts.manual}</span>
          <span className="adm-kpi__label">נכסים פעילים</span>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(156,67,30,0.12)', color: 'var(--ds-hearth-dark)' }}>
            <Bot size={22} />
          </div>
          <span className="adm-kpi__value">{propertyCounts.auto}</span>
          <span className="adm-kpi__label">נכסים מהמנוע</span>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(193,89,43,0.12)', color: 'var(--ds-hearth)' }}>
            <Users size={22} />
          </div>
          <span className="adm-kpi__value">{allAgents.length}</span>
          <span className="adm-kpi__label">בעלים/סוכנים רשומים</span>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(184,134,11,0.12)', color: 'var(--ds-gold)' }}>
            <User size={22} />
          </div>
          <span className="adm-kpi__value">{allUsers.length}</span>
          <span className="adm-kpi__label">לקוחות רשומים</span>
        </div>
      </div>

      {/* Tabs — order matches the panel's real workflow: properties first (active, then engine
          queue), then the people (owners/agents, customers), then public inquiries and the
          collection engine itself. */}
      <div className="adm-tabs">
        <button className={`adm-tabs__btn${tab === 'active-properties' ? ' is-active' : ''}`} onClick={() => setTab('active-properties')}>
          <Home size={14} /> נכסים פעילים <span className="adm-tabs__badge adm-tabs__badge--neutral">{propertyCounts.manual}</span>
        </button>
        <button className={`adm-tabs__btn${tab === 'engine-properties' ? ' is-active' : ''}`} onClick={() => setTab('engine-properties')}>
          <Bot size={14} /> נכסים מהמנוע <span className="adm-tabs__badge adm-tabs__badge--neutral">{propertyCounts.auto}</span>
        </button>
        <button className={`adm-tabs__btn${tab === 'owners-agents' ? ' is-active' : ''}`} onClick={() => setTab('owners-agents')}>
          <Users size={14} /> בעלים/סוכנים רשומים {pendingAgents.length > 0 && <span className="adm-tabs__badge">{pendingAgents.length}</span>}
        </button>
        <button className={`adm-tabs__btn${tab === 'users' ? ' is-active' : ''}`} onClick={() => setTab('users')}>
          <User size={14} /> לקוחות <span className="adm-tabs__badge adm-tabs__badge--neutral">{allUsers.length}</span>
        </button>
        <button className={`adm-tabs__btn${tab === 'contact' ? ' is-active' : ''}`} onClick={() => setTab('contact')}>
          📬 פניות הציבור {contactSubmissions.filter(s => !s.is_read).length > 0 && (
            <span className="adm-tabs__badge">{contactSubmissions.filter(s => !s.is_read).length}</span>
          )}
        </button>
        <button className={`adm-tabs__btn${tab === 'engine' ? ' is-active' : ''}`} onClick={() => setTab('engine')}>
          <Bot size={14} /> מנוע איסוף
        </button>
      </div>

      {/* Search bar — visible on the owners/agents and customers tabs */}
      {showSearch && (
        <div className="adm-search-bar">
          <Search size={15} className="adm-search-bar__icon" />
          <input
            className="adm-search-bar__input"
            type="text"
            placeholder={tab === 'owners-agents' ? 'חיפוש בעלים/סוכן לפי שם / אימייל…' : 'חיפוש לקוח לפי שם / אימייל…'}
            value={search}
            onChange={handleSearchChange}
            autoComplete="off"
          />
          {search && (
            <button className="adm-search-bar__clear" onClick={() => { setSearch(''); setSearchQ(''); }}>×</button>
          )}
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>טוען…</p>}

      {/* Users (Customers) */}
      {!loading && tab === 'users' && (
        <div className="adm-list">
          {(() => {
            const q = searchQ.toLowerCase();
            const list = q
              ? allUsers.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
              : allUsers;
            if (list.length === 0) return <p className="adm-list__empty">אין לקוחות רשומים</p>;
            const totalUsersPages = Math.ceil(list.length / USERS_PER_PAGE);
            const paged = list.slice((usersPage - 1) * USERS_PER_PAGE, usersPage * USERS_PER_PAGE);
            return (
              <>
                {paged.map(u => (
                  <div key={u.id} className="adm-row">
                    <div className="adm-row__info">
                      <span className="adm-row__name">{u.name}</span>
                      <span className="adm-row__email">{u.email}</span>
                      <span className="adm-row__meta">
                        {u.auth_provider === 'google' ? '🔵 Google' : '📧 אימייל'}
                        {' · '}
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('he-IL') : ''}
                      </span>
                    </div>
                    <div className="adm-row__actions">
                      {deleteUserConfirmId === u.id ? (
                        <>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>למחוק?</span>
                          <button className="adm-row__reject" onClick={() => deleteUser(u.id)}>כן, מחק</button>
                          <button onClick={() => setDeleteUserConfirmId(null)}>ביטול</button>
                        </>
                      ) : (
                        <motion.button className="adm-row__delete" whileTap={{ scale: 0.97 }} onClick={() => setDeleteUserConfirmId(u.id)}>
                          <Trash2 size={14} /> מחק
                        </motion.button>
                      )}
                    </div>
                  </div>
                ))}
                <Pagination page={usersPage} totalPages={totalUsersPages} onPage={setUsersPage} />
              </>
            );
          })()}
        </div>
      )}

      {/* נכסים פעילים — source='manual' only: drafts and published listings from real owners. */}
      {tab === 'active-properties' && <PropertiesListTab token={token} notify={notify} source="manual" />}

      {/* נכסים מהמנוע — source='auto' only: ownership claims, the pending-review queue (approve/
          edit/reject scraped listings — see propertyStore.listPropertiesPendingReview), and every
          other auto-collected property. */}
      {tab === 'engine-properties' && <EngineSourcedPropertiesTab token={token} notify={notify} />}

      {/* Collection engine (Step 3/4) */}
      {tab === 'engine' && <EngineTab token={token} notify={notify} />}

      {/* Contact Submissions */}
      {tab === 'contact' && (
        <div className="adm-list" dir="rtl">
          {contactSubmissions.length === 0 && <p className="adm-list__empty">אין פניות עדיין</p>}
          {contactSubmissions.slice((contactPage - 1) * CONTACT_PER_PAGE, contactPage * CONTACT_PER_PAGE).map(sub => (
            <div key={sub.id} className={`adm-row${sub.is_read ? ' adm-row--read' : ''}`}>
              <div className="adm-row__info">
                <strong>{sub.name}</strong>
                <span>{sub.email}{sub.phone ? ` · ${sub.phone}` : ''}</span>
                <span className="adm-row__meta" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--ds-bone)', marginTop: 4 }}>{sub.message}</span>
                <span className="adm-row__date">{new Date(sub.created_at).toLocaleString('he-IL')}</span>
              </div>
              <div className="adm-row__actions">
                {!sub.is_read && (
                  <button className="adm-row__approve" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={async () => {
                    await fetch(`/api/contact/${sub.id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
                    setContactSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, is_read: 1 } : s));
                  }}>
                    סמן כנקרא
                  </button>
                )}
                <a className="adm-row__approve" style={{ fontSize: '0.8rem', padding: '6px 12px', textDecoration: 'none' }} href={`mailto:${sub.email}`}>
                  השב במייל
                </a>
              </div>
            </div>
          ))}
          <Pagination page={contactPage} totalPages={Math.ceil(contactSubmissions.length / CONTACT_PER_PAGE)} onPage={setContactPage} />
        </div>
      )}

      {/* בעלים/סוכנים רשומים — pending signups needing approval first, then the full searchable
          roster. Merged into one tab (11.16): these were two separate tabs before, but an admin
          managing "who's registered" naturally wants both views together. */}
      {!loading && tab === 'owners-agents' && pendingAgents.length > 0 && (
        <div className="adm-list" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px 20px' }}>ממתינים לאישור ({pendingAgents.length})</h3>
          {pendingAgents.map(agent => (
            <div key={agent.id} className="adm-row">
              <div className="adm-row__info">
                <strong>{agent.business_name}</strong>
                <span>{agent.contact_name} · {agent.email}</span>
                {agent.phone && <span>{agent.phone}</span>}
                {agent.license_number && <span>רישיון: {agent.license_number}</span>}
                <span className="adm-row__date">{new Date(agent.created_at).toLocaleDateString('he-IL')}</span>
              </div>
              <div className="adm-row__actions">
                <motion.button className="adm-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approveAgent(agent.id)}>
                  <CheckCircle size={16} /> אשר
                </motion.button>
                <motion.button className="adm-row__reject" whileTap={{ scale: 0.97 }} onClick={() => startReject(agent.id, 'agent')}>
                  <XCircle size={16} /> דחה
                </motion.button>
              </div>
              {rejectId === agent.id && rejectTarget === 'agent' && (
                <div className="adm-row__reject-form">
                  <input className="adm-row__reject-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="סיבה (אופציונלי)" autoFocus />
                  <button className="adm-row__reject-confirm" onClick={() => rejectAgent(agent.id)}>אשר דחייה</button>
                  <button onClick={() => setRejectId(null)}>ביטול</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'owners-agents' && (
        <div className="adm-list">
          {filteredAgents.length === 0 && <p className="adm-list__empty">{searchQ ? 'לא נמצאו תוצאות' : 'אין בעלים/סוכנים'}</p>}
          {pagedAgents.map(agent => {
            const { label, cls } = statusLabel(agent.status);
            const isExpanded = selectedAgent === agent.id;
            return (
              <div key={agent.id} className="adm-row adm-row--clickable" onClick={() => setSelectedAgent(isExpanded ? null : agent.id)}>
                <div className="adm-row__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} style={{ opacity: 0.5 }} />
                    <strong>{agent.business_name}</strong>
                    <span className={`adm-status ${cls}`}>{label}</span>
                  </div>
                  <span>{agent.contact_name} · {agent.email}</span>
                  <span className="adm-row__date">{new Date(agent.created_at).toLocaleDateString('he-IL')}</span>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="adm-agent-detail"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {agent.phone && <div className="adm-agent-detail__row"><span>טלפון:</span> {agent.phone}</div>}
                      <div className="adm-agent-detail__row"><span>לידים:</span> {agent.lead_count || 0}</div>
                      <div className="adm-agent-detail__row">
                        <a href={`/agent/${agent.slug}`} target="_blank" rel="noopener noreferrer" className="adm-agent-detail__link">
                          <Eye size={12} /> פרופיל ציבורי
                        </a>
                      </div>
                      <div className="adm-agent-detail__row" style={{ marginTop: 8, borderTop: '1px solid rgba(140,47,57,0.15)', paddingTop: 8 }}>
                        {deleteAgentConfirmId === agent.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', color: 'var(--ds-wine)' }}>למחוק את כל הנתונים של הסוכן?</span>
                            <button className="adm-row__reject" onClick={() => deleteAgent(agent.id)}>כן, מחק</button>
                            <button onClick={() => setDeleteAgentConfirmId(null)}>ביטול</button>
                          </div>
                        ) : (
                          <button
                            className="adm-row__delete"
                            style={{ color: 'var(--ds-wine)', borderColor: 'rgba(140,47,57,0.3)' }}
                            onClick={() => setDeleteAgentConfirmId(agent.id)}
                          >
                            <Trash2 size={13} /> מחק סוכן
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          <Pagination page={agentsPage} totalPages={totalAgentsPages} onPage={p => { setAgentsPage(p); }} />
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
