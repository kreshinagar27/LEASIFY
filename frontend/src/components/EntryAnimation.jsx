import React, { useState, useEffect } from 'react';

/**
 * EntryAnimation - Isolated, premium architectural entry animation for Leasify.
 *
 * Sequence (~2.5s total):
 * 1. Deep architectural backdrop (#140C0A) with ambient subtle grid.
 * 2. Minimalist architectural doorway outline is drawn in warm terracotta-gold.
 * 3. A curated luxury home interior is revealed through the arched doorway aperture.
 * 4. Existing Leasify branding and "Find your future home" tagline appear.
 * 5. Smooth cinematic expansion & dissolve into the website.
 * 6. Completely unmounts from the DOM.
 *
 * Features:
 * - Plays once per browser session by default.
 * - Replay anytime with ?replay=true in URL or window.replayEntryAnimation().
 * - Respects prefers-reduced-motion: reduce.
 * - Non-blocking: Escape key or 'Skip' button immediately dismisses.
 * - Clean DOM unmount once completed.
 */
const STORAGE_KEY = 'leasify_entry_v1';

const EntryAnimation = () => {
  // Synchronous initialization so it displays on frame 0 without flash
  const [shouldPlay] = useState(() => {
    if (typeof window === 'undefined') return false;

    // Check accessibility reduced-motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }

    // Force replay with URL query param ?replay=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('replay') === 'true') {
      return true;
    }

    // Check session storage
    try {
      // Clear legacy key if present from previous run
      sessionStorage.removeItem('leasify_has_seen_entry');
      const hasSeen = sessionStorage.getItem(STORAGE_KEY);
      if (hasSeen === 'true') {
        return false;
      }
    } catch {
      return true;
    }

    return true;
  });

  const [stage, setStage] = useState('draw'); // 'draw' | 'reveal' | 'branding' | 'exit' | 'done'
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!shouldPlay) return;

    // Expose dev helper to replay anytime in console
    window.replayEntryAnimation = () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('leasify_has_seen_entry');
      } catch {}
      window.location.reload();
    };

    console.log('✨ [Leasify] Playing architectural entry animation. (To replay anytime, call window.replayEntryAnimation() or append ?replay=true)');

    // Keyboard listener: Escape key skips immediately
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dismissImmediately();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Timeline (~2.5s total)
    // 0.0s - 0.6s: Doorway stroke drawing
    // 0.6s - 1.3s: Home interior reveal through doorway arch
    // 1.3s - 2.1s: Leasify branding and tagline fade-up
    // 2.1s - 2.6s: Portal expands outward and fades into site
    // 2.6s: Complete unmount and session flag saved
    const t1 = setTimeout(() => setStage('reveal'), 600);
    const t2 = setTimeout(() => setStage('branding'), 1300);
    const t3 = setTimeout(() => setStage('exit'), 2100);
    const t4 = setTimeout(() => {
      dismissImmediately();
    }, 2600);

    // Hard failsafe timer (3.2s)
    const failsafe = setTimeout(() => {
      dismissImmediately();
    }, 3200);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(failsafe);
    };
  }, [shouldPlay]);

  const dismissImmediately = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    setStage('done');
    setIsDismissed(true);
  };

  // If not playing or dismissed, unmount completely from DOM
  if (!shouldPlay || isDismissed || stage === 'done') {
    return null;
  }

  const isExit = stage === 'exit';
  const showReveal = stage === 'reveal' || stage === 'branding' || stage === 'exit';
  const showBranding = stage === 'branding' || stage === 'exit';

  return (
    <div
      role="dialog"
      aria-label="Welcome to Leasify"
      aria-modal="true"
      className={`fixed inset-0 z-[99999] flex items-center justify-center select-none overflow-hidden transition-all duration-500 ease-out ${
        isExit ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#140C0A',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
      }}
    >
      <style>{`
        @keyframes leasifyStrokeDraw {
          0% {
            stroke-dashoffset: 900;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes leasifyThresholdDraw {
          0% {
            transform: scaleX(0);
            opacity: 0;
          }
          100% {
            transform: scaleX(1);
            opacity: 1;
          }
        }

        @keyframes leasifyHomeReveal {
          0% {
            opacity: 0;
            transform: scale(1.08);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1.0);
            filter: blur(0px);
          }
        }

        @keyframes leasifyWarmGlow {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          100% {
            opacity: 0.65;
            transform: scale(1);
          }
        }

        @keyframes leasifyBrandFadeUp {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .leasify-doorway-outline {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: leasifyStrokeDraw 1.0s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .leasify-threshold-line {
          transform-origin: center;
          animation: leasifyThresholdDraw 0.5s cubic-bezier(0.25, 1, 0.5, 1) 0.15s forwards;
        }

        .leasify-home-interior {
          animation: leasifyHomeReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .leasify-warm-illumination {
          animation: leasifyWarmGlow 0.7s ease-out forwards;
        }

        .leasify-brand-reveal {
          animation: leasifyBrandFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. Subtle Architectural Grid Ambient Backdrop */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(212, 149, 99, 0.15) 0%, transparent 65%), linear-gradient(rgba(223, 208, 189, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(223, 208, 189, 0.05) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 40px 40px, 40px 40px'
        }}
      />

      {/* 2. Skip Prompt (Top Right) */}
      <button
        type="button"
        onClick={dismissImmediately}
        className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 text-[11px] font-semibold tracking-wider uppercase text-[#DFD0BD]/70 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm"
      >
        Skip ✕
      </button>

      {/* 3. Central Architectural Portal & Home Reveal */}
      <div className="relative flex flex-col items-center justify-center z-10 max-w-sm sm:max-w-md w-full px-6">
        {/* SVG Architectural Doorway Portal */}
        <div className="relative w-64 h-80 sm:w-72 sm:h-92 flex items-center justify-center">
          <svg
            viewBox="0 0 320 400"
            className="w-full h-full overflow-visible drop-shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Doorway Interior Aperture ClipPath */}
              <clipPath id="leasifyDoorwayClip">
                <path d="M 80 340 L 80 180 A 80 80 0 0 1 240 180 L 240 340 Z" />
              </clipPath>

              {/* Warm interior light gradient overlay */}
              <linearGradient id="leasifyInteriorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D49563" stopOpacity="0.15" />
                <stop offset="60%" stopColor="#4B1715" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#140C0A" stopOpacity="0.65" />
              </linearGradient>

              {/* Doorway outline stroke gradient */}
              <linearGradient id="leasifyDoorwayStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E6D3BF" />
                <stop offset="50%" stopColor="#D49563" />
                <stop offset="100%" stopColor="#B97843" />
              </linearGradient>
            </defs>

            {/* A. REVEALED HOME INTERIOR (Clipped to doorway portal) */}
            {showReveal && (
              <g clipPath="url(#leasifyDoorwayClip)" className="leasify-home-interior">
                <image
                  href="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85"
                  x="50"
                  y="80"
                  width="220"
                  height="280"
                  preserveAspectRatio="xMidYMid slice"
                />
                <rect x="80" y="100" width="160" height="240" fill="url(#leasifyInteriorGlow)" />
              </g>
            )}

            {/* B. WARM ILLUMINATION BLOOM FROM WITHIN THE PORTAL */}
            {showReveal && (
              <circle
                cx="160"
                cy="220"
                r="70"
                fill="radial-gradient(circle, rgba(212, 149, 99, 0.45) 0%, transparent 70%)"
                className="leasify-warm-illumination pointer-events-none"
              />
            )}

            {/* C. ARCHITECTURAL DOORWAY OUTLINE STROKE */}
            <path
              d="M 80 340 L 80 180 A 80 80 0 0 1 240 180 L 240 340"
              stroke="url(#leasifyDoorwayStroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="leasify-doorway-outline"
            />

            {/* D. DELICATE INNER FRAME INSET LINE */}
            <path
              d="M 86 340 L 86 182 A 74 74 0 0 1 234 182 L 234 340"
              stroke="#D49563"
              strokeWidth="0.75"
              strokeOpacity="0.45"
              strokeLinecap="round"
              className="leasify-doorway-outline"
              style={{ animationDelay: '0.12s' }}
            />

            {/* E. ARCHITECTURAL KEYSTONE ACCENT AT APEX */}
            <line
              x1="160"
              y1="94"
              x2="160"
              y2="103"
              stroke="#E6D3BF"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-opacity duration-500"
            />

            {/* F. THRESHOLD GROUND BASELINE */}
            <line
              x1="55"
              y1="340"
              x2="265"
              y2="340"
              stroke="#D49563"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="leasify-threshold-line"
            />

            {/* Subtle base floor tick marks */}
            <line x1="75" y1="345" x2="245" y2="345" stroke="#DFD0BD" strokeWidth="0.5" strokeOpacity="0.4" />
          </svg>
        </div>

        {/* 4. LEASIFY BRANDING REVEAL */}
        <div
          className={`mt-4 sm:mt-5 text-center flex flex-col items-center transition-all duration-600 ${
            showBranding ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {/* Logo icon + wordmark matching existing branding */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-dark.png"
              alt="Leasify"
              className="h-7 sm:h-8 w-auto object-contain brightness-0 invert drop-shadow-[0_2px_12px_rgba(212,149,99,0.3)]"
            />
          </div>

          <p className="text-[12px] sm:text-[13px] tracking-[0.2em] uppercase font-medium text-[#DFD0BD]/85 mt-2 Outfit">
            Find your future home
          </p>

          {/* Minimal gold progress accent line */}
          <div className="w-10 h-0.5 bg-gradient-to-r from-transparent via-[#D49563] to-transparent mt-2.5 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default EntryAnimation;
