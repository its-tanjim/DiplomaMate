import React, { useId } from 'react';

interface LiquidFillLoaderProps {
  size?: number;
  label?: string;
  /** 0–100. When omitted the fill gently bobs (indeterminate). */
  progress?: number;
  className?: string;
}

/**
 * Liquid-fill loading animation: an SVG wave that rises inside a circle.
 * Used for app-open loading and the main full-screen loading states.
 */
export const LiquidFillLoader: React.FC<LiquidFillLoaderProps> = ({
  size = 48,
  label,
  progress,
  className = ''
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `dm-liquid-fill-${uid}`;
  const clipId = `dm-liquid-clip-${uid}`;
  const fill = progress === undefined ? 55 : Math.max(0, Math.min(100, progress));
  const waveY = 100 - fill; // wave group top edge, in viewBox units
  return (
    <div
      className={`inline-flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-hidden rounded-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3880FF" />
            <stop offset="100%" stopColor="#5190FF" />
          </linearGradient>
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="48" />
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#EBF3FF" stroke="#D6E6FF" strokeWidth="2" />
        <g clipPath={`url(#${clipId})`}>
          <g className={progress === undefined ? 'dm-liquid-bob' : undefined}>
            <g style={{ transform: `translateY(${waveY}px)` }}>
              <path
                className="dm-liquid-wave"
                fill={`url(#${gradientId})`}
                d="M -100 8 Q -75 0 -50 8 T 0 8 T 50 8 T 100 8 T 150 8 T 200 8 V 120 H -100 Z"
              />
              <path
                className="dm-liquid-wave dm-liquid-wave-slow"
                fill={`url(#${gradientId})`}
                opacity="0.45"
                d="M -100 12 Q -75 4 -50 12 T 0 12 T 50 12 T 100 12 T 150 12 T 200 12 V 120 H -100 Z"
              />
            </g>
          </g>
        </g>
      </svg>
      {label && <span className="text-xs text-slate-500">{label}</span>}
    </div>
  );
};
