import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { AgentDealSlide } from './AgentDealSlide.jsx';
import { VibeFilterMenu } from './VibeFilterMenu.jsx';
import { ALL_VIBES_KEY } from './vibeConstants.js';
import { LayoutDashboard, Radio, Volume2, VolumeX } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function DealsTab({ vibe = ALL_VIBES_KEY, onChangeVibe, isActive }) {
  const { t } = useLanguage();
  const { agent, token, loading: authLoading } = useAgentAuth();
  const navigate = useNavigate();
  const [agentDeals, setAgentDeals] = useState(null);

  // Music player state
  const audioRef = useRef(null);
  const playlistRef = useRef([]);
  const trackIdxRef = useRef(0);
  const [muted, setMuted] = useState(true);
  const [hasMusic, setHasMusic] = useState(false);

  useEffect(() => {
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => setAgentDeals([]));
  }, []);

  // Fetch playlist once
  useEffect(() => {
    fetch(`${API_BASE}/music/playlist`)
      .then(r => r.ok ? r.json() : { tracks: [] })
      .then(({ tracks }) => {
        if (tracks && tracks.length > 0) {
          playlistRef.current = tracks;
          setHasMusic(true);
          if (audioRef.current) {
            audioRef.current.src = tracks[0].url;
          }
        }
      })
      .catch(() => {});
  }, []);

  // Pause/resume when tab becomes inactive/active
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isActive) {
      audio.pause();
    } else if (!muted && hasMusic) {
      audio.play().catch(() => {});
    }
  }, [isActive, muted, hasMusic]);

  // Advance to next track on end
  function handleTrackEnd() {
    const playlist = playlistRef.current;
    if (!playlist.length) return;
    trackIdxRef.current = (trackIdxRef.current + 1) % playlist.length;
    const audio = audioRef.current;
    if (audio) {
      audio.src = playlist[trackIdxRef.current].url;
      if (!muted) audio.play().catch(() => {});
    }
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio || !hasMusic) return;
    const next = !muted;
    setMuted(next);
    audio.muted = next;
    if (!next && isActive) {
      if (!audio.src && playlistRef.current.length > 0) {
        audio.src = playlistRef.current[0].url;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  const loading = agentDeals === null;

  return (
    <div className="vibe-feed-page">
      {/* Hidden audio element for background music */}
      <audio
        ref={audioRef}
        muted
        onEnded={handleTrackEnd}
        style={{ display: 'none' }}
      />

      {/* Filter menu — top-left */}
      <div className="vibe-feed-page__filter-bar">
        <VibeFilterMenu activeVibe={vibe} onChange={onChangeVibe} />
      </div>

      {/* Auth buttons — top-right */}
      {!authLoading && (
        <div className="vibe-feed-page__auth-bar">
          {token && agent ? (
            <Link to="/owner/dashboard" className="vibe-auth-btn vibe-auth-btn--agent">
              <LayoutDashboard size={14} />
              <span className="vibe-auth-btn__name">{agent.business_name}</span>
            </Link>
          ) : (
            <>
              <button type="button" className="vibe-auth-btn vibe-auth-btn--ghost" onClick={() => navigate('/owner/login')}>
                {t.headerLoginButton || 'Login'}
              </button>
              <button type="button" className="vibe-auth-btn vibe-auth-btn--primary" onClick={() => navigate('/register')}>
                {t.headerRegisterButton || 'Register'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Mute/unmute music button — bottom-left, above bottom nav */}
      {hasMusic && (
        <button
          type="button"
          className="reels-mute-btn"
          onClick={toggleMute}
          aria-label={muted ? 'הפעל מוזיקה' : 'השתק מוזיקה'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

      {loading && (
        <div className="vibe-feed-page--centered">
          <p>{t.feedLoadingMessage || 'Loading...'}</p>
        </div>
      )}

      {!loading && agentDeals.length === 0 && (
        <div className="vibe-feed-page--centered">
          <Radio size={48} strokeWidth={1} color="var(--color-text-muted)" style={{ marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: 0 }}>
            {t.agentDealsEmptyReel || 'No verified agent deals yet — check back soon!'}
          </p>
        </div>
      )}

      {!loading && agentDeals.length > 0 && (
        <div className="vibe-feed-page__scroller">
          {agentDeals.map((deal) => (
            <AgentDealSlide key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
