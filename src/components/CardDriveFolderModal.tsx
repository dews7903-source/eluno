import React, { useState, useEffect } from 'react';
import {
  Folder,
  Plus,
  Search,
  ExternalLink,
  Check,
  RefreshCw,
  FolderPlus,
  AlertCircle,
  HardDrive,
  X,
  Link,
  Unlink,
} from 'lucide-react';
import { CardItem } from '../types';
import {
  listDriveFolders,
  createDriveFolder,
  isDriveConnected,
  requestGoogleDriveToken,
  DriveFolderItem,
} from '../services/googleDriveService';

interface CardDriveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardItem;
  onSaveDriveFolder: (cardId: string, folderId?: string, folderName?: string, folderUrl?: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const CardDriveFolderModal: React.FC<CardDriveFolderModalProps> = ({
  isOpen,
  onClose,
  card,
  onSaveDriveFolder,
  onShowToast,
}) => {
  const [isConnected, setIsConnected] = useState(isDriveConnected());
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection / manual entry state
  const [selectedFolderId, setSelectedFolderId] = useState(card.driveFolderId || '');
  const [selectedFolderName, setSelectedFolderName] = useState(card.driveFolderName || '');
  const [selectedFolderUrl, setSelectedFolderUrl] = useState(card.driveFolderUrl || '');

  // New folder creation state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState(`${card.title} - Assets`);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConnected(isDriveConnected());
      setSelectedFolderId(card.driveFolderId || '');
      setSelectedFolderName(card.driveFolderName || '');
      setSelectedFolderUrl(card.driveFolderUrl || '');
      setNewFolderName(`${card.title} - Assets`);
      if (isDriveConnected()) {
        loadFolders();
      }
    }
  }, [isOpen, card]);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const folderList = await listDriveFolders();
      setFolders(folderList);
    } catch (err: any) {
      onShowToast('error', 'Google Drive Error', err.message || 'Could not load folders.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsConnecting(true);
    try {
      const { user } = await requestGoogleDriveToken();
      setIsConnected(true);
      onShowToast('success', 'Google Drive Connected', `Connected as ${user?.name || user?.email || 'Google User'}`);
      loadFolders();
    } catch (err: any) {
      onShowToast('error', 'Connection Failed', err.message || 'Failed to authorize Google Drive');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    try {
      const newFolder = await createDriveFolder(newFolderName.trim());
      setFolders((prev) => [newFolder, ...prev]);
      setSelectedFolderId(newFolder.id);
      setSelectedFolderName(newFolder.name);
      setSelectedFolderUrl(newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`);
      setIsCreatingNew(false);
      onShowToast('success', 'Folder Created in Drive', `"${newFolder.name}" is now ready for card uploads.`);
    } catch (err: any) {
      onShowToast('error', 'Creation Failed', err.message || 'Could not create folder in Drive');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectFolder = (folder: DriveFolderItem) => {
    setSelectedFolderId(folder.id);
    setSelectedFolderName(folder.name);
    setSelectedFolderUrl(folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`);
  };

  const handleSave = () => {
    onSaveDriveFolder(
      card.id,
      selectedFolderId || undefined,
      selectedFolderName || undefined,
      selectedFolderUrl || undefined
    );
    onShowToast(
      'success',
      'Card Drive Folder Saved',
      selectedFolderId
        ? `Linked to "${selectedFolderName || selectedFolderId}". Files uploaded to this card will sync directly here.`
        : 'Drive folder disconnected from this card.'
    );
    onClose();
  };

  const handleDisconnectCardFolder = () => {
    setSelectedFolderId('');
    setSelectedFolderName('');
    setSelectedFolderUrl('');
  };

  if (!isOpen) return null;

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-slate-100"
        id="card-drive-folder-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Google Drive Folder Settings</h3>
              <p className="text-xs text-blue-200 truncate max-w-md">
                Card: <span className="font-semibold text-white">"{card.title}"</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {/* Current Connection Banner */}
          {!isConnected ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Google Drive Not Connected
                  </h4>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Connect your Google Drive account securely via official Google OAuth to select and link folders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={isConnecting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                {isConnecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5" />
                )}
                <span>Connect Google Drive</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">Google Drive Account Connected</span>
              </div>
              <button
                type="button"
                onClick={loadFolders}
                disabled={isLoading}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Folders</span>
              </button>
            </div>
          )}

          {/* Currently Assigned Folder Status */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-blue-500" />
                <span>Assigned Drive Folder:</span>
              </span>
              {selectedFolderId && (
                <button
                  type="button"
                  onClick={handleDisconnectCardFolder}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Unlink Folder</span>
                </button>
              )}
            </div>

            {selectedFolderId ? (
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedFolderName || 'Linked Folder'}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    Folder ID: {selectedFolderId}
                  </p>
                </div>
                {selectedFolderUrl && (
                  <a
                    href={selectedFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                    title="Open folder in Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Drive</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No folder connected yet. Select or create a folder below so uploads to this card go directly to Google Drive.
              </p>
            )}
          </div>

          {/* Folder Selector / Creator */}
          {isConnected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Existing Folder or Create New
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingNew ? 'Cancel New' : 'Create New Folder'}</span>
                </button>
              </div>

              {/* Create New Folder Inline Form */}
              {isCreatingNew && (
                <form
                  onSubmit={handleCreateNewFolder}
                  className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2.5 animate-in fade-in"
                >
                  <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    New Google Drive Folder Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      {isCreating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Create &amp; Link</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Search Bar for Folders */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search existing Drive folders..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Folder List Scroll Area */}
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Loading Google Drive folders...</span>
                  </div>
                ) : filteredFolders.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    {searchQuery ? `No folders matching "${searchQuery}"` : 'No folders found in Google Drive.'}
                  </div>
                ) : (
                  filteredFolders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id;
                    return (
                      <div
                        key={folder.id}
                        onClick={() => handleSelectFolder(folder)}
                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Folder
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {folder.name}
                            </p>
                            <p className="text-[9px] font-mono text-slate-400 truncate">
                              ID: {folder.id}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Manual ID Input fallback */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <details className="text-xs text-slate-500">
              <summary className="font-semibold cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                Or enter Google Drive Folder ID manually
              </summary>
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={selectedFolderId}
                  onChange={(e) => {
                    setSelectedFolderId(e.target.value.trim());
                    if (!selectedFolderName) setSelectedFolderName('Custom Drive Folder');
                    setSelectedFolderUrl(`https://drive.google.com/drive/folders/${e.target.value.trim()}`);
                  }}
                  placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </details>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {selectedFolderId ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Ready to link "{selectedFolderName || selectedFolderId}"
              </span>
            ) : (
              <span>No folder selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Save Folder Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
