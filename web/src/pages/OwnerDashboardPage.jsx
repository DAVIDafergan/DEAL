import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import {
  PlusCircle, Settings, LogOut, CheckCircle, AlertTriangle, MessageCircle,
  LayoutDashboard, Trash2, Home, Pencil, MapPin, CalendarDays, ClipboardList, Check, X, Users, Calendar,
} from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi, propertyApi } from '../api/client.js';
import { PropertyWizard } from '../components/property/PropertyWizard.jsx';
import { AvailabilityCalendar } from '../components/property/AvailabilityCalendar.jsx';
import { DeletePropertyModal } from '../components/property/DeletePropertyModal.jsx';
import { PropertyTrashPanel } from '../components/property/PropertyTrashPanel.jsx';
import { DashListSkeleton } from '../components/DashListSkeleton.jsx';
import { OwnerProfileProgress } from '../components/OwnerProfileProgress.jsx';
import { RouteLoading } from '../components/RouteLoading.jsx';
import { getGreeting } from '../utils/greeting.js';
import { regionLabel, propertyTypeLabel } from '../data/propertyOptions.js';
import { optimizedImageUrl } from '../utils/imageUrl.js';

function buildWhatsAppUrl(phone, customerName, propertyName) {
  const text = `שלום ${customerName}, בנוגע לבקשת ההזמנה שלך ל${propertyName} ב-Dealim`;
  let clean = (phone || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 10) clean = '972' + clean.slice(1);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

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
  const [properties, setProperties] = useState([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const [pendingByProperty, setPendingByProperty] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [availabilityProperty, setAvailabilityProperty] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [propertyDeleting, setPropertyDeleting] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    if (!loading && !token) navigate('/owner/login', { replace: true });
  }, [loading, token, navigate]);

  function refreshProperties() {
    if (!token) return;
    propertyApi.getMine(token)
      .then(({ properties: p }) => setProperties(p || []))
      .catch(() => setProperties([]))
      .finally(() => setPropsLoading(false));
  }

  function refreshBookingRequests() {
    if (!token) return;
    propertyApi.getMyBookingRequests(token)
      .then(({ requests }) => {
        const pending = (requests || []).filter((r) => r.status === 'pending');
        setPendingBookingCount(pending.length);
        setPendingRequests(pending);
        const byProperty = {};
        for (const r of pending) byProperty[r.property_id] = (byProperty[r.property_id] || 0) + 1;
        setPendingByProperty(byProperty);
      })
      .catch(() => {});
  }

  useEffect(() => {
    refreshProperties();
    refreshBookingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleRequestStatus(bookingId, status) {
    setUpdatingRequestId(bookingId);
    try {
      await propertyApi.setBookingRequestStatus(token, bookingId, status);
      setPendingRequests((prev) => prev.filter((r) => r.id !== bookingId));
      setPendingBookingCount((prev) => Math.max(0, prev - 1));
    } finally {
      setUpdatingRequestId(null);
    }
  }

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
            pendingBookingCount={pendingByProperty[deletingProperty.id] || 0}
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

      <OwnerProfileProgress agent={agent} properties={properties} />

      <div id="onb-kpis" className="dash-kpis container">
        <KpiCard icon={Home} label="נכסים" value={properties.length} iconColor="var(--ds-hearth)" iconBg="rgba(193,89,43,0.12)" index={0} />
        <KpiCard icon={CheckCircle} label="פעילים" value={activeCount} iconColor="var(--ds-olive)" iconBg="rgba(91,107,78,0.12)" index={1} />
        {draftCount > 0 && (
          <KpiCard icon={Pencil} label="טיוטות" value={draftCount} iconColor="var(--ds-ash)" iconBg="var(--ds-slate)" index={2} />
        )}
        {pendingBookingCount > 0 && (
          <KpiCard icon={ClipboardList} label="בקשות הזמנה חדשות" value={pendingBookingCount} iconColor="var(--ds-wine)" iconBg="rgba(140,47,57,0.12)" index={3} />
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div className="dash-urgent container">
          <h3 className="dash-section-title dash-section-title--urgent">
            <ClipboardList size={16} /> בקשות הזמנה שדורשות טיפול ({pendingRequests.length})
          </h3>
          <div className="dash-deals-list">
            {pendingRequests.slice(0, 3).map((r) => (
              <motion.div key={r.id} className="dash-deal-card dash-deal-card--pending" layout>
                <div className="dash-deal-card__body">
                  <div className="dash-deal-card__dest">{r.property_name}{r.unit_name && r.unit_name !== r.property_name ? ` — ${r.unit_name}` : ''}</div>
                  <div className="dash-deal-card__meta">
                    <span><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {String(r.check_in).slice(0, 10)} – {String(r.check_out).slice(0, 10)}</span>
                    <span><Users size={12} style={{ verticalAlign: 'middle' }} /> {r.guest_count} אורחים</span>
                  </div>
                  <div className="dash-deal-card__meta"><span>{r.customer_name} · {r.customer_phone}</span></div>
                </div>
                <div className="dash-deal-card__right">
                  <a className="dash-deal-edit" href={buildWhatsAppUrl(r.customer_phone, r.customer_name, r.property_name)} target="_blank" rel="noopener noreferrer" title="וואטסאפ ללקוח">
                    <MessageCircle size={14} />
                    <span className="dash-deal-btn-label">וואטסאפ</span>
                  </a>
                  <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} disabled={updatingRequestId === r.id} onClick={() => handleRequestStatus(r.id, 'approved')} title="אשר">
                    <Check size={14} />
                    <span className="dash-deal-btn-label">אשר</span>
                  </motion.button>
                  <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} disabled={updatingRequestId === r.id} onClick={() => handleRequestStatus(r.id, 'rejected')} title="דחה">
                    <X size={14} />
                    <span className="dash-deal-btn-label">דחה</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
          {pendingRequests.length > 3 && (
            <Link to="/owner/dashboard/bookings" className="dash-urgent__more">כל {pendingRequests.length} הבקשות ←</Link>
          )}
        </div>
      )}

      <div className="dash-quick-actions container">
        <h3 className="dash-section-title">פעולות מהירות</h3>
        <div className="dash-quick-row">
          <motion.button className="dash-quick-pill dash-quick-pill--primary" whileTap={{ scale: 0.97 }} onClick={() => setShowWizard(true)}>
            <span className="dash-quick-pill__dot"><PlusCircle size={15} /></span>
            הוסף נכס
          </motion.button>
          <Link to="/owner/dashboard/bookings" className="dash-quick-pill">
            <span className="dash-quick-pill__dot"><ClipboardList size={15} /></span>
            בקשות הזמנה
            {pendingBookingCount > 0 && <span className="dash-tab__badge">{pendingBookingCount}</span>}
          </Link>
          {agent?.slug && (
            <Link to={`/owner/${agent.slug}`} className="dash-quick-pill">
              <span className="dash-quick-pill__dot"><LayoutDashboard size={15} /></span>
              פרופיל ציבורי
            </Link>
          )}
          <Link to="/owner/dashboard/settings" className="dash-quick-pill">
            <span className="dash-quick-pill__dot"><Settings size={15} /></span>
            הגדרות
          </Link>
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
                <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setEditingProperty(property); }} title={property.status === 'draft' ? 'השלימו את הפרסום' : 'ערוך נכס'}>
                  <Pencil size={14} />
                  <span className="dash-deal-btn-label">{property.status === 'draft' ? 'השלם פרסום' : 'ערוך'}</span>
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
    </div>
  );
}
