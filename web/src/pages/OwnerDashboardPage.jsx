import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import {
  PlusCircle, Settings, LogOut, CheckCircle, AlertTriangle, MessageCircle,
  LayoutDashboard, Trash2, Home, Pencil, MapPin, CalendarDays, Eye, BarChart3, Copy, LayoutGrid, Zap,
} from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi, propertyApi } from '../api/client.js';
import { PropertyWizard } from '../components/property/PropertyWizard.jsx';
import { AvailabilityCalendar } from '../components/property/AvailabilityCalendar.jsx';
import { DeletePropertyModal } from '../components/property/DeletePropertyModal.jsx';
import { PropertyTrashPanel } from '../components/property/PropertyTrashPanel.jsx';
import { BulkPriceEditor } from '../components/property/BulkPriceEditor.jsx';
import { DashListSkeleton } from '../components/DashListSkeleton.jsx';
import { OwnerDashboardTips } from '../components/OwnerDashboardTips.jsx';
import { RouteLoading } from '../components/RouteLoading.jsx';
import { OwnerSettingsPanel } from './OwnerSettingsPage.jsx';
import { PropertyStatsPanel } from './PropertyStatsPage.jsx';
import { getGreeting } from '../utils/greeting.js';
import { regionLabel, propertyTypeLabel } from '../data/propertyOptions.js';
import { optimizedImageUrl } from '../utils/imageUrl.js';

const TABS = [
  { key: 'overview', label: 'סקירה כללית', icon: LayoutGrid },
  { key: 'stats', label: 'סטטיסטיקה', icon: BarChart3 },
  { key: 'settings', label: 'הגדרות', icon: Settings },
];

const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

function KpiCard({ icon: Icon, label, value, iconColor, iconBg, index }) {
  return (
    <motion.div className="dash-kpi" custom={index} variants={cardAnim} initial="hidden" animate="visible">
      <div className="dash-kpi__icon-box" style={{ background: iconBg, color: iconColor }}>
        <Icon size={24} />
      </div>
      <div className="dash-kpi__value">{value}</div>
      <div className="dash-kpi__label">{label}</div>
    </motion.div>
  );
}

/** OwnerDashboardPage — same dash-* shell as AgentDashboardPage; properties instead of flight deals. */
export function OwnerDashboardPage() {
  const { token, agent, loading, logout } = useAgentAuth();
  const navigate = useNavigate();
  // 11.2: tabs live in the URL (?tab=...) instead of component state so the consolidated
  // dashboard — KPIs/properties/stats/settings, previously three separate routes — survives a
  // full page refresh on whichever tab the owner was on (see DECISIONS.md 11.2).
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const statsPropertyId = searchParams.get('property');
  const [properties, setProperties] = useState([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [eventSummary, setEventSummary] = useState({});
  const [notification, setNotification] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [availabilityProperty, setAvailabilityProperty] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [propertyDeleting, setPropertyDeleting] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showBulkPricing, setShowBulkPricing] = useState(false);

  useEffect(() => {
    if (!loading && !token) navigate('/owner/login', { replace: true });
  }, [loading, token, navigate]);

  function refreshProperties() {
    if (!token) return;
    propertyApi.getMine(token)
      .then(({ properties: p }) => setProperties(p || []))
      .catch(() => setProperties([]))
      .finally(() => setPropsLoading(false));
    propertyApi.getMineEventSummary(token)
      .then(({ summary }) => setEventSummary(summary || {}))
      .catch(() => {});
  }

  useEffect(() => {
    refreshProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  function handlePropertyAdded() {
    setShowWizard(false);
    notify('הנכס נוסף בהצלחה!');
    refreshProperties();
  }

  function handlePropertyEdited() {
    setEditingProperty(null);
    notify('הנכס עודכן בהצלחה');
    refreshProperties();
  }

  async function handleDeleteProperty() {
    if (!deletingProperty) return;
    setPropertyDeleting(true);
    try {
      await propertyApi.delete(token, deletingProperty.id);
      notify('הנכס נמחק — אפשר לשחזר תוך 30 יום מפח המיחזור');
      setDeletingProperty(null);
      refreshProperties();
    } catch (err) {
      notify(err.message || 'שגיאה במחיקת הנכס', 'error');
    } finally {
      setPropertyDeleting(false);
    }
  }

  async function handleDuplicateProperty(propertyId) {
    try {
      await propertyApi.duplicate(token, propertyId);
      notify('הנכס שוכפל כטיוטה — השלימו את הפרסום כשנוח');
      refreshProperties();
    } catch (err) {
      notify(err.message || 'שגיאה בשכפול הנכס', 'error');
    }
  }

  // 11.2: "one-tap availability update" — toggle *today* open/blocked straight from the property
  // card, no calendar modal. Two API calls (read today's current state, then flip it) but only
  // one tap from the owner's side; togglingId drives a per-card loading state so a slow network
  // can't make a double-tap send two conflicting writes.
  const [togglingAvailabilityId, setTogglingAvailabilityId] = useState(null);
  async function handleToggleTodayAvailability(property) {
    setTogglingAvailabilityId(property.id);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const { availability } = await propertyApi.getAvailability(property.id, { from: todayStr, to: tomorrowStr });
      const todayRow = availability.find((row) => row.date.slice(0, 10) === todayStr);
      const currentlyAvailable = todayRow ? Boolean(todayRow.is_available) : true;
      await propertyApi.setAvailability(token, property.id, [{ date: todayStr, is_available: !currentlyAvailable }]);
      notify(currentlyAvailable ? 'הנכס סומן כתפוס להיום' : 'הנכס סומן כפנוי להיום');
    } catch (err) {
      notify(err.message || 'שגיאה בעדכון הזמינות', 'error');
    } finally {
      setTogglingAvailabilityId(null);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await agentApi.deleteMe(token);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      notify(err.message || 'שגיאה במחיקת החשבון', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const activeCount = properties.filter((p) => p.status === 'claimed' || p.status === 'active').length;
  const draftCount = properties.filter((p) => p.status === 'draft').length;
  const greeting = getGreeting(agent?.business_name || agent?.contact_name || '');

  if (loading) return <RouteLoading />;

  return (
    <div className="dash-page" dir="rtl">
      <AnimatePresence>
        {showWizard && (
          <motion.div className="dash-wizard-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dash-wizard-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
              <PropertyWizard onSuccess={handlePropertyAdded} onCancel={() => setShowWizard(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProperty && (
          <motion.div className="dash-wizard-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="dash-wizard-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
              <PropertyWizard initialData={editingProperty} propertyId={editingProperty.id} onSuccess={handlePropertyEdited} onCancel={() => setEditingProperty(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {availabilityProperty && (
          <motion.div
            className="dash-wizard-overlay"
            style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAvailabilityProperty(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AvailabilityCalendar propertyId={availabilityProperty.id} token={token} onClose={() => setAvailabilityProperty(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingProperty && (
          <DeletePropertyModal
            property={deletingProperty}
            deleting={propertyDeleting}
            onConfirm={handleDeleteProperty}
            onCancel={() => setDeletingProperty(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrash && (
          <PropertyTrashPanel token={token} onClose={() => setShowTrash(false)} onRestored={refreshProperties} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkPricing && (
          <BulkPriceEditor token={token} properties={properties} onClose={() => setShowBulkPricing(false)} onSaved={refreshProperties} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div className={`dash-toast dash-toast--${notification.type}`} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dash-page-header container">
        <div className="dash-page-header__top">
          <div>
            <p className="dash-greeting">{greeting}</p>
            <h1 className="dash-page-title">דשבורד בעל צימר</h1>
          </div>
        </div>
      </div>

      {/* 11.2: everything (KPIs, properties, per-property stats, account settings, password,
          logout, delete account) lives on this one route now, switched via tabs — not separate
          page routes. Scrollable on mobile so the row never wraps/overflows a narrow screen. */}
      <div className="dash-tabs container" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={`dash-tab-btn${activeTab === key ? ' is-active' : ''}`}
            onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', key); if (key !== 'stats') n.delete('property'); return n; })}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && <OwnerSettingsPanel />}

      {activeTab === 'stats' && (
        <div className="container">
          <div className="dash-stats-property-picker">
            <label className="settings-field__label" htmlFor="dash-stats-property">בחרו נכס</label>
            <select
              id="dash-stats-property"
              className="settings-field__input"
              value={statsPropertyId || ''}
              onChange={(e) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', 'stats'); n.set('property', e.target.value); return n; })}
            >
              <option value="" disabled>בחרו נכס לצפייה בסטטיסטיקה</option>
              {properties.filter((p) => p.status !== 'draft').map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {statsPropertyId
            ? <PropertyStatsPanel propertyId={statsPropertyId} token={token} />
            : <p className="agent-form__hint">בחרו נכס למעלה כדי לראות את הסטטיסטיקה שלו.</p>}
        </div>
      )}

      {activeTab === 'overview' && (
      <>
      <OwnerDashboardTips agent={agent} properties={properties} />

      <div id="onb-kpis" className="dash-kpis container">
        <KpiCard icon={Home} label="נכסים" value={properties.length} iconColor="var(--ds-hearth)" iconBg="rgba(193,89,43,0.12)" index={0} />
        <KpiCard icon={CheckCircle} label="פעילים" value={activeCount} iconColor="var(--ds-olive)" iconBg="rgba(91,107,78,0.12)" index={1} />
        {draftCount > 0 && (
          <KpiCard icon={Pencil} label="טיוטות" value={draftCount} iconColor="var(--ds-ash)" iconBg="var(--ds-slate)" index={2} />
        )}
      </div>

      <div className="dash-quick-actions container">
        <h3 className="dash-section-title">פעולות מהירות</h3>
        <div className="dash-quick-row">
          <motion.button className="dash-quick-pill dash-quick-pill--primary" whileTap={{ scale: 0.97 }} onClick={() => setShowWizard(true)}>
            <span className="dash-quick-pill__dot"><PlusCircle size={15} /></span>
            הוסף נכס
          </motion.button>
          {agent?.slug && (
            <Link to={`/owner/${agent.slug}`} className="dash-quick-pill">
              <span className="dash-quick-pill__dot"><LayoutDashboard size={15} /></span>
              פרופיל ציבורי
            </Link>
          )}
          <motion.button className="dash-quick-pill" whileTap={{ scale: 0.97 }} onClick={() => setShowBulkPricing(true)}>
            <span className="dash-quick-pill__dot"><Zap size={15} /></span>
            עריכת מחירים בכמות
          </motion.button>
          <motion.button className="dash-quick-pill" whileTap={{ scale: 0.97 }} onClick={() => setShowTrash(true)}>
            <span className="dash-quick-pill__dot"><Trash2 size={15} /></span>
            פח מיחזור
          </motion.button>
          <motion.button className="dash-quick-pill dash-quick-pill--ghost" whileTap={{ scale: 0.97 }} onClick={() => { logout(); navigate('/'); }}>
            <span className="dash-quick-pill__dot"><LogOut size={15} /></span>
            התנתקות
          </motion.button>
          <motion.button className="dash-quick-pill dash-quick-pill--danger" whileTap={{ scale: 0.97 }} onClick={() => setConfirmDelete(true)}>
            <span className="dash-quick-pill__dot"><Trash2 size={15} /></span>
            מחיקת חשבון
          </motion.button>
        </div>

        <AnimatePresence>
          {confirmDelete && (
            <motion.div className="dash-delete-confirm" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <AlertTriangle size={18} className="dash-delete-confirm__icon" />
              <span className="dash-delete-confirm__msg">כל הנכסים והנתונים יימחקו לצמיתות. אי אפשר לשחזר.</span>
              <div className="dash-delete-confirm__btns">
                <button className="dash-delete-confirm__btn dash-delete-confirm__btn--cancel" onClick={() => setConfirmDelete(false)} disabled={deleting}>ביטול</button>
                <button className="dash-delete-confirm__btn dash-delete-confirm__btn--confirm" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? 'מוחק…' : 'מחק לצמיתות'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div id="onb-deals-list" className="dash-deals-panel container">
        <div className="dash-deals-header">
          <h3 className="dash-section-title" style={{ margin: 0 }}>
            הנכסים שלי
            {properties.length > 0 && <span className="dash-tab__badge" style={{ marginRight: 8 }}>{properties.length}</span>}
          </h3>
        </div>

        {propsLoading && <DashListSkeleton />}
        {!propsLoading && properties.length === 0 && (
          <div className="dash-empty-state">
            <PlusCircle size={40} strokeWidth={1.2} />
            <p>אין עדיין נכסים. לחצו 'הוסף נכס' כדי להתחיל.</p>
          </div>
        )}

        <div className="dash-deals-list">
          {properties.map((property, i) => (
            <motion.div
              key={property.id}
              className={`dash-deal-card dash-deal-card--${property.status === 'draft' ? 'draft' : property.status === 'active' ? 'approved' : 'pending'}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              {property.owner_images?.[0] && (
                <img src={optimizedImageUrl(property.owner_images[0], { width: 320 })} alt="" className="dash-deal-card__img" loading="lazy" />
              )}
              <div className="dash-deal-card__body">
                <div className="dash-deal-card__dest">{property.name}</div>
                <div className="dash-deal-card__meta">
                  <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {regionLabel(property.region)}{property.city ? ` · ${property.city}` : ''}</span>
                  <span>{propertyTypeLabel(property.property_type)}</span>
                </div>
                <div className="dash-deal-card__price">
                  {property.price_from ? `החל מ-${Math.round(property.price_from)} ${property.currency} / לילה` : 'ללא מחיר בסיס'}
                </div>
                {property.status !== 'draft' && (
                  <div className="dash-deal-card__stats">
                    <span title="צפיות ב-30 הימים האחרונים"><Eye size={12} /> {eventSummary[property.id]?.views || 0}</span>
                    <span title="קליקים לוואטסאפ ב-30 הימים האחרונים"><MessageCircle size={12} /> {eventSummary[property.id]?.whatsappClicks || 0}</span>
                    <button
                      type="button"
                      className="dash-deal-card__stats-link"
                      onClick={(e) => { e.stopPropagation(); setSearchParams({ tab: 'stats', property: String(property.id) }); }}
                    >
                      <BarChart3 size={12} /> סטטיסטיקה מלאה
                    </button>
                  </div>
                )}
              </div>
              <div className="dash-deal-card__right">
                <span className={`dash-deal-status dash-deal-status--${property.status === 'draft' ? 'draft' : property.status === 'active' ? 'approved' : 'pending'}`}>
                  <CheckCircle size={13} /> {property.status === 'draft' ? 'טיוטה' : property.status === 'active' ? 'פעיל' : property.status === 'claimed' ? 'מאומת' : property.status}
                </span>
                {property.whatsapp && <span className="dash-deal-wa"><MessageCircle size={12} /></span>}
                {property.status !== 'draft' && (
                  <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setAvailabilityProperty(property); }} title="לוח זמינות">
                    <CalendarDays size={14} />
                    <span className="dash-deal-btn-label">זמינות</span>
                  </motion.button>
                )}
                {property.status !== 'draft' && (
                  <motion.button
                    className="dash-deal-edit"
                    whileTap={{ scale: 0.9 }}
                    disabled={togglingAvailabilityId === property.id}
                    onClick={(e) => { e.stopPropagation(); handleToggleTodayAvailability(property); }}
                    title="עדכון זמינות היום בלחיצה אחת"
                  >
                    <Zap size={14} />
                    <span className="dash-deal-btn-label">{togglingAvailabilityId === property.id ? '…' : 'החלף היום'}</span>
                  </motion.button>
                )}
                <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setEditingProperty(property); }} title={property.status === 'draft' ? 'השלימו את הפרסום' : 'ערוך נכס'}>
                  <Pencil size={14} />
                  <span className="dash-deal-btn-label">{property.status === 'draft' ? 'השלם פרסום' : 'ערוך'}</span>
                </motion.button>
                <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleDuplicateProperty(property.id); }} title="שכפל נכס">
                  <Copy size={14} />
                  <span className="dash-deal-btn-label">שכפל</span>
                </motion.button>
                <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} style={{ color: '#dc2626' }} onClick={(e) => { e.stopPropagation(); setDeletingProperty(property); }} title="מחק נכס">
                  <Trash2 size={14} />
                  <span className="dash-deal-btn-label">מחק</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
