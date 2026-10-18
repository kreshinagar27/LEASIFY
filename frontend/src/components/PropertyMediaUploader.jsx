import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Film, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../services/api';
import { validateMediaFile, formatBytes } from '../utils/mediaHelper';

const PropertyMediaUploader = ({
  propertyId,
  isApartment = false,
  onUploadSuccess,
  onCancel
}) => {
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const genericInputRef = useRef(null);

  // Handle addition of raw files to queue
  const processFiles = (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const newQueueItems = [];
    const filesArray = Array.from(filesList);

    for (const file of filesArray) {
      const validation = validateMediaFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        continue;
      }

      // Prevent duplicate file names in the same batch
      const alreadyQueued = queuedFiles.some(f => f.file.name === file.name && f.file.size === file.size);
      if (alreadyQueued) continue;

      const previewUrl = URL.createObjectURL(file);
      newQueueItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        type: validation.type,
        previewUrl
      });
    }

    if (newQueueItems.length > 0) {
      setQueuedFiles(prev => [...prev, ...newQueueItems]);
      toast.success(`Added ${newQueueItems.length} file(s) to upload queue.`);
    }
  };

  // Remove a single queued item
  const handleRemoveQueueItem = (id) => {
    setQueuedFiles(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Execute upload
  const handleUpload = async () => {
    if (queuedFiles.length === 0) {
      toast.error('Please select photos or videos to upload first.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    queuedFiles.forEach(item => {
      formData.append('media', item.file);
    });

    try {
      const endpoint = isApartment ? `/apartments/${propertyId}/media` : `/properties/${propertyId}/media`;
      const res = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Gallery media uploaded successfully!');
        // Clean up preview blob URLs
        queuedFiles.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
        setQueuedFiles([]);
        if (onUploadSuccess) {
          onUploadSuccess(res.data);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload media files.';
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 animate-fadeIn">
      {/* Header with Title and Type Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2 Outfit">
            <Upload className="w-4 h-4 text-brand-500" />
            Upload Property Photos & Videos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Attach high-resolution photos and video tours to showcase this property.
          </p>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={uploading}
            onClick={() => photoInputRef.current?.click()}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" /> 📷 Add Photos
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => videoInputRef.current?.click()}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-[#B97843]/10 text-[#B97843] dark:text-[#C58A58] hover:bg-[#B97843]/20 border border-[#B97843]/25 transition-all flex items-center justify-center gap-1.5"
          >
            <Film className="w-3.5 h-3.5" /> 🎥 Add Videos
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={photoInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        multiple
        accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={genericInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.mov"
        onChange={(e) => {
          processFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => genericInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700/80 hover:border-brand-400 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center shadow-inner">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Drag & drop files here, or <span className="text-brand-500 hover:underline">Browse Files</span>
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>📷 Photos: JPG, PNG, WEBP (Max 10 MB)</span>
            <span>•</span>
            <span>🎥 Videos: MP4, WEBM, MOV (Max 100 MB)</span>
          </div>
        </div>
      </div>

      {/* Upload Queue Previews */}
      {queuedFiles.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Selected Files ({queuedFiles.length})</span>
            <button
              type="button"
              onClick={() => {
                queuedFiles.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
                setQueuedFiles([]);
              }}
              className="text-red-500 hover:underline text-[11px]"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {queuedFiles.map((item) => (
              <div
                key={item.id}
                className="relative rounded-2xl overflow-hidden glass-panel border border-slate-200 dark:border-slate-800 p-2 group shadow-sm flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                  {item.type === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-[#B97843]">
                      <Film className="w-6 h-6 mb-1" />
                      <span className="text-[9px] uppercase font-bold tracking-wider">Video</span>
                    </div>
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveQueueItem(item.id);
                    }}
                    aria-label="Remove from queue"
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="mt-1.5 px-0.5">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatBytes(item.file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar if uploading */}
          {uploading && (
            <div className="space-y-1.5 pt-2 animate-fadeIn">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  Uploading media...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                disabled={uploading}
                onClick={onCancel}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={uploading}
              onClick={handleUpload}
              className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading ({queuedFiles.length})...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Upload {queuedFiles.length} File{queuedFiles.length > 1 ? 's' : ''} to Gallery
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyMediaUploader;
