import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Eye, RefreshCw, ArrowLeft, Trash2, ChevronLeft, ChevronRight, User, LogOut, Users, FileCheck, LayoutDashboard, Clock, Home, BarChart3, Search, ShoppingBag, MousePointerClick, Bot, ShieldCheck, PlayCircle, MapPin, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client.js';
import { Logo } from '../components/Logo.jsx';

const AGENTS_PER_PAGE = 25;

function DealPreview({ deal }) {
  return (
    <div className="adm-deal-preview">
      {deal.photo_url && <img src={deal.photo_url} alt="" className="adm-deal-preview__img" />}
      <div className="adm-deal-preview__info">
        <strong>{deal.destination_name || deal.destination}</strong>
        <span>{deal.departure_date}{deal.return_date ? ` → ${deal.return_date}` : ''}</span>
        <span>{deal.price} {deal.currency}</span>
        {deal.purchase_link && <a href={deal.purchase_link} target="_blank" rel="noopener noreferrer"><Eye size={12} /> צפה בלינק</a>}
        <span>סוכן: {deal.business_name}</span>
        {deal.airline && <span>✈ {deal.airline}</span>}
        {deal.hotel_name && <span>🏨 {deal.hotel_name}{deal.hotel_stars ? ` ${'★'.repeat(Number(deal.hotel_stars))}` : ''}</span>}
        {deal.car_type && <span>🚗 {deal.car_type}{deal.car_company ? ` · ${deal.car_company}` : ''}</span>}
        {deal.click_count != null && <span>👆 {deal.click_count} קליקים</span>}
        {deal.purchase_count > 0 && <span>🛍 {deal.purchase_count} רכישות</span>}
      </div>
    </div>
  );
}

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

function AnalyticsTab({ token }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi.getAnalytics(token, year, month)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token, year, month]);

  const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) yearOptions.push(y);

  return (
    <div className="adm-analytics" dir="rtl">
      {/* Month selector */}
      <div className="adm-analytics__filters">
        <select className="adm-analytics__select" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS_HE.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="adm-analytics__select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>טוען…</p>}

      {!loading && data && (
        <div className="adm-analytics__grid">
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#059669', background: 'rgba(5,150,105,0.12)' }}>
              <ShoppingBag size={26} />
            </div>
            <div className="adm-analytics-kpi__value">{data.purchases_total}</div>
            <div className="adm-analytics-kpi__label">רכישות החודש</div>
            <div className="adm-analytics-kpi__sub">{data.purchases_count} דילים נרכשו</div>
          </div>

          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)' }}>
              <MousePointerClick size={26} />
            </div>
            <div className="adm-analytics-kpi__value">{data.clicks_total}</div>
            <div className="adm-analytics-kpi__label">קליקים (סה"כ)</div>
            <div className="adm-analytics-kpi__sub">מצטבר — כל הדילים הפעילים</div>
          </div>

          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#2563EB', background: 'rgba(37,99,235,0.12)' }}>
              <FileCheck size={26} />
            </div>
            <div className="adm-analytics-kpi__value">{data.deals_active}</div>
            <div className="adm-analytics-kpi__label">דילים פעילים כרגע</div>
            <div className="adm-analytics-kpi__sub">{data.deals_published} פורסמו החודש</div>
          </div>

          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.12)' }}>
              <Users size={26} />
            </div>
            <div className="adm-analytics-kpi__value">{data.agents_new}</div>
            <div className="adm-analytics-kpi__label">סוכנים חדשים החודש</div>
            <div className="adm-analytics-kpi__sub">סה"כ {data.agents_total} סוכנים</div>
          </div>

          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.12)' }}>
              <User size={26} />
            </div>
            <div className="adm-analytics-kpi__value">{data.users_new}</div>
            <div className="adm-analytics-kpi__label">לקוחות חדשים החודש</div>
            <div className="adm-analytics-kpi__sub">סה"כ {data.users_total} לקוחות</div>
          </div>
        </div>
      )}
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

  useEffect(() => {
    loadStatus();
    loadRuns();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleRun() {
    setStarting(true);
    try {
      await adminApi.runEngine(token);
      notify('הריצה החלה — מריץ על אתרי בדיקה מקומיים בלבד');
      pollRef.current = setInterval(async () => {
        const s = await loadStatus();
        if (s && !s.running) {
          clearInterval(pollRef.current);
          loadRuns();
          notify('הריצה הסתיימה ✓');
        }
      }, 2000);
    } catch (err) {
      notify(err.message || 'שגיאה בהפעלת המנוע', 'error');
    } finally {
      setStarting(false);
    }
  }

  const latest = status?.latestRun;

  return (
    <div dir="rtl">
      <div className="adm-quick-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
        <motion.button
          className="adm-row__approve"
          whileTap={{ scale: 0.97 }}
          onClick={handleRun}
          disabled={starting || status?.running}
        >
          <PlayCircle size={16} /> {status?.running ? 'רץ כרגע…' : starting ? 'מפעיל…' : 'הרץ מנוע (dry-run, אתרי בדיקה בלבד)'}
        </motion.button>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          תמיד רץ מול אתרי בדיקה מקומיים — לעולם לא סורק אתרים אמיתיים
        </span>
      </div>

      {latest && (
        <>
          <div className="adm-analytics__grid" style={{ padding: '0 20px' }}>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: '#2563EB', background: 'rgba(37,99,235,0.12)' }}><MapPin size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.domains_discovered}</div>
              <div className="adm-analytics-kpi__label">דומיינים שהתגלו</div>
            </div>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: '#059669', background: 'rgba(5,150,105,0.12)' }}><CheckCircle size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.pages_extracted}</div>
              <div className="adm-analytics-kpi__label">דפים חולצו בהצלחה</div>
              <div className="adm-analytics-kpi__sub">{latest.pages_rejected} נדחו</div>
            </div>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)' }}><Home size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.properties_created}</div>
              <div className="adm-analytics-kpi__label">נכסים חדשים</div>
              <div className="adm-analytics-kpi__sub">{latest.properties_updated} עודכנו</div>
            </div>
            <div className="adm-analytics-kpi">
              <div className="adm-analytics-kpi__icon" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.12)' }}><AlertTriangle size={26} /></div>
              <div className="adm-analytics-kpi__value">{latest.properties_queued_for_review}</div>
              <div className="adm-analytics-kpi__label">ממתינים לאישור (confidence&lt;60)</div>
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
                <strong>ריצה #{r.id} — {r.status === 'completed' ? '✓ הושלמה' : r.status === 'failed' ? '✗ נכשלה' : '⏳ רצה'}</strong>
                <span className="adm-row__date">{new Date(r.started_at).toLocaleString('he-IL')}</span>
                <span>נכסים: {r.properties_created} חדשים, {r.properties_updated} עודכנו · עלות: ${r.llm_cost_usd}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyReviewTab({ token, notify }) {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletePropertyConfirmId, setDeletePropertyConfirmId] = useState(null);

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

  return (
    <div dir="rtl">
      {stats && (
        <div className="adm-analytics__grid" style={{ padding: '16px 20px 0' }}>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#2563EB', background: 'rgba(37,99,235,0.12)' }}><Home size={26} /></div>
            <div className="adm-analytics-kpi__value">{stats.total}</div>
            <div className="adm-analytics-kpi__label">סה"כ נכסים</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#059669', background: 'rgba(5,150,105,0.12)' }}><Bot size={26} /></div>
            <div className="adm-analytics-kpi__value">{stats.autoCollection.totalAuto}</div>
            <div className="adm-analytics-kpi__label">נאספו אוטומטית</div>
            <div className="adm-analytics-kpi__sub">{stats.autoCollection.successRate}% אחוז פרסום</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)' }}><Clock size={26} /></div>
            <div className="adm-analytics-kpi__value">{stats.autoCollection.pendingReview}</div>
            <div className="adm-analytics-kpi__label">ממתינים לאישור</div>
          </div>
          <div className="adm-analytics-kpi">
            <div className="adm-analytics-kpi__icon" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.12)' }}><ShieldCheck size={26} /></div>
            <div className="adm-analytics-kpi__value">{stats.autoCollection.avgConfidence}</div>
            <div className="adm-analytics-kpi__label">confidence ממוצע</div>
          </div>
        </div>
      )}

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>טוען…</p>}

      {!loading && (
        <div className="adm-list">
          {queue.length === 0 && <p className="adm-list__empty">אין נכסים הממתינים לאישור</p>}
          {queue.map((p) => (
            <div key={p.id} className="adm-row">
              <div className="adm-row__info">
                <strong>{p.name}</strong>
                <span>{p.region} · {p.city || '—'} · confidence: {p.confidence}</span>
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="adm-agent-detail__link">
                    <Eye size={12} /> מקור
                  </a>
                )}
                {p.description && <span className="adm-row__meta">{p.description}</span>}
                <span className="adm-row__date">נאסף: {new Date(p.collected_at).toLocaleDateString('he-IL')}</span>
              </div>
              <div className="adm-row__actions">
                <motion.button className="adm-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approve(p.id)}>
                  <CheckCircle size={16} /> אשר ופרסם
                </motion.button>
                <motion.button className="adm-row__reject" whileTap={{ scale: 0.97 }} onClick={() => reject(p.id)}>
                  <XCircle size={16} /> דחה והסתר
                </motion.button>
                {deletePropertyConfirmId === p.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#b91c1c' }}>מחיקה קשיחה — לצמיתות, לא ניתן לשחזור. בטוח?</span>
                    <button className="adm-row__reject" onClick={() => hardDelete(p.id)}>כן, מחק לצמיתות</button>
                    <button onClick={() => setDeletePropertyConfirmId(null)}>ביטול</button>
                  </div>
                ) : (
                  <button
                    className="adm-row__delete"
                    style={{ color: '#b91c1c', borderColor: 'rgba(185,28,28,0.3)' }}
                    onClick={() => setDeletePropertyConfirmId(p.id)}
                  >
                    <Trash2 size={14} /> מחק לצמיתות
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminPage() {
  const [token, setToken] = useState(() => adminApi.getToken());
  const [tab, setTab] = useState('pending-agents');
  const [pendingAgents, setPendingAgents] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [approvedDeals, setApprovedDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [notification, setNotification] = useState(null);
  const [agentsPage, setAgentsPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
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
      const [{ agents: pending }, { agents: all }, { deals: aDeals }, usersRes, contactRes] = await Promise.all([
        adminApi.getPendingAgents(token),
        adminApi.getAllAgents(token),
        adminApi.getApprovedDeals(token),
        adminApi.getUsers(token).catch(() => ({ users: [] })),
        fetch('/api/contact', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ submissions: [] })),
      ]);
      setPendingAgents(pending || []);
      setAllAgents(all || []);
      setApprovedDeals(aDeals || []);
      setAllUsers(usersRes?.users || []);
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

  async function deleteDeal(id) {
    try {
      await adminApi.deleteDeal(token, id);
      notify('הדיל נמחק');
      setApprovedDeals(prev => prev.filter(d => d.id !== id));
      setDeleteConfirmId(null);
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

  const filteredDeals = searchQ
    ? approvedDeals.filter(d =>
        (d.destination_name || d.destination || '').toLowerCase().includes(searchQ) ||
        (d.business_name || '').toLowerCase().includes(searchQ)
      )
    : approvedDeals;

  const totalAgentsPages = Math.ceil(filteredAgents.length / AGENTS_PER_PAGE);
  const pagedAgents = filteredAgents.slice((agentsPage - 1) * AGENTS_PER_PAGE, agentsPage * AGENTS_PER_PAGE);

  function statusLabel(s) {
    if (s === 'approved') return { label: 'מאושר', cls: 'adm-status--approved' };
    if (s === 'rejected') return { label: 'נדחה', cls: 'adm-status--rejected' };
    return { label: 'ממתין', cls: 'adm-status--pending' };
  }

  const showSearch = tab === 'all-agents' || tab === 'active-deals' || tab === 'users';

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
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <span className="adm-kpi__value">{pendingAgents.length}</span>
          <span className="adm-kpi__label">סוכנים ממתינים</span>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>
            <Users size={22} />
          </div>
          <span className="adm-kpi__value">{allAgents.length}</span>
          <span className="adm-kpi__label">סה"כ סוכנים</span>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}>
            <FileCheck size={22} />
          </div>
          <span className="adm-kpi__value">{approvedDeals.length}</span>
          <span className="adm-kpi__label">דילים פעילים</span>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__icon-box" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
            <User size={22} />
          </div>
          <span className="adm-kpi__value">{allUsers.length}</span>
          <span className="adm-kpi__label">לקוחות רשומים</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="adm-tabs">
        <button className={`adm-tabs__btn${tab === 'pending-agents' ? ' is-active' : ''}`} onClick={() => setTab('pending-agents')}>
          סוכנים ממתינים {pendingAgents.length > 0 && <span className="adm-tabs__badge">{pendingAgents.length}</span>}
        </button>
        <button className={`adm-tabs__btn${tab === 'all-agents' ? ' is-active' : ''}`} onClick={() => setTab('all-agents')}>
          כל הסוכנים <span className="adm-tabs__badge adm-tabs__badge--neutral">{allAgents.length}</span>
        </button>
        <button className={`adm-tabs__btn${tab === 'active-deals' ? ' is-active' : ''}`} onClick={() => setTab('active-deals')}>
          דילים פעילים <span className="adm-tabs__badge adm-tabs__badge--neutral">{approvedDeals.length}</span>
        </button>
        <button className={`adm-tabs__btn${tab === 'users' ? ' is-active' : ''}`} onClick={() => setTab('users')}>
          <User size={14} /> לקוחות <span className="adm-tabs__badge adm-tabs__badge--neutral">{allUsers.length}</span>
        </button>
        <button className={`adm-tabs__btn${tab === 'analytics' ? ' is-active' : ''}`} onClick={() => setTab('analytics')}>
          <BarChart3 size={14} /> נתונים
        </button>
        <button className={`adm-tabs__btn${tab === 'contact' ? ' is-active' : ''}`} onClick={() => setTab('contact')}>
          📬 פניות הציבור {contactSubmissions.filter(s => !s.is_read).length > 0 && (
            <span className="adm-tabs__badge">{contactSubmissions.filter(s => !s.is_read).length}</span>
          )}
        </button>
        <button className={`adm-tabs__btn${tab === 'property-review' ? ' is-active' : ''}`} onClick={() => setTab('property-review')}>
          <ShieldCheck size={14} /> נכסים לאישור
        </button>
        <button className={`adm-tabs__btn${tab === 'engine' ? ' is-active' : ''}`} onClick={() => setTab('engine')}>
          <Bot size={14} /> מנוע איסוף
        </button>
      </div>

      {/* Search bar — visible on agents / deals tabs */}
      {showSearch && (
        <div className="adm-search-bar">
          <Search size={15} className="adm-search-bar__icon" />
          <input
            className="adm-search-bar__input"
            type="text"
            placeholder={tab === 'all-agents' ? 'חיפוש סוכן לפי שם / אימייל…' : 'חיפוש דיל לפי יעד / סוכן…'}
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
            return list.map(u => (
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
            ));
          })()}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && <AnalyticsTab token={token} />}

      {/* Property review queue (auto-collected, confidence < 60) */}
      {tab === 'property-review' && <PropertyReviewTab token={token} notify={notify} />}

      {/* Collection engine (Step 3/4) */}
      {tab === 'engine' && <EngineTab token={token} notify={notify} />}

      {/* Contact Submissions */}
      {tab === 'contact' && (
        <div className="adm-list" dir="rtl">
          {contactSubmissions.length === 0 && <p className="adm-list__empty">אין פניות עדיין</p>}
          {contactSubmissions.map(sub => (
            <div key={sub.id} className={`adm-row${sub.is_read ? ' adm-row--read' : ''}`}>
              <div className="adm-row__info">
                <strong>{sub.name}</strong>
                <span>{sub.email}{sub.phone ? ` · ${sub.phone}` : ''}</span>
                <span className="adm-row__meta" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#1e293b', marginTop: 4 }}>{sub.message}</span>
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
        </div>
      )}

      {/* Pending agents */}
      {!loading && tab === 'pending-agents' && (
        <div className="adm-list">
          {pendingAgents.length === 0 && <p className="adm-list__empty">אין סוכנים ממתינים</p>}
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

      {/* All agents */}
      {!loading && tab === 'all-agents' && (
        <div className="adm-list">
          {filteredAgents.length === 0 && <p className="adm-list__empty">{searchQ ? 'לא נמצאו תוצאות' : 'אין סוכנים'}</p>}
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
                      <div className="adm-agent-detail__row" style={{ marginTop: 8, borderTop: '1px solid rgba(185,28,28,0.15)', paddingTop: 8 }}>
                        {deleteAgentConfirmId === agent.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', color: '#b91c1c' }}>למחוק את כל הנתונים של הסוכן?</span>
                            <button className="adm-row__reject" onClick={() => deleteAgent(agent.id)}>כן, מחק</button>
                            <button onClick={() => setDeleteAgentConfirmId(null)}>ביטול</button>
                          </div>
                        ) : (
                          <button
                            className="adm-row__delete"
                            style={{ color: '#b91c1c', borderColor: 'rgba(185,28,28,0.3)' }}
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

      {/* Active deals */}
      {!loading && tab === 'active-deals' && (
        <div className="adm-list">
          {filteredDeals.length === 0 && <p className="adm-list__empty">{searchQ ? 'לא נמצאו תוצאות' : 'אין דילים פעילים'}</p>}
          {filteredDeals.map(deal => (
            <div key={deal.id} className="adm-row">
              <DealPreview deal={deal} />
              <div className="adm-row__actions">
                {deleteConfirmId === deal.id ? (
                  <>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>למחוק?</span>
                    <button className="adm-row__reject" onClick={() => deleteDeal(deal.id)}>כן, מחק</button>
                    <button onClick={() => setDeleteConfirmId(null)}>ביטול</button>
                  </>
                ) : (
                  <motion.button className="adm-row__delete" whileTap={{ scale: 0.97 }} onClick={() => setDeleteConfirmId(deal.id)}>
                    <Trash2 size={14} /> מחק
                  </motion.button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
