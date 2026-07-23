import { useRef, useState } from 'react';
import { ChevronDown, Copy, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { propertyApi } from '../../api/client.js';
import { UNIT_AMENITIES, BED_TYPES, bedTypeLabel, suggestCapacity, bedConfigSummary } from '../../data/propertyOptions.js';
import { PropertyPhotoUploader } from './PropertyPhotoUploader.jsx';

/** BedConfigEditor — 11.6: replaces the old plain "beds" count with a real breakdown (bed type +
 * quantity, add/remove rows). Feeds suggestCapacity() below for the auto-calculated guest
 * capacity hint next to max_guests. */
function BedConfigEditor({ bedConfig, onChange }) {
  const config = Array.isArray(bedConfig) ? bedConfig : [];
  const usedTypes = new Set(config.map((r) => r.type));
  const availableTypes = BED_TYPES.filter((b) => !usedTypes.has(b.value));
  const [addType, setAddType] = useState(availableTypes[0]?.value || '');

  function updateQty(type, qty) {
    onChange(config.map((r) => (r.type === type ? { ...r, qty: Math.max(0, Number(qty) || 0) } : r)));
  }
  function removeType(type) {
    onChange(config.filter((r) => r.type !== type));
  }
  function addRow() {
    const nextAvailable = BED_TYPES.filter((b) => !usedTypes.has(b.value) && b.value !== addType);
    if (!addType) return;
    onChange([...config, { type: addType, qty: 1 }]);
    setAddType(nextAvailable[0]?.value || '');
  }

  return (
    <div className="bed-config">
      {config.map((row) => (
        <div key={row.type} className="bed-config__row">
          <span className="bed-config__label">{bedTypeLabel(row.type)}</span>
          <input
            type="number" min="0" className="wizard-input bed-config__qty"
            value={row.qty} onChange={(e) => updateQty(row.type, e.target.value)}
          />
          <button type="button" className="wus__unit-icon-btn wus__unit-icon-btn--danger" onClick={() => removeType(row.type)} aria-label="הסר סוג מיטה">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {availableTypes.length > 0 && (
        <div className="bed-config__add-row">
          <select className="wizard-input" value={addType} onChange={(e) => setAddType(e.target.value)}>
            {availableTypes.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <button type="button" className="wus__add-btn" onClick={addRow}><Plus size={14} /> הוסף סוג מיטה</button>
        </div>
      )}
    </div>
  );
}

function UnitEditor({ unit, onSave, propertyId }) {
  function set(key) {
    return (e) => onSave({ ...unit, [key]: e.target.value });
  }
  function toggleAmenity(value) {
    const current = unit.unit_amenities || [];
    const next = current.includes(value) ? current.filter((a) => a !== value) : [...current, value];
    onSave({ ...unit, unit_amenities: next });
  }

  const suggestedCapacity = suggestCapacity(unit.bed_config);

  function setBedConfig(nextConfig) {
    // Auto-fills max_guests from the bed breakdown the first time it's set — never overwrites a
    // value the owner already typed in manually (that's the "manual override" the spec asks for).
    const patch = { ...unit, bed_config: nextConfig };
    if (!unit.max_guests) patch.max_guests = suggestCapacity(nextConfig) || '';
    onSave(patch);
  }

  return (
    <div className="wus__unit-body">
      <div className="wizard-field">
        <label className="wizard-label">שם היחידה</label>
        <input className="wizard-input" value={unit.name || ''} onChange={set('name')} placeholder="למשל: סוויטת הגפן" />
      </div>
      <div className="wizard-grid-2">
        <div className="wizard-field">
          <label className="wizard-label">מספר אורחים</label>
          <input className="wizard-input" type="number" min="1" value={unit.max_guests || ''} onChange={set('max_guests')} />
          {suggestedCapacity > 0 && Number(unit.max_guests) !== suggestedCapacity && (
            <button type="button" className="bed-config__suggest" onClick={() => onSave({ ...unit, max_guests: suggestedCapacity })}>
              מומלץ לפי המיטות: {suggestedCapacity} אורחים — החל
            </button>
          )}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">חדרי שינה</label>
          <input className="wizard-input" type="number" min="0" value={unit.bedrooms || ''} onChange={set('bedrooms')} />
        </div>
      </div>
      <div className="wizard-field">
        <label className="wizard-label">מיטות</label>
        <BedConfigEditor bedConfig={unit.bed_config} onChange={setBedConfig} />
      </div>
      <div className="wizard-field">
        <label className="wizard-label">חדרי רחצה</label>
        <input className="wizard-input" type="number" min="0" value={unit.bathrooms || ''} onChange={set('bathrooms')} />
      </div>
      <div className="wizard-grid-2">
        <div className="wizard-field">
          <label className="wizard-label">מחיר בסיס ללילה</label>
          <input className="wizard-input" type="number" min="0" value={unit.base_price_night || ''} onChange={set('base_price_night')} />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">מחיר סופ"ש</label>
          <input className="wizard-input" type="number" min="0" value={unit.weekend_price || ''} onChange={set('weekend_price')} />
        </div>
      </div>
      <div className="wizard-field">
        <label className="wizard-label">תיאור היחידה (אופציונלי)</label>
        <textarea className="wizard-input wizard-input--textarea" rows={2} value={unit.description || ''} onChange={set('description')} />
      </div>
      <div className="wizard-checkboxes">
        {UNIT_AMENITIES.map((a) => (
          <label key={a.value} className="wizard-checkbox">
            <input type="checkbox" checked={(unit.unit_amenities || []).includes(a.value)} onChange={() => toggleAmenity(a.value)} />
            {a.label}
          </label>
        ))}
      </div>
      <PropertyPhotoUploader
        images={unit.images || []}
        onChange={(images) => onSave({ ...unit, images })}
        label="תמונות היחידה"
        minRequired={1}
        maxImages={10}
        propertyId={propertyId}
        unitId={unit.id}
      />
    </div>
  );
}

/**
 * PropertyUnitsStep — 7.3/7.4 "שלב יחידות במתחם": הוספה/עריכה/מחיקה/שכפול, שינוי סדר. Every
 * change is written straight through to the server (units already belong to a real, created
 * draft property by the time this step is reachable) rather than batched, so a browser refresh
 * mid-edit never loses more than the field being typed.
 */
export function PropertyUnitsStep({ propertyId, units, onUnitsChange }) {
  const { token } = useAgentAuth();
  const [openId, setOpenId] = useState(units[0]?.id ?? null);
  const [savingId, setSavingId] = useState(null);
  const saveTimers = useRef({});

  async function handleAdd() {
    const { unit } = await propertyApi.createUnit(token, propertyId, { name: `יחידה ${units.length + 1}` });
    onUnitsChange((cur) => [...cur, unit]);
    setOpenId(unit.id);
  }

  // Reflects every keystroke locally (so the summary line stays live), but only actually persists
  // to the server ~600ms after the owner stops typing — matches per-field text inputs elsewhere;
  // toggles (amenities, images) still go through the same path but settle immediately since
  // there's no rapid-fire typing to debounce there.
  function handleSave(updated) {
    onUnitsChange((cur) => cur.map((u) => (u.id === updated.id ? updated : u)));
    clearTimeout(saveTimers.current[updated.id]);
    saveTimers.current[updated.id] = setTimeout(async () => {
      setSavingId(updated.id);
      try {
        const { unit } = await propertyApi.updateUnit(token, propertyId, updated.id, updated);
        onUnitsChange((cur) => cur.map((u) => (u.id === unit.id ? unit : u)));
      } finally {
        setSavingId(null);
      }
    }, 600);
  }

  async function handleDuplicate(unitId) {
    const { unit } = await propertyApi.duplicateUnit(token, propertyId, unitId);
    onUnitsChange((cur) => [...cur, unit]);
  }

  async function handleDelete(unitId) {
    if (units.length === 1) return; // a complex always needs >=1 unit
    if (!window.confirm('למחוק את היחידה?')) return;
    await propertyApi.deleteUnit(token, propertyId, unitId);
    onUnitsChange((cur) => cur.filter((u) => u.id !== unitId));
  }

  async function handleReorder(index, direction) {
    const next = [...units];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onUnitsChange(next);
    await propertyApi.reorderUnits(token, propertyId, next.map((u) => u.id));
  }

  return (
    <div className="wus">
      <div className="wus__list">
        {units.map((unit, i) => (
          <div key={unit.id} className="wus__unit">
            <div className="wus__unit-head" onClick={() => setOpenId(openId === unit.id ? null : unit.id)}>
              <div>
                <div className="wus__unit-name">{unit.name || `יחידה ${i + 1}`}</div>
                <div className="wus__unit-summary">
                  {[
                    unit.max_guests ? `עד ${unit.max_guests} אורחים` : null,
                    bedConfigSummary(unit.bed_config) || null,
                    unit.base_price_night ? `${unit.base_price_night} ₪ ללילה` : 'ללא מחיר',
                    savingId === unit.id ? 'שומר…' : null,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="wus__unit-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="wus__unit-icon-btn" onClick={() => handleReorder(i, -1)} disabled={i === 0} aria-label="הזז למעלה">
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="wus__unit-icon-btn" onClick={() => handleReorder(i, 1)} disabled={i === units.length - 1} aria-label="הזז למטה">
                  <ArrowDown size={14} />
                </button>
                <button type="button" className="wus__unit-icon-btn" onClick={() => handleDuplicate(unit.id)} aria-label="שכפל יחידה">
                  <Copy size={14} />
                </button>
                <button type="button" className="wus__unit-icon-btn wus__unit-icon-btn--danger" onClick={() => handleDelete(unit.id)} disabled={units.length === 1} aria-label="מחק יחידה">
                  <Trash2 size={14} />
                </button>
                <ChevronDown size={16} style={{ transform: openId === unit.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
            </div>
            {openId === unit.id && <UnitEditor unit={unit} onSave={handleSave} propertyId={propertyId} />}
          </div>
        ))}
      </div>

      <button type="button" className="wus__add-btn" onClick={handleAdd} style={{ marginTop: 12 }}>
        <Plus size={16} /> הוסף יחידה
      </button>
    </div>
  );
}
