import React, { useState, useEffect } from 'react';

// Curated high-resolution residential & architectural property photographs
const DEFAULT_SLIDES = [
  {
    id: 1,
    title: 'Modern Minimalist Luxury Apartment',
    // Matches Reference Screenshot 1 (METRORENTALS style bright luxury interior)
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2400&q=85',
    tag: 'Urban Penthouse Living'
  },
  {
    id: 2,
    title: 'Contemporary Architectural Villa',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=85',
    tag: 'Private Residence'
  },
  {
    id: 3,
    title: 'Designer Open-Plan Living & Kitchen',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=85',
    tag: 'Curated Interiors'
  },
  {
    id: 4,
    title: 'Luxury Skyline Suite with Panoramic Windows',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2400&q=85',
    tag: 'Skyline Terrace'
  }
];

const PropertyBackground = ({
  fixed = true,
  videoSrc = null,
  slides = DEFAULT_SLIDES,
  showVignette = true,
  overlayOpacity = 'default' // 'default' | 'dense' | 'light'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoAvailable, setVideoAvailable] = useState(Boolean(videoSrc));

  // Ken Burns slideshow transition timer (cycles smoothly every 7.5 seconds)
  useEffect(() => {
    if (videoAvailable && videoSrc) return; // Video handles its own continuous loop
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [slides.length, videoAvailable, videoSrc]);

  return (
    <div
      aria-hidden="true"
      className={`${
        fixed ? 'fixed -top-4 -bottom-4 -left-4 -right-4' : 'absolute -top-4 -bottom-4 -left-4 -right-4'
      } overflow-hidden pointer-events-none -z-20 select-none`}
    >
      {/* 1. VIDEO LAYER (if available or configured) */}
      {videoSrc && videoAvailable ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={slides[0]?.image}
          onError={() => setVideoAvailable(false)}
          className="w-full h-full object-cover scale-105 transition-opacity duration-1000"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : (
        /* 2. CINEMATIC KEN-BURNS MOVING HOUSE SLIDESHOW */
        <div className="relative w-full h-full">
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            const motionClass = idx % 2 === 0 ? 'animate-kenburns-1' : 'animate-kenburns-2';
            return (
              <div
                key={slide.id || idx}
                className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  className={`w-full h-full object-cover object-center scale-105 ${motionClass} will-change-transform`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 3. WARM REAL ESTATE TRANSLUCENT GRADIENT VEIL */}
      {/* Light Mode: Ivory/Cream veil allowing house to remain visible with soft blur */}
      {/* Dark Mode: Deep espresso/chocolate veil maintaining property silhouette and warm tones */}
      <div
        className={`absolute inset-0 ${
          overlayOpacity === 'dense'
            ? 'bg-gradient-to-r from-[#F5EEE3]/92 via-[#FBF7F0]/80 to-[#F5EEE3]/70 dark:from-[#1B100E]/94 dark:via-[#261714]/85 dark:to-[#1B100E]/75'
            : overlayOpacity === 'light'
            ? 'bg-gradient-to-r from-[#F5EEE3]/65 via-[#FBF7F0]/40 to-[#F5EEE3]/30 dark:from-[#1B100E]/75 dark:via-[#261714]/60 dark:to-[#1B100E]/45'
            : overlayOpacity === 'subtle' || overlayOpacity === 'cinematic'
            ? 'bg-black/20 backdrop-brightness-[0.95]'
            : 'bg-gradient-to-r from-[#F5EEE3]/82 via-[#FBF7F0]/60 to-[#F5EEE3]/45 dark:from-[#1B100E]/88 dark:via-[#261714]/75 dark:to-[#1B100E]/60'
        } backdrop-contrast-[1.02]`}
      />

      {/* Subtle top-to-bottom atmospheric vignette for navbar legibility */}
      {showVignette && (
        <div
          className={`absolute inset-0 pointer-events-none ${
            overlayOpacity === 'subtle' || overlayOpacity === 'cinematic'
              ? 'bg-gradient-to-b from-black/50 via-transparent to-black/40'
              : 'bg-gradient-to-b from-[#F5EEE3]/60 via-transparent to-[#F5EEE3]/80 dark:from-[#1B100E]/70 dark:via-transparent dark:to-[#1B100E]/85'
          }`}
        />
      )}
    </div>
  );
};

export default PropertyBackground;
