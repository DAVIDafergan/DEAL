import { useLanguage } from '../../context/LanguageContext.jsx';

export function NewBadge() {
  const { t } = useLanguage();
  return <span className="new-badge">{t.newBadge}</span>;
}
