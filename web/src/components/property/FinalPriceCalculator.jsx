import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

/** FinalPriceCalculator — 10.7: "no Israeli zimmer site shows the real final total, and it's
 * the #1 customer complaint." Nights (weekend-aware, Fri/Sat use weekend_price when set) +
 * cleaning fee, all itemized. Deliberately doesn't touch holiday pricing (unit.holiday_price
 * exists in the schema, but pricing it correctly needs a real Israeli-holiday calendar we
 * don't have data for — see DECISIONS.md 10.7; showing a wrong holiday surcharge would be
 * worse than the honest "no surprises" claim this feature is supposed to deliver). */
export function FinalPriceCalculator({ unit, cleaningFee, currency }) {
  const { t } = useLanguage();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  if (!unit?.base_price_night) return null;

  let breakdown = null;
  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
    if (nights > 0) {
      let weekdayNights = 0;
      let weekendNights = 0;
      const d = new Date(start);
      for (let i = 0; i < nights; i++) {
        const isWeekend = d.getDay() === 5 || d.getDay() === 6;
        if (isWeekend && unit.weekend_price) weekendNights++; else weekdayNights++;
        d.setDate(d.getDate() + 1);
      }
      const weekdayTotal = weekdayNights * Number(unit.base_price_night);
      const weekendTotal = weekendNights * Number(unit.weekend_price || 0);
      const cleaning = Number(cleaningFee) || 0;
      breakdown = { weekdayNights, weekendNights, weekdayTotal, weekendTotal, cleaning, total: weekdayTotal + weekendTotal + cleaning };
    }
  }

  const sym = getCurrencySymbol(currency);

  return (
    <div className="price-calc">
      <h3 className="price-calc__title"><Calculator size={15} /> {t.priceCalcTitle}</h3>
      <div className="price-calc__dates">
        <input type="date" className="agent-form__input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} aria-label={t.filterCheckIn} />
        <input type="date" className="agent-form__input" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} aria-label={t.filterCheckOut} min={checkIn || undefined} />
      </div>
      {breakdown ? (
        <div className="price-calc__breakdown">
          {breakdown.weekdayNights > 0 && (
            <div className="price-calc__row"><span>{t.priceCalcNightsRow(breakdown.weekdayNights, Math.round(unit.base_price_night))}</span><span>{Math.round(breakdown.weekdayTotal)} {sym}</span></div>
          )}
          {breakdown.weekendNights > 0 && (
            <div className="price-calc__row"><span>{t.priceCalcWeekendRow(breakdown.weekendNights, Math.round(unit.weekend_price))}</span><span>{Math.round(breakdown.weekendTotal)} {sym}</span></div>
          )}
          {breakdown.cleaning > 0 && (
            <div className="price-calc__row"><span>{t.priceCalcCleaningRow}</span><span>{Math.round(breakdown.cleaning)} {sym}</span></div>
          )}
          <div className="price-calc__row price-calc__row--total">
            <span>{t.priceCalcTotal}</span>
            <span>{Math.round(breakdown.total)} {sym}</span>
          </div>
          <p className="price-calc__note">{t.priceCalcNoSurprises}</p>
        </div>
      ) : (
        <p className="agent-form__hint">{t.priceCalcPickDates}</p>
      )}
    </div>
  );
}
