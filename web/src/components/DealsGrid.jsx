import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DealCard } from './DealCard.jsx';
import { AgentDealCard } from './agent/AgentDealCard.jsx';
import { SkeletonCard } from './SkeletonCard.jsx';

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export function DealsGrid({ deals, agentDeals = [], isLoading, hasActiveFilters = false, packageConfig = null, cheapestDealId = null, sourceFilter = null }) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="deals-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Merge and filter by source
  const showLive = !sourceFilter || sourceFilter === 'automatic';
  const showAgent = !sourceFilter || sourceFilter === 'agent';

  const liveMapped = showLive ? deals.map(d => ({ ...d, _source: 'live' })) : [];
  const agentMapped = showAgent ? agentDeals.map(d => ({ ...d, _source: 'agent' })) : [];

  // Interleave: 1 agent deal every 3 live deals
  const merged = [];
  let ai = 0;
  for (let i = 0; i < liveMapped.length; i++) {
    merged.push(liveMapped[i]);
    if ((i + 1) % 3 === 0 && ai < agentMapped.length) {
      merged.push(agentMapped[ai++]);
    }
  }
  // Append remaining agent deals
  while (ai < agentMapped.length) merged.push(agentMapped[ai++]);

  if (merged.length === 0) {
    return <p className="deal-card__desc">{hasActiveFilters ? t.noFilteredResults : t.empty}</p>;
  }

  return (
    <motion.div className="deals-grid" variants={gridVariants} initial="hidden" animate="visible">
      <AnimatePresence>
        {merged.map((item) =>
          item._source === 'agent'
            ? <AgentDealCard key={`agent-${item.id}`} deal={item} />
            : <DealCard key={item.id} deal={item} packageConfig={packageConfig} isCheapest={item.id === cheapestDealId} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
