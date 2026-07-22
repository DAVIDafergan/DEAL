import { BadgePercent, MessageCircle, ReceiptText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const POINTS = [
  { icon: BadgePercent, titleKey: 'trustSectionFee', subKey: 'trustSectionFeeSub' },
  { icon: MessageCircle, titleKey: 'trustSectionDirect', subKey: 'trustSectionDirectSub' },
  { icon: ReceiptText, titleKey: 'trustSectionPricing', subKey: 'trustSectionPricingSub' },
];

export function TrustSection() {
  const { t, dir } = useLanguage();
  return (
    <section className="trust-section container" dir={dir}>
      <div className="trust-grid">
        {POINTS.map(({ icon: Icon, titleKey, subKey }) => (
          <div className="trust-card" key={titleKey}>
            <div className="trust-card__icon"><Icon size={24} strokeWidth={1.75} /></div>
            <h3 className="trust-card__title">{t[titleKey]}</h3>
            <p className="trust-card__sub">{t[subKey]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
