import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Film,
  Star,
  Trash2,
  Plus,
  Play,
  Maximize2,
  AlertTriangle,
  Building,
  Check,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../services/api';
import { getMediaUrl, formatBytes, DEFAULT_PROPERTY_IMAGE } from '../utils/mediaHelper';
import MediaLightbox from './MediaLightbox';
import PropertyMediaUploader from './PropertyMediaUploader';

const PropertyGallery = ({
  propertyId,
  media = [],
  coverPhoto = '',
  propertyName = '',
  isOwner = false,
  isApartment = false,
  onMediaUpdated
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settingCoverId, setSettingCoverId] = useState(null);

  // Open Lightbox at specified index
  const handleOpenLightbox = (index) => {
    setActiveMediaIdx(index);
    setLightboxOpen(true);
  };

  // Set as Cover Photo
  const handleSetCover = async (mediaItem, e) => {
    e.stopPropagation();
    if (mediaItem.type !== 'image') {
      toast.error('Only photos can be set as cover photo.');
      return;
    }
    setSettingCoverId(mediaItem._id);
    try {
      const endpoint = isApartment
        ? `/apartments/${propertyId}/media/${mediaItem._id}/cover`
        : `/properties/${propertyId}/media/${mediaItem._id}/cover`;
      const res = await apiClient.patch(endpoint);
      if (res.data.success) {
        toast.success('Cover photo updated!');
        if (onMediaUpdated) onMediaUpdated();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cover photo.');
    } finally {
      setSettingCoverId(null);
    }
  };

  // Confirm and Execute Deletion
  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    try {
      const endpoint = isApartment
        ? `/apartments/${propertyId}/media/${deleteModalItem._id}`
        : `/properties/${propertyId}/media/${deleteModalItem._id}`;
      const res = await apiClient.delete(endpoint);
      if (res.data.success) {
        toast.success(res.data.message || 'Media deleted successfully.');
        setDeleteModalItem(null);
        if (onMediaUpdated) onMediaUpdated();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete media.');
    } finally {
      setIsDeleting(false);
    }
  };

  const imagesCount = media.filter(m => m.type === 'image').length;
  const videosCount = media.filter(m => m.type === 'video').length;

  // Identify main cover item
  const coverItem = media.find(m => m.isCover) || media.find(m => m.type === 'image') || media[0];
  const coverIdx = coverItem ? media.indexOf(coverItem) : 0;

  return (
    <div className="space-y-5">
      {/* Gallery Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-white Outfit">
              Property Gallery
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{imagesCount} {imagesCount === 1 ? 'Photo' : 'Photos'}</span>
              <span>•</span>
              <span>{videosCount} {videosCount === 1 ? 'Video' : 'Videos'}</span>
            </div>
          </div>
        </div>

        {/* Owner Controls */}
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="toggle-media-uploader-btn"
              onClick={() => setUploaderOpen(!uploaderOpen)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                uploaderOpen
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25'
              }`}
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${uploaderOpen ? 'rotate-45' : ''}`} />
              {uploaderOpen ? 'Close Uploader' : 'Add Photos & Videos'}
            </button>
          </div>
        )}
      </div>

      {/* Media Uploader Panel if open */}
      {isOwner && uploaderOpen && (
        <PropertyMediaUploader
          propertyId={propertyId}
          isApartment={isApartment}
          onUploadSuccess={() => {
            setUploaderOpen(false);
            if (onMediaUpdated) onMediaUpdated();
          }}
          onCancel={() => setUploaderOpen(false)}
        />
      )}

      {/* EMPTY STATE */}
      {media.length === 0 ? (
        <div className="py-12 px-6 text-center glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
            <Building className="w-8 h-8 opacity-60" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {isOwner ? 'No photos or videos added yet.' : 'No property media available.'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isOwner
                ? 'Add photos and video tours to properly showcase this property to prospective and resident tenants.'
                : 'The owner has not uploaded any photos or video tours for this property yet.'}
            </p>
          </div>
          {isOwner && !uploaderOpen && (
            <button
              type="button"
              onClick={() => setUploaderOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/25 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Photos / Videos
            </button>
          )}
        </div>
      ) : (
        /* POPULATED GALLERY DISPLAY */
        <div className="space-y-4">
          {/* FEATURED MAIN DISPLAY */}
          {coverItem && (
            <div
              onClick={() => handleOpenLightbox(coverIdx)}
              className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden glass-panel border border-slate-200 dark:border-slate-800 shadow-xl group cursor-pointer"
            >
              {coverItem.type === 'video' ? (
                <div className="w-full h-full bg-slate-950 flex items-center justify-center relative">
                  <video
                    src={getMediaUrl(coverItem.url)}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 fill-white ml-1" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white">Play Video Tour</span>
                  </div>
                </div>
              ) : (
                <img
                  src={getMediaUrl(coverItem.url)}
                  alt={propertyName}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                />
              )}

              {/* Cover Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/90 text-white shadow-lg backdrop-blur">
                  <Star className="w-3.5 h-3.5 fill-white" /> Featured Cover Photo
                </span>
                {coverItem.type === 'video' && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#B97843]/90 text-white shadow-lg backdrop-blur flex items-center gap-1">
                    <Film className="w-3 h-3" /> Video
                  </span>
                )}
              </div>

              {/* Click to expand hint */}
              <div className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full text-xs font-bold bg-black/60 text-white backdrop-blur flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-3.5 h-3.5" /> View Full Gallery ({media.length})
              </div>
            </div>
          )}

          {/* THUMBNAILS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {media.map((item, idx) => {
              const isVideo = item.type === 'video';
              const isCover = item.isCover;

              return (
                <div
                  key={item._id || item.url || idx}
                  onClick={() => handleOpenLightbox(idx)}
                  className={`group relative rounded-2xl overflow-hidden glass-panel border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg flex flex-col justify-between ${
                    isCover
                      ? 'border-amber-400/60 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-brand-500'
                  }`}
                >
                  {/* Thumbnail Image/Video Area */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                    {isVideo ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                        <video src={getMediaUrl(item.url)} className="w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={getMediaUrl(item.url)}
                        alt={item.originalName || 'Property'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                      {isCover && (
                        <span className="p-1 rounded-full bg-amber-500 text-white shadow-md" title="Cover Photo">
                          <Star className="w-3 h-3 fill-white" />
                        </span>
                      )}
                      {isVideo && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#B97843]/90 text-white backdrop-blur shadow-md flex items-center gap-1">
                          <Film className="w-2.5 h-2.5" /> Video
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Info & Owner Actions */}
                  <div className="p-2 flex items-center justify-between text-[11px] bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[90px]" title={item.originalName || `Media ${idx + 1}`}>
                      {item.originalName || `${isVideo ? 'Video' : 'Photo'} #${idx + 1}`}
                    </span>

                    {/* Owner Action Buttons */}
                    {isOwner && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {!isVideo && !isCover && (
                          <button
                            type="button"
                            disabled={settingCoverId === item._id}
                            onClick={(e) => handleSetCover(item, e)}
                            title="Set as Cover Photo"
                            className="p-1 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalItem(item);
                          }}
                          title="Delete Media"
                          className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX */}
      <MediaLightbox
        media={media}
        currentIndex={activeMediaIdx}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setActiveMediaIdx(newIdx)}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-800 dark:text-white">
                  Delete this {deleteModalItem.type === 'video' ? 'video' : 'photo'}?
                </h4>
                <p className="text-xs text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
              {deleteModalItem.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center text-[#B97843]">
                  <Film className="w-8 h-8" />
                </div>
              ) : (
                <img
                  src={getMediaUrl(deleteModalItem.url)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-xs font-extrabold rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyGallery;
