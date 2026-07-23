import React, { useEffect, useState } from 'react';
import { MARKETING_MEDIA } from '../../lib/marketingAssets';

/**
 * Hero product visual: tries hero-demo.mp4 from public/marketing/, falls back to PNG poster.
 */
export default function HeroVisual({ theme, posterDark, posterLight, className = 'hp-hero-visual' }) {
  const [videoReady, setVideoReady] = useState(false);
  const poster = theme === 'light' ? posterLight : posterDark;

  useEffect(() => {
    let cancelled = false;
    fetch(MARKETING_MEDIA.heroVideo, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setVideoReady(res.ok);
      })
      .catch(() => {
        if (!cancelled) setVideoReady(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={className}>
      {videoReady ? (
        <video
          className="hp-hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          aria-label="ReachDesk follow-up workflow demo"
        >
          <source src={MARKETING_MEDIA.heroVideoWebm} type="video/webm" />
          <source src={MARKETING_MEDIA.heroVideo} type="video/mp4" />
        </video>
      ) : null}
      <img
        src={poster}
        alt="ReachDesk CRM dashboard showing lead pipeline and follow-up reminders"
        className={`hp-hero-mockup-img${videoReady ? ' hp-hero-poster-hidden' : ''}`}
      />
    </div>
  );
}
