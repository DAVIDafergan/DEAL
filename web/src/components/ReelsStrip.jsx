import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clapperboard, Play } from 'lucide-react';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const REELS_START_KEY = 'deal_radar_reels_start_id';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Single thumbnail — lazily fetches video, plays when visible */
function ReelThumb({ deal, index, onClick }) {
  const thumbRef = useRef(null);
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(deal.video_url || null);
  const [visible, setVisible] = useState(false);
  const fetchedRef = useRef(false);

  // IntersectionObserver: detect when this thumb is on screen
  useEffect(() => {
    const el = thumbRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Lazy-fetch video URL from Pexels when first visible
  useEffect(() => {
    if (!visible || videoUrl || fetchedRef.current) return;
    fetchedRef.current = true;
    const q = deal.destination_name || deal.destination || '';
    if (!q) return;
    fetch(`${API_BASE}/images/video?q=${encodeURIComponent(q)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.url) setVideoUrl(d.url); })
      .catch(() => {});
  }, [visible, videoUrl, deal.destination_name, deal.destination]);

  // Play only while visible, pause when scrolled away
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (visible) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [visible]);

  return (
    <motion.button
      ref={thumbRef}
      className="reels-strip__card"
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
    >
      <div className="reels-strip__thumb">
        {videoUrl ? (
          <video
            ref={videoRef}
            className="reels-strip__img"
            src={videoUrl}
            poster={deal.photo_url || undefined}
            muted
            loop
            playsInline
          />
        ) : deal.photo_url ? (
          <img src={deal.photo_url} alt={deal.destination_name} className="reels-strip__img" loading="lazy" />
        ) : (
          <div className="reels-strip__img-placeholder" />
        )}
        <div className="reels-strip__thumb-overlay" />
        {!videoUrl && (
          <div className="reels-strip__play-icon">
            <Play size={18} fill="white" color="white" />
          </div>
        )}
      </div>
      <div className="reels-strip__dest">
        <span className="reels-strip__dest-name">{deal.destination_name || deal.destination}</span>
        {deal.price && (
          <span className="reels-strip__dest-price">{Math.round(deal.price)} {deal.currency}</span>
        )}
      </div>
    </motion.button>
  );
}

export function ReelsStrip({ deals: propDeals }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deals, setDeals] = useState(propDeals || []);

  useEffect(() => {
    if (propDeals && propDeals.length > 0) { setDeals(propDeals); return; }
    agentApi.getApprovedDeals()
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => {});
  }, [propDeals]);

  if (deals.length === 0) return null;

  const preview = deals.slice(0, 6);

  function openReel(deal) {
    sessionStorage.setItem(REELS_START_KEY, deal.id);
    navigate('/reels');
  }

  return (
    <section className="reels-strip container">
      <div className="reels-strip__header">
        <span className="reels-strip__icon-wrap">
          <Clapperboard size={18} color="var(--color-accent-from)" />
        </span>
        <h2 className="reels-strip__title">{t.reelsStripTitle || 'דילים בווידאו'}</h2>
        <motion.button
          className="reels-strip__see-all"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/reels')}
        >
          {t.reelsSeeAll || 'כל הרילס →'}
        </motion.button>
      </div>

      <div className="reels-strip__scroll">
        {preview.map((deal, i) => (
          <ReelThumb
            key={deal.id}
            deal={deal}
            index={i}
            onClick={() => openReel(deal)}
          />
        ))}
      </div>
    </section>
  );
}
