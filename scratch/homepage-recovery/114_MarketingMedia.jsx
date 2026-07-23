import React, { useEffect, useState } from 'react';
import { FEATURE_MOCKS, STEP_MOCKS } from './MarketingUiMock';
import { FEATURE_MEDIA, HOW_IT_WORKS_MEDIA } from '../../lib/marketingAssets';

/**
 * Renders a WebP from public/marketing/ when present, else SVG UI mock.
 */
export function MarketingImage({ src, alt, theme, MockComponent, className = 'hp-media-img' }) {
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    if (!src) {
      setUseMock(true);
      return;
    }
    let cancelled = false;
    fetch(src, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setUseMock(!res.ok);
      })
      .catch(() => {
        if (!cancelled) setUseMock(true);
      });
    return () => { cancelled = true; };
  }, [src]);

  if (useMock && MockComponent) {
    return (
      <div className={className} aria-hidden={!alt}>
        <MockComponent theme={theme} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setUseMock(true)}
    />
  );
}

export function FeatureMedia({ featureId, title, theme }) {
  const media = FEATURE_MEDIA[featureId];
  const Mock = FEATURE_MOCKS[featureId];
  const src = theme === 'light' ? media?.light : media?.dark;
  return (
    <MarketingImage
      src={src}
      alt={title}
      theme={theme}
      MockComponent={Mock}
      className="hp-feature-media"
    />
  );
}

export function StepMedia({ step, title, theme }) {
  const media = HOW_IT_WORKS_MEDIA[step];
  const Mock = STEP_MOCKS[step];
  const src = theme === 'light' ? media?.light : media?.dark;
  return (
    <MarketingImage
      src={src}
      alt={title}
      theme={theme}
      MockComponent={Mock}
      className="hp-step-media"
    />
  );
}
