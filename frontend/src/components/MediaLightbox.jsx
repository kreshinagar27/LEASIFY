import React, { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Star, Film, Image as ImageIcon } from 'lucide-react';
import { getMediaUrl } from '../utils/mediaHelper';

const MediaLightbox = ({
  media = [],
  currentIndex = 0,
  isOpen = false,
  onClose,
  onNavigate
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate((currentIndex === 0 ? media.length - 1 : currentIndex - 1));
      if (e.key === 'ArrowRight') onNavigate((currentIndex === media.length - 1 ? 0 : currentIndex + 1));
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, media.length, onClose, onNavigate]);

  if (!isOpen || !media || media.length === 0) return null;

  const currentItem = media[currentIndex] || media[0];
  const isVideo = currentItem.type === 'video';
  const totalCount = media.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media Lightbox"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-2xl text-white select-none animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between px-4 sm:px-8 py-4 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur border border-white/10">
            {isVideo ? <Film className="w-3.5 h-3.5 text-brand-400" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-400" />}
            <span>{currentIndex + 1} of {totalCount}</span>
          </span>
          {currentItem.isCover && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Star className="w-3 h-3 fill-amber-300" /> Cover Photo
            </span>
          )}
          {currentItem.originalName && (
            <span className="text-xs text-slate-300 hidden md:inline truncate max-w-xs">
              {currentItem.originalName}
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          aria-label="Close Lightbox"
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Media Container */}
      <div className="relative flex-1 w-full flex items-center justify-center px-4 sm:px-12 py-2 overflow-hidden">
        {/* Previous Button */}
        {totalCount > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex === 0 ? totalCount - 1 : currentIndex - 1);
            }}
            aria-label="Previous Media"
            className="absolute left-2 sm:left-6 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur transition-all active:scale-90"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Display Item: Video or Image */}
        <div className="max-w-5xl max-h-[70vh] sm:max-h-[75vh] w-full flex items-center justify-center">
          {isVideo ? (
            <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <video
                key={currentItem.url}
                ref={videoRef}
                src={getMediaUrl(currentItem.url)}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[70vh] object-contain rounded-2xl"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <img
              key={currentItem.url}
              src={getMediaUrl(currentItem.url)}
              alt={currentItem.originalName || 'Property photo'}
              className="max-h-[70vh] sm:max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300 animate-fadeIn"
            />
          )}
        </div>

        {/* Next Button */}
        {totalCount > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex === totalCount - 1 ? 0 : currentIndex + 1);
            }}
            aria-label="Next Media"
            className="absolute right-2 sm:right-6 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white backdrop-blur transition-all active:scale-90"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Filmstrip */}
      {totalCount > 1 && (
        <div className="w-full py-4 px-4 bg-gradient-to-t from-black/80 to-transparent z-20 overflow-x-auto flex justify-center">
          <div className="flex items-center gap-2 max-w-4xl px-2 py-1 overflow-x-auto">
            {media.map((item, idx) => {
              const active = idx === currentIndex;
              const isThumbVideo = item.type === 'video';
              return (
                <button
                  key={item._id || item.url || idx}
                  onClick={() => onNavigate(idx)}
                  className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden shrink-0 transition-all ${
                    active
                      ? 'ring-2 ring-brand-500 scale-105 opacity-100 shadow-lg'
                      : 'opacity-50 hover:opacity-80 scale-95'
                  }`}
                >
                  {isThumbVideo ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                      <video src={getMediaUrl(item.url)} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={getMediaUrl(item.url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {item.isCover && (
                    <div className="absolute top-1 left-1 bg-amber-500 rounded-full p-0.5">
                      <Star className="w-2 h-2 text-white fill-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLightbox;
