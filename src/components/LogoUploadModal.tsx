import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Trash2, CheckCircle2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

export const LogoUploadModal: React.FC = () => {
  const {
    lightLogoUrl,
    activeLogoUrl,
    uploadLightLogo,
    removeLightLogo,
    isUploadModalOpen,
    closeUploadModal
  } = useBrand();

  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isUploadModalOpen) {
      setPreviewUrl(null);
      setErrorMsg(null);
    }
  }, [isUploadModalOpen]);

  if (!isUploadModalOpen) return null;

  const processFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (.png, .jpg, .svg, .webp).');
      return;
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreviewUrl(result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      uploadLightLogo(previewUrl);
      closeUploadModal();
    }
  };

  const handleRemove = () => {
    removeLightLogo();
    setPreviewUrl(null);
  };

  const currentSavedLogo = lightLogoUrl || activeLogoUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">System Logo & Branding</h2>
              <p className="text-xs text-slate-500">Upload your organization logo to customize the system header and navigation</p>
            </div>
          </div>
          <button
            onClick={closeUploadModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
              dragOver
                ? 'border-amber-500 bg-amber-50 scale-[0.99]'
                : 'border-slate-300 hover:border-amber-500 bg-slate-50/50 hover:bg-amber-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-amber-600 shadow-inner">
              <ImageIcon className="w-6 h-6" />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">
                Click to browse or drag & drop brand logo here
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Supports transparent PNG, SVG, JPG, WebP (Max 10MB)
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 border border-slate-300 transition-colors shadow-xs cursor-pointer"
            >
              Select Image File
            </button>
          </div>

          {/* Live Preview Area */}
          {(previewUrl || currentSavedLogo) && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Emblem Live Preview</span>
                <span className="text-[11px] text-amber-600 font-semibold">
                  {previewUrl ? 'New Upload (Ready to Apply)' : 'Currently Saved Logo'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-300 bg-white p-6 flex flex-col items-center justify-center min-h-[100px] shadow-xs">
                <img
                  src={previewUrl || currentSavedLogo || ''}
                  alt="Logo Preview"
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div>
            {currentSavedLogo && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset to Default</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={closeUploadModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!previewUrl}
              onClick={handleSave}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Logo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
