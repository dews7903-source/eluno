import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Palette,
  Check,
  Trash2,
  Sliders,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { BoardTheme } from '../types';
import { BOARD_THEMES } from '../services/sampleData';

interface WallpaperPreset {
  id: string;
  title: string;
  category: 'nature' | 'minimal' | 'abstract' | 'city';
  url: string;
  thumbUrl: string;
  isDark: boolean;
}

export const CURATED_WALLPAPERS: WallpaperPreset[] = [
  // Nature & Landscapes
  {
    id: 'wall-nature-mountain',
    title: 'Alpine Peaks',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=70',
    isDark: true,
  },
  {
    id: 'wall-nature-forest',
    title: 'Misty Pine Forest',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=70',
    isDark: true,
  },
  {
    id: 'wall-nature-ocean',
    title: 'Pacific Coast Waves',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=70',
    isDark: false,
  },
  {
    id: 'wall-nature-desert',
    title: 'Golden Sunset Dunes',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=70',
    isDark: false,
  },

  // Minimal & Modern Workspaces
  {
    id: 'wall-minimal-desk',
    title: 'Nordic Creative Desk',
    category: 'minimal',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=70',
    isDark: false,
  },
  {
    id: 'wall-minimal-arch',
    title: 'Modern Architecture',
    category: 'minimal',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=70',
    isDark: true,
  },
  {
    id: 'wall-minimal-interior',
    title: 'Warm Studio Loft',
    category: 'minimal',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=70',
    isDark: false,
  },

  // Abstract & Gradients
  {
    id: 'wall-abstract-nebula',
    title: 'Cosmic Galaxy & Stars',
    category: 'abstract',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=70',
    isDark: true,
  },
  {
    id: 'wall-abstract-fluid',
    title: 'Prismatic Fluid Waves',
    category: 'abstract',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=70',
    isDark: true,
  },
  {
    id: 'wall-abstract-mesh',
    title: 'Iridescent Mesh',
    category: 'abstract',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=70',
    isDark: false,
  },

  // City & Atmosphere
  {
    id: 'wall-city-skyline',
    title: 'Tokyo Neon Twilight',
    category: 'city',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=70',
    isDark: true,
  },
  {
    id: 'wall-city-ny',
    title: 'Manhattan Golden Hour',
    category: 'city',
    url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=2000&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=70',
    isDark: true,
  },
];

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: BoardTheme;
  onApplyTheme: (newTheme: BoardTheme) => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onApplyTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'curated' | 'upload' | 'url' | 'gradients'>('curated');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'nature' | 'minimal' | 'abstract' | 'city'>('all');
  
  // Custom states
  const [urlInput, setUrlInput] = useState(currentTheme.wallpaperUrl || '');
  const [urlPreviewError, setUrlPreviewError] = useState(false);
  const [opacity, setOpacity] = useState(currentTheme.wallpaperOpacity ?? 100);
  const [blur, setBlur] = useState(currentTheme.wallpaperBlur ?? 0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredPresets = selectedCategory === 'all'
    ? CURATED_WALLPAPERS
    : CURATED_WALLPAPERS.filter((w) => w.category === selectedCategory);

  const handleSelectPreset = (preset: WallpaperPreset) => {
    onApplyTheme({
      ...currentTheme,
      id: `custom-wall-${preset.id}`,
      name: preset.title,
      wallpaperUrl: preset.url,
      wallpaperOpacity: opacity,
      wallpaperBlur: blur,
      isDark: preset.isDark,
      cardBg: preset.isDark ? 'bg-white/95 dark:bg-slate-900/90' : 'bg-white',
      headerBg: preset.isDark ? 'bg-slate-900/80 backdrop-blur-md text-white border-b border-white/10' : 'bg-[#0055CC] text-white',
    });
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onApplyTheme({
      ...currentTheme,
      id: `custom-wall-url-${Date.now()}`,
      name: 'Custom Image Wallpaper',
      wallpaperUrl: urlInput.trim(),
      wallpaperOpacity: opacity,
      wallpaperBlur: blur,
      isDark: true,
      cardBg: 'bg-white/95 dark:bg-slate-900/90',
      headerBg: 'bg-slate-900/80 backdrop-blur-md text-white border-b border-white/10',
    });
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        onApplyTheme({
          ...currentTheme,
          id: `custom-wall-upload-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          wallpaperUrl: dataUrl,
          wallpaperOpacity: opacity,
          wallpaperBlur: blur,
          isDark: true,
          cardBg: 'bg-white/95 dark:bg-slate-900/90',
          headerBg: 'bg-slate-900/80 backdrop-blur-md text-white border-b border-white/10',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWallpaper = () => {
    onApplyTheme({
      ...currentTheme,
      wallpaperUrl: undefined,
      wallpaperBlur: undefined,
      wallpaperOpacity: undefined,
      gradient: 'bg-[#F1F2F4]',
      cardBg: 'bg-white',
      headerBg: 'bg-[#0055CC] text-white',
      isDark: false,
    });
  };

  const handleUpdateFineTuning = (newOpacity: number, newBlur: number) => {
    setOpacity(newOpacity);
    setBlur(newBlur);
    if (currentTheme.wallpaperUrl) {
      onApplyTheme({
        ...currentTheme,
        wallpaperOpacity: newOpacity,
        wallpaperBlur: newBlur,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden font-sans"
        id="wallpaper-customizer-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-[#0055CC] dark:text-blue-400 rounded-xl">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Board Wallpaper & Background
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize your Kanban workspace with high-res photos, uploads, or gradients
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentTheme.wallpaperUrl && (
              <button
                type="button"
                onClick={handleRemoveWallpaper}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors"
                title="Remove current wallpaper"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Wallpaper</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 text-xs font-semibold gap-2 pt-2">
          {[
            { id: 'curated', label: 'Photo Wallpapers', icon: Sparkles },
            { id: 'upload', label: 'Upload Image', icon: Upload },
            { id: 'url', label: 'Image URL / Link', icon: LinkIcon },
            { id: 'gradients', label: 'Colors & Gradients', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all ${
                  isActive
                    ? 'border-[#0055CC] text-[#0055CC] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Curated Photos */}
          {activeTab === 'curated' && (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'all', label: 'All Photos' },
                  { id: 'nature', label: 'Nature & Mountains' },
                  { id: 'minimal', label: 'Minimal Workspace' },
                  { id: 'abstract', label: 'Abstract & Galaxy' },
                  { id: 'city', label: 'City & Lights' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-[#0055CC] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5" id="wallpaper-presets-grid">
                {filteredPresets.map((preset) => {
                  const isSelected = currentTheme.wallpaperUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`group relative h-32 rounded-xl overflow-hidden cursor-pointer border-2 transition-all shadow-xs hover:shadow-md ${
                        isSelected
                          ? 'border-[#0055CC] ring-2 ring-[#0055CC]/30 scale-[1.02]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={preset.thumbUrl}
                        alt={preset.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-2.5">
                        <span className="text-xs font-semibold text-white truncate drop-shadow-xs">
                          {preset.title}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#0055CC] rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Upload Custom Image */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[#0055CC] bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-[#0055CC] bg-slate-50/50 dark:bg-slate-800/30'
                }`}
                id="wallpaper-drop-zone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-[#0055CC] dark:text-blue-400 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Drop your wallpaper image here, or browse
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PNG, JPG, WebP (Instant local upload, stays saved with your board)
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-1.5 bg-[#0055CC] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Select File from Computer
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Direct Image URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Paste Direct Image Link (URL)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setUrlPreviewError(false);
                      }}
                      placeholder="https://images.unsplash.com/... or https://example.com/wallpaper.jpg"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055CC]"
                      id="wallpaper-url-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    disabled={!urlInput.trim()}
                    className="px-4 py-2 bg-[#0055CC] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0"
                  >
                    Apply Wallpaper
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              {urlInput.trim() && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Live Image Preview</span>
                  <div className="h-40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-900">
                    <img
                      src={urlInput}
                      alt="URL Preview"
                      onError={() => setUrlPreviewError(true)}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {urlPreviewError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-rose-300 text-xs font-semibold p-4 text-center">
                        Unable to load image. Please verify the URL is public and ends with an image format.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Gradients & Colors */}
          {activeTab === 'gradients' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {BOARD_THEMES.map((theme) => {
                  const isSelected = currentTheme.id === theme.id && !currentTheme.wallpaperUrl;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onApplyTheme({
                          ...theme,
                          wallpaperUrl: undefined,
                        });
                      }}
                      className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left transition-all border-2 ${
                        isSelected
                          ? 'border-[#0055CC] ring-2 ring-[#0055CC]/30 scale-[1.02]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      } ${theme.gradient}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${theme.isDark ? 'text-white' : 'text-slate-900'}`}>
                          {theme.name}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 bg-[#0055CC] rounded-full flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] opacity-75 ${theme.isDark ? 'text-slate-200' : 'text-slate-600'}`}>
                        {theme.isDark ? 'Dark Theme' : 'Light Theme'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fine Tuning Sliders (if wallpaper active) */}
          {currentTheme.wallpaperUrl && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0055CC]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Wallpaper Display Adjustments
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Background Brightness / Opacity</span>
                    <span className="font-bold text-[#0055CC]">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={opacity}
                    onChange={(e) => handleUpdateFineTuning(Number(e.target.value), blur)}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0055CC]"
                  />
                </div>

                {/* Blur Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Soft Focus / Blur</span>
                    <span className="font-bold text-[#0055CC]">{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={blur}
                    onChange={(e) => handleUpdateFineTuning(opacity, Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#0055CC]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {currentTheme.wallpaperUrl ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Wallpaper active: {currentTheme.name}</span>
              </span>
            ) : (
              <span>Using default board theme</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#0055CC] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
