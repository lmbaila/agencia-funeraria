import { useId } from 'react';

/** Motivos decorativos minimalistas (linha única) usados como textura visual discreta. */

export function WingMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 420" fill="none" className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M20 340C120 300 200 240 240 140" opacity="0.9" />
        <path d="M40 360C150 310 230 250 270 150" opacity="0.7" />
        <path d="M60 380C175 320 255 260 300 160" opacity="0.5" />
        <path d="M80 398C200 330 280 270 330 170" opacity="0.3" />
        <path d="M100 415C225 340 305 280 360 180" opacity="0.18" />
      </g>
      <circle cx="240" cy="140" r="3" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export function GlowMesh({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background:
          'radial-gradient(circle at 20% 20%, rgba(184,137,43,0.18), transparent 45%),' +
          'radial-gradient(circle at 85% 15%, rgba(184,137,43,0.10), transparent 40%),' +
          'radial-gradient(circle at 75% 85%, rgba(255,255,255,0.06), transparent 50%)',
      }}
    />
  );
}

/** Textura de grão subtil, para dar profundidade a superfícies escuras sem usar imagens. */
export function GrainOverlay({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" opacity="0.035" />
    </svg>
  );
}

/**
 * Friso geométrico inspirado nos motivos de losangos das capulanas moçambicanas — usado como
 * orla/divisor entre secções, nunca como padrão fotográfico de tecido.
 */
export function CapulanaFrieze({ className, opacity = 1 }: { className?: string; opacity?: number }) {
  const patternId = `capulana-${useId()}`;
  return (
    <svg className={className} aria-hidden preserveAspectRatio="none" viewBox="0 0 96 24">
      <defs>
        <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M12 2 L21 12 L12 22 L3 12 Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M0 12 H6 M18 12 H24" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        </pattern>
      </defs>
      <rect width="96" height="24" fill={`url(#${patternId})`} opacity={opacity} />
    </svg>
  );
}

/** Chama de vela com tremulação subtil — o motivo assinatura da página (a vigília). */
export function CandleFlame({ className }: { className?: string }) {
  const gradId = `flame-glow-${useId()}`;
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 40 56" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor="#FFD9A0" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#E3A857" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#E3A857" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="26" r="24" fill={`url(#${gradId})`} />
        <g className="flame-flicker">
          <path
            d="M20 6C20 6 11 18 11 27C11 33.6 15 38 20 38C25 38 29 33.6 29 27C29 18 20 6 20 6Z"
            fill="#F2A438"
          />
          <path
            d="M20 16C20 16 15.5 24.5 15.5 29.5C15.5 33.6 17.5 36 20 36C22.5 36 24.5 33.6 24.5 29.5C24.5 24.5 20 16 20 16Z"
            fill="#FBD782"
          />
        </g>
        <rect x="18" y="38" width="4" height="14" rx="1" fill="#F4EDE3" />
        <ellipse cx="20" cy="52" rx="7" ry="2" fill="#D8CBB4" />
      </svg>
    </div>
  );
}

export function DividerOrnament({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 120 16" className="h-4 w-24 text-amber-500">
        <line x1="0" y1="8" x2="46" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <circle cx="60" cy="8" r="3" fill="currentColor" />
        <line x1="74" y1="8" x2="120" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      </svg>
    </div>
  );
}
