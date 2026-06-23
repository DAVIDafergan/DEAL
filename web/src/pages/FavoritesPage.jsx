import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavorites } from '../hooks/useFavorites.js';
import { AgentDealCard } from '../components/agent/AgentDealCard.jsx';
import { DealDetailModal } from '../components/DealDetailModal.jsx';
import '../styles/agentPortal.css';

export function FavoritesPage() {
  const { favorites } = useFavorites();
  const [selectedDeal, setSelectedDeal] = useState(null);

  return (
    <div className="favorites-page">
      {selectedDeal && <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}

      <div className="favorites-page__header">
        <Link to="/" className="favorites-page__back">
          <ArrowLeft size={16} /> חזרה
        </Link>
        <h1 className="favorites-page__title">
          <Heart size={20} style={{ color: '#ef4444', marginInlineEnd: 8, verticalAlign: 'middle' }} />
          המועדפים שלי
        </h1>
      </div>

      {favorites.length === 0 ? (
        <div className="favorites-page__empty">
          <div className="favorites-page__empty-icon">❤️</div>
          <p className="favorites-page__empty-text">אין לך מועדפים עדיין</p>
          <p className="favorites-page__empty-sub">לחץ על ❤️ על כל דיל כדי לשמור אותו כאן</p>
          <Link to="/" style={{ marginTop: 16, display: 'inline-block', color: 'var(--color-accent-from)' }}>
            חזרה לדף הבית →
          </Link>
        </div>
      ) : (
        <motion.div
          className="deals-grid"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {favorites.map(deal => (
            <motion.div
              key={`${deal.deal_source || 'agent'}_${deal.id}`}
              variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
            >
              <AgentDealCard deal={deal} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
