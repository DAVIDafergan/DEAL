import { useEffect, useMemo, useState } from 'react';
import { fetchVibeFeed, agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DealSlide } from './DealSlide.jsx';
import { AgentDealSlide } from './AgentDealSlide.jsx';
import { VibeFilterMenu } from './VibeFilterMenu.jsx';
import { ALL_VIBES_KEY } from './vibeConstants.js';

// Interleave agent deals into live cards: 1 agent slide every N live slides
function interleaveAgentDeals(liveCards, agentDeals, interval = 4) {
  const result = [];
  let ai = 0;
  for (let i = 0; i < liveCards.length; i++) {
    result.push({ _type: 'live', data: liveCards[i] });
    if ((i + 1) % interval === 0 && ai < agentDeals.length) {
      result.push({ _type: 'agent', data: agentDeals[ai++] });
    }
  }
  while (ai < agentDeals.length) {
    result.push({ _type: 'agent', data: agentDeals[ai++] });
  }
  return result;
}

/**
 * DealsTab — תוכן הטאב "דילים": גלילה אנכית מלאת-מסך עם scroll-snap. טוען גם את דילי
 * הסוכנים המאושרים ומשלב אחד כל 4 דילים חיים — עקביות עם grid ה-flights.
 */
export function DealsTab({ vibe = ALL_VIBES_KEY, onChangeVibe }) {
  const { t, lang } = useLanguage();
  const [cards, setCards] = useState(null);
  const [agentDeals, setAgentDeals] = useState([]);

  useEffect(() => {
    let isMounted = true;
    setCards(null);
    fetchVibeFeed(vibe, lang)
      .then((res) => { if (isMounted) setCards(res.cards || []); })
      .catch(() => { if (isMounted) setCards([]); });
    return () => { isMounted = false; };
  }, [vibe, lang]);

  useEffect(() => {
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => {});
  }, []);

  const merged = useMemo(
    () => cards ? interleaveAgentDeals(cards, agentDeals, 4) : [],
    [cards, agentDeals]
  );

  return (
    <div className="vibe-feed-page">
      <div className="vibe-feed-page__filter-bar">
        <VibeFilterMenu activeVibe={vibe} onChange={onChangeVibe} />
      </div>

      {cards === null && (
        <div className="vibe-feed-page--centered">
          <p>{t.feedLoadingMessage}</p>
        </div>
      )}

      {cards !== null && merged.length === 0 && (
        <div className="vibe-feed-page--centered">
          <p>{t.feedEmptyMessage}</p>
          {vibe !== ALL_VIBES_KEY && (
            <button type="button" className="vibe-feed-page__back-button" onClick={() => onChangeVibe(ALL_VIBES_KEY)}>
              {t.vibeFilterAll}
            </button>
          )}
        </div>
      )}

      {cards !== null && merged.length > 0 && (
        <div className="vibe-feed-page__scroller">
          {merged.map((item) =>
            item._type === 'agent'
              ? <AgentDealSlide key={`agent-${item.data.id}`} deal={item.data} />
              : <DealSlide key={item.data.id} card={item.data} />
          )}
        </div>
      )}
    </div>
  );
}
