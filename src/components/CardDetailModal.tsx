import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CreditCard,
  AlignLeft,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Tag,
  Users,
  Calendar,
  Flame,
  Palette,
  Trash2,
  Plus,
  Check,
  ExternalLink,
  TableProperties,
  Upload,
  Image as ImageIcon,
  FileText,
  Download,
  Eye,
  Maximize2,
  File,
  Layers,
  Folder,
  HardDrive,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import {
  CardAttachment,
  CardComment,
  CardItem,
  CardLabel,
  CardMember,
  CardStatus,
  ColumnList,
  PriorityLevel,
} from '../types';
import {
  CARD_STATUS_CONFIG,
  ALL_CARD_STATUSES,
  getNormalizedCardStatus,
} from '../utils/statusConfig';
import { CardDriveFolderModal } from './CardDriveFolderModal';
import {
  uploadFileToDriveFolder,
  isDriveConnected,
  requestGoogleDriveToken,
} from '../services/googleDriveService';

interface CardDetailModalProps {
  card: CardItem;
  lists: ColumnList[];
  onClose: () => void;
  onUpdateCard: (updatedCard: CardItem) => void;
  onDeleteCard: (cardId: string) => void;
  currentUser?: { name: string; avatar?: string; email?: string } | null;
  onOpenOrgMessages?: (card: CardItem) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

const COVER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

const PRESET_LABEL_OPTIONS: Omit<CardLabel, 'id'>[] = [
  { name: 'Feature', color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
  { name: 'Bug', color: '#ef4444', bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
  { name: 'UI / UX', color: '#8b5cf6', bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
  { name: 'Frontend', color: '#0ea5e9', bg: 'bg-sky-100 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300' },
  { name: 'Backend', color: '#6366f1', bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300' },
  { name: 'Security', color: '#f43f5e', bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
  { name: 'Integration', color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
];

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  lists,
  onClose,
  onUpdateCard,
  onDeleteCard,
  currentUser,
  onOpenOrgMessages,
}) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Attachments state
  const [attachmentTab, setAttachmentTab] = useState<'upload' | 'link'>('upload');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressStatus, setUploadProgressStatus] = useState<string>('');
  const [isDragOverAtt, setIsDragOverAtt] = useState(false);

  // Google Drive Folder Modal state
  const [showDriveFolderModal, setShowDriveFolderModal] = useState(false);

  // Preview Lightbox state (for Photos & PDFs)
  const [previewAttachment, setPreviewAttachment] = useState<CardAttachment | null>(null);

  // Member & Label inputs
  const [newMemberName, setNewMemberName] = useState('');
  const [showMemberInput, setShowMemberInput] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
  }, [card.id, card.title, card.description]);

  // Sync back changes immediately
  const handleTitleBlur = () => {
    if (title.trim() && title !== card.title) {
      onUpdateCard({ ...card, title: title.trim(), updatedAt: new Date().toISOString() });
    }
  };

  const handleDescSave = () => {
    onUpdateCard({ ...card, description, updatedAt: new Date().toISOString() });
    setIsEditingDesc(false);
  };

  const handleListChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetListId = e.target.value;
    const targetList = lists.find((l) => l.id === targetListId);
    const isDone = targetList?.title.toLowerCase().includes('done') || targetList?.title.toLowerCase().includes('complete');
    onUpdateCard({
      ...card,
      listId: targetListId,
      completed: isDone,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleStatusChange = (status: CardStatus) => {
    const isDone = status === 'done';
    let matchingListId = card.listId;
    if (status === 'done') {
      matchingListId = lists.find((l) => l.title.toLowerCase().includes('done') || l.title.toLowerCase().includes('complete'))?.id || card.listId;
    } else if (status === 'in_process') {
      matchingListId = lists.find((l) => l.title.toLowerCase().includes('progress') || l.title.toLowerCase().includes('process'))?.id || card.listId;
    } else if (status === 'in_review') {
      matchingListId = lists.find((l) => l.title.toLowerCase().includes('review'))?.id || card.listId;
    } else if (status === 'backlog') {
      matchingListId = lists.find((l) => l.title.toLowerCase().includes('backlog'))?.id || card.listId;
    } else if (status === 'pending') {
      matchingListId = lists.find((l) => l.title.toLowerCase().includes('todo') || l.title.toLowerCase().includes('pending'))?.id || card.listId;
    }

    onUpdateCard({
      ...card,
      status,
      completed: isDone,
      listId: matchingListId,
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePriorityChange = (priority: PriorityLevel) => {
    onUpdateCard({ ...card, priority, updatedAt: new Date().toISOString() });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateCard({
      ...card,
      startDate: e.target.value || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleEtaDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateCard({
      ...card,
      etaDate: e.target.value || undefined,
      dueDate: e.target.value || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateCard({
      ...card,
      dueDate: e.target.value || undefined,
      etaDate: e.target.value || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCoverColorSelect = (color?: string) => {
    onUpdateCard({
      ...card,
      coverColor: card.coverColor === color ? undefined : color,
      coverImage: undefined, // Clear image cover when selecting color
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSetCoverImage = (imgUrl: string) => {
    onUpdateCard({
      ...card,
      coverImage: card.coverImage === imgUrl ? undefined : imgUrl,
      coverColor: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  // Labels Actions
  const handleToggleLabel = (labelOption: Omit<CardLabel, 'id'>) => {
    const exists = card.labels.find((l) => l.name.toLowerCase() === labelOption.name.toLowerCase());
    let updatedLabels: CardLabel[];
    if (exists) {
      updatedLabels = card.labels.filter((l) => l.name.toLowerCase() !== labelOption.name.toLowerCase());
    } else {
      updatedLabels = [
        ...card.labels,
        {
          id: `lbl-${Date.now()}`,
          name: labelOption.name,
          color: labelOption.color,
          bg: labelOption.bg,
          text: labelOption.text,
        },
      ];
    }
    onUpdateCard({ ...card, labels: updatedLabels, updatedAt: new Date().toISOString() });
  };

  const handleCreateCustomLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    const newLbl: CardLabel = {
      id: `lbl-${Date.now()}`,
      name: newLabelName.trim(),
      color: '#6366f1',
      bg: 'bg-indigo-100 dark:bg-indigo-950/60',
      text: 'text-indigo-700 dark:text-indigo-300',
    };
    onUpdateCard({
      ...card,
      labels: [...card.labels, newLbl],
      updatedAt: new Date().toISOString(),
    });
    setNewLabelName('');
    setShowLabelInput(false);
  };

  // Member Actions
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const name = newMemberName.trim();
    const newMember: CardMember = {
      id: `usr-${Date.now()}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    };
    onUpdateCard({
      ...card,
      assignees: [...card.assignees, newMember],
      updatedAt: new Date().toISOString(),
    });
    setNewMemberName('');
    setShowMemberInput(false);
  };

  const handleRemoveMember = (memberId: string) => {
    onUpdateCard({
      ...card,
      assignees: card.assignees.filter((m) => m.id !== memberId),
      updatedAt: new Date().toISOString(),
    });
  };

  // -------------------------------------------------------------
  // File Upload Handlers (Direct to Drive Folder or Local Embed)
  // -------------------------------------------------------------
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const newAttachments: CardAttachment[] = [];
    const hasDriveFolder = Boolean(card.driveFolderId);
    const driveConnected = isDriveConnected();

    // Check if we should upload to Google Drive
    if (hasDriveFolder && driveConnected) {
      setUploadProgressStatus(`Uploading to Google Drive folder "${card.driveFolderName || 'Card Folder'}"...`);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        const fileType = isPdf ? 'pdf' : isImage ? 'image' : 'file';

        try {
          setUploadProgressStatus(`Uploading ${file.name} to Google Drive (${i + 1}/${fileArray.length})...`);
          
          // Also create local preview fallback dataUrl for instant snappy rendering
          const dataUrl = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = (e) => res((e.target?.result as string) || '');
            r.readAsDataURL(file);
          });

          // Upload directly into card's Drive folder
          const driveResult = await uploadFileToDriveFolder(file, card.driveFolderId!);

          const attachment: CardAttachment = {
            id: `att-drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            url: driveResult.webViewLink || dataUrl,
            type: fileType,
            size: driveResult.size || formatBytes(file.size),
            mimeType: file.type,
            driveFileId: driveResult.fileId,
            driveFolderId: card.driveFolderId,
            driveFileUrl: driveResult.webViewLink,
            uploadedAt: new Date().toISOString(),
            uploadStatus: 'success',
            createdAt: new Date().toISOString(),
          };
          newAttachments.push(attachment);
        } catch (err: any) {
          console.error('Google Drive direct upload failed for', file.name, err);
          // Fallback to local embedded attachment if Drive upload errors
          const dataUrl = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = (e) => res((e.target?.result as string) || '');
            r.readAsDataURL(file);
          });

          const attachment: CardAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            url: dataUrl,
            type: fileType,
            size: formatBytes(file.size),
            mimeType: file.type,
            uploadStatus: 'error',
            uploadError: err.message || 'Drive upload failed, saved locally',
            createdAt: new Date().toISOString(),
          };
          newAttachments.push(attachment);
        }
      }
    } else {
      // Standard local embedded file reader
      setUploadProgressStatus('Attaching files...');
      for (const file of fileArray) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        const fileType = isPdf ? 'pdf' : isImage ? 'image' : 'file';

        const dataUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = (e) => res((e.target?.result as string) || '');
          r.readAsDataURL(file);
        });

        if (dataUrl) {
          const attachment: CardAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            url: dataUrl,
            type: fileType,
            size: formatBytes(file.size),
            mimeType: file.type,
            createdAt: new Date().toISOString(),
          };
          newAttachments.push(attachment);
        }
      }
    }

    setIsUploading(false);
    setUploadProgressStatus('');

    onUpdateCard({
      ...card,
      attachments: [...(card.attachments || []), ...newAttachments],
      coverImage: card.coverImage || newAttachments.find((a) => a.type === 'image')?.url,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddLinkAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
    const newAtt: CardAttachment = {
      id: `att-${Date.now()}`,
      name: newAttachmentName.trim(),
      url: newAttachmentUrl.trim(),
      type: 'link',
      createdAt: new Date().toISOString(),
    };
    onUpdateCard({
      ...card,
      attachments: [...(card.attachments || []), newAtt],
      updatedAt: new Date().toISOString(),
    });
    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setShowAttachmentInput(false);
  };

  const handleDeleteAttachment = (attId: string) => {
    const updated = (card.attachments || []).filter((a) => a.id !== attId);
    const target = card.attachments?.find((a) => a.id === attId);
    onUpdateCard({
      ...card,
      attachments: updated,
      // If deleted attachment was the cover image, reset cover image
      coverImage: target && card.coverImage === target.url ? undefined : card.coverImage,
      updatedAt: new Date().toISOString(),
    });
  };

  // Comments Actions
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const comment: CardComment = {
      id: `comm-${Date.now()}`,
      authorName: currentUser?.name || 'You',
      authorAvatar: currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=You`,
      authorEmail: currentUser?.email,
      text: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };
    onUpdateCard({
      ...card,
      comments: [comment, ...(card.comments || [])],
      updatedAt: new Date().toISOString(),
    });
    setNewCommentText('');
  };

  // Custom Fields change
  const handleCustomFieldChange = (key: string, val: string) => {
    onUpdateCard({
      ...card,
      customFields: {
        ...card.customFields,
        [key]: val,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const effectiveEta = card.etaDate || card.dueDate;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          id="card-detail-modal-container"
        >
          {/* Top Visual Cover (Photo Cover or Solid Color Banner) */}
          {card.coverImage ? (
            <div className="relative h-44 w-full shrink-0 overflow-hidden group bg-slate-950">
              <img
                src={card.coverImage}
                alt="Campaign Cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetCoverImage(card.coverImage!)}
                  className="px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs font-semibold backdrop-blur-md transition-colors"
                >
                  Remove Cover Photo
                </button>
              </div>
            </div>
          ) : card.coverColor ? (
            <div className="h-14 w-full shrink-0" style={{ backgroundColor: card.coverColor }} />
          ) : null}

          {/* Modal Header */}
          <div className="p-4 sm:p-6 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <CreditCard className="w-5 h-5 text-slate-500 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#0055CC] focus:outline-none px-1 py-0.5 rounded transition-all"
                  placeholder="Campaign title..."
                />
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>in list</span>
                  <select
                    value={card.listId}
                    onChange={handleListChange}
                    className="font-bold text-[#0055CC] dark:text-blue-400 bg-transparent border-none focus:outline-none cursor-pointer hover:underline"
                  >
                    {lists.map((l) => (
                      <option key={l.id} value={l.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Content Area (2 Cols) */}
            <div className="md:col-span-2 space-y-6">
              {/* Quick Status / Priority / Start Date / ETA Date Bar */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                {/* Card Status Selector (Done, Pending, In Process, Hold, In Review, Backlog) */}
                <div className="flex items-center flex-wrap gap-1.5 w-full pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1 mr-1">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Status:</span>
                  </span>
                  {ALL_CARD_STATUSES.map((st) => {
                    const cfg = CARD_STATUS_CONFIG[st];
                    const activeStatus = getNormalizedCardStatus(card);
                    const isSelected = activeStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(st)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all border ${
                          isSelected
                            ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-indigo-500/30 scale-105 shadow-2xs`
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Priority Selector */}
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Priority:</span>
                  {(['urgent', 'high', 'medium', 'low'] as PriorityLevel[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                        card.priority === p
                          ? p === 'urgent'
                            ? 'bg-red-600 text-white'
                            : p === 'high'
                            ? 'bg-amber-500 text-slate-950'
                            : p === 'medium'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                {/* Start Date Picker */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Start:</span>
                  <input
                    type="date"
                    value={card.startDate || ''}
                    onChange={handleStartDateChange}
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-sky-500 font-semibold"
                  />
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                {/* ETA Date Picker */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0055CC]" />
                  <span className="text-[11px] font-bold text-[#0055CC] uppercase">ETA:</span>
                  <input
                    type="date"
                    value={effectiveEta || ''}
                    onChange={handleEtaDateChange}
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-sky-500 font-semibold"
                  />
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
                    <AlignLeft className="w-4 h-4 text-slate-400" />
                    <span>Campaign Brief & Description</span>
                  </div>
                  {!isEditingDesc && (
                    <button
                      onClick={() => setIsEditingDesc(true)}
                      className="text-xs font-semibold text-[#0055CC] hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add campaign deliverables, targets, or brief notes..."
                      rows={4}
                      className="w-full p-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055CC]"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDescSave}
                        className="px-3 py-1.5 bg-[#0055CC] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setDescription(card.description);
                          setIsEditingDesc(false);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 min-h-[60px] cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors whitespace-pre-wrap"
                  >
                    {card.description || <span className="text-slate-400 italic">No campaign brief provided. Click to add details...</span>}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* ATTACHMENTS & PHOTOS & PDFS SECTION */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-3" id="task-attachments-section">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
                    <Paperclip className="w-4 h-4 text-[#0055CC]" />
                    <span>Attachments, Photos & PDFs</span>
                    {card.attachments && card.attachments.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0055CC] dark:text-blue-400 text-[10px] font-bold">
                        {card.attachments.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Google Drive Folder Selector Button */}
                    <button
                      type="button"
                      onClick={() => setShowDriveFolderModal(true)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border shadow-2xs ${
                        card.driveFolderId
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                      }`}
                      title={
                        card.driveFolderId
                          ? `Linked to Google Drive folder: ${card.driveFolderName || card.driveFolderId}`
                          : 'Connect dedicated Google Drive folder for this card'
                      }
                      id="card-drive-folder-btn"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>
                        {card.driveFolderId ? (
                          <span className="truncate max-w-[130px] inline-block align-bottom font-bold">
                            📁 {card.driveFolderName || 'Drive Linked'}
                          </span>
                        ) : (
                          'Connect Drive Folder'
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0055CC] hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                      id="upload-file-btn"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo / PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentInput(!showAttachmentInput);
                        setAttachmentTab('link');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Attach Link
                    </button>
                  </div>
                </div>

                {/* Card Google Drive Folder Indicator Banner if connected */}
                {card.driveFolderId && (
                  <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 truncate">
                      <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">
                        Uploading to Google Drive Folder: <strong className="text-blue-950 dark:text-white font-bold">"{card.driveFolderName || card.driveFolderId}"</strong>
                      </span>
                    </div>
                    {card.driveFolderUrl && (
                      <a
                        href={card.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Folder</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Upload Progress Status Banner */}
                {uploadProgressStatus && (
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-semibold">{uploadProgressStatus}</span>
                  </div>
                )}

                {/* Hidden Multi-file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp,.gif,.svg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processFiles(e.target.files);
                    }
                  }}
                />

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverAtt(true);
                  }}
                  onDragLeave={() => setIsDragOverAtt(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverAtt(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      processFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 border-2 border-dashed rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer transition-all ${
                    isDragOverAtt
                      ? 'border-[#0055CC] bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-[#0055CC]/20'
                      : 'border-slate-200 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/40 hover:border-[#0055CC]/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#0055CC] dark:text-blue-400 shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isUploading
                          ? uploadProgressStatus || 'Reading and uploading files...'
                          : card.driveFolderId
                          ? `Upload to Drive Folder "${card.driveFolderName || 'Card Folder'}"`
                          : 'Upload Photos, PDFs, or Documents'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {card.driveFolderId
                          ? 'Files automatically upload directly to your connected Google Drive folder'
                          : 'Drag & drop or click to attach (connect a Google Drive folder anytime)'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#0055CC] dark:text-blue-400 shrink-0 hover:underline">
                    Browse Files
                  </span>
                </div>

                {/* External Link Input Form */}
                {showAttachmentInput && (
                  <form
                    onSubmit={handleAddLinkAttachment}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2.5 animate-in fade-in"
                  >
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Attach Web Link / Google Drive / Figma
                    </div>
                    <input
                      type="text"
                      placeholder="Attachment Title (e.g. Design Specs, Figma Link)"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <input
                      type="url"
                      placeholder="URL (https://...)"
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-[#0055CC] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                      >
                        Attach Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAttachmentInput(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Rendered Attachments List */}
                {card.attachments && card.attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {card.attachments.map((att) => {
                      const isImage =
                        att.type === 'image' ||
                        att.url.startsWith('data:image/') ||
                        /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(att.url);
                      const isPdf =
                        att.type === 'pdf' ||
                        att.url.startsWith('data:application/pdf') ||
                        /\.pdf($|\?)/i.test(att.url) ||
                        att.name.toLowerCase().endsWith('.pdf');
                      const isCover = card.coverImage === att.url;

                      return (
                        <div
                          key={att.id}
                          className="flex flex-col justify-between p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Thumbnail / Icon */}
                            {isImage ? (
                              <div
                                onClick={() => setPreviewAttachment(att)}
                                className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0 cursor-pointer relative group/thumb"
                                title="Click to view full photo"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : isPdf ? (
                              <div
                                onClick={() => setPreviewAttachment(att)}
                                className="w-14 h-14 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/70 flex flex-col items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 cursor-pointer hover:bg-rose-100 transition-colors"
                                title="Click to preview PDF"
                              >
                                <FileText className="w-6 h-6" />
                                <span className="text-[9px] font-extrabold uppercase mt-0.5 tracking-wider">PDF</span>
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/70 flex items-center justify-center text-[#0055CC] dark:text-blue-400 shrink-0">
                                <Paperclip className="w-6 h-6" />
                              </div>
                            )}

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
                                {att.name}
                              </p>
                              
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                                {isPdf && (
                                  <span className="px-1.5 py-0.2 rounded font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 uppercase">
                                    PDF Doc
                                  </span>
                                )}
                                {isImage && (
                                  <span className="px-1.5 py-0.2 rounded font-bold bg-blue-100 dark:bg-blue-950 text-[#0055CC] dark:text-blue-300 uppercase">
                                    Image
                                  </span>
                                )}
                                {att.driveFileId && (
                                  <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5" title="Directly saved in Google Drive">
                                    <span>📁 Drive File</span>
                                  </span>
                                )}
                                {att.size && <span>{att.size}</span>}
                              </div>

                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="text-[11px] font-bold text-[#0055CC] hover:underline flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Preview</span>
                                </button>

                                <a
                                  href={att.url}
                                  download={att.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>

                                {isImage && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetCoverImage(att.url)}
                                    className={`text-[11px] font-bold transition-colors ${
                                      isCover
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-500 hover:text-[#0055CC]'
                                    }`}
                                  >
                                    {isCover ? '✓ Cover' : 'Make Cover'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Delete Action */}
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Fields (Mapped from Spreadsheet) */}
              {Object.keys(card.customFields || {}).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
                    <TableProperties className="w-4 h-4 text-slate-400" />
                    <span>Spreadsheet Custom Columns</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    {Object.entries(card.customFields).map(([key, val]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {key}
                        </label>
                        <input
                          type="text"
                          value={String(val ?? '')}
                          onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity & Comments Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>Activity & Comments</span>
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddComment} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {currentUser?.name ? currentUser.name[0] : 'Y'}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Write a comment or activity note..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0055CC] hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors shadow-xs"
                    >
                      Comment
                    </button>
                  </div>
                </form>

                {/* Comment List */}
                <div className="space-y-2.5 pt-2">
                  {card.comments &&
                    card.comments.map((comm) => (
                      <div
                        key={comm.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={comm.authorAvatar}
                              alt={comm.authorName}
                              className="w-5 h-5 rounded-full"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {comm.authorName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comm.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 pl-7">{comm.text}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Sidebar Actions Column (1 Col) */}
            <div className="space-y-5">
              {/* Quick Attach Photo/PDF button */}
              <div>
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachments</span>
                </h5>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#0055CC] dark:text-blue-400 hover:bg-blue-100 font-bold text-xs transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo / PDF</span>
                </button>
              </div>

              {/* Cover Color Picker */}
              <div>
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Card Color Cover</span>
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {COVER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleCoverColorSelect(color)}
                      className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 relative flex items-center justify-center shadow-xs ${
                        card.coverColor === color ? 'ring-2 ring-sky-500 scale-105' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {card.coverColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                  {(card.coverColor || card.coverImage) && (
                    <button
                      onClick={() => {
                        onUpdateCard({
                          ...card,
                          coverColor: undefined,
                          coverImage: undefined,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Members Manager */}
              <div>
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Assignees & Creator</span>
                </h5>

                <div className="space-y-2">
                  {/* Creator Card */}
                  <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <span>👑</span>
                        <span>Creator / Author</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={card.creator?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(card.creator?.name || 'Alex Rivera')}`}
                        alt={card.creator?.name || 'Alex Rivera'}
                        className="w-5 h-5 rounded-full border border-amber-300 dark:border-amber-700"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {card.creator?.name || 'Alex Rivera'}
                      </span>
                    </div>
                  </div>

                  {/* Assignees list */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pt-1">
                      Assigned Members
                    </span>
                    {card.assignees.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {m.name}
                          </span>
                          {card.creator && card.creator.name.toLowerCase() === m.name.toLowerCase() && (
                            <span className="text-[9px] px-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold rounded">
                              Author
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove assignee"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {card.assignees.length === 0 && (
                      <p className="text-[11px] text-slate-400 italic py-1">No additional assignees.</p>
                    )}

                    {showMemberInput ? (
                      <form onSubmit={handleAddMember} className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="Member Name (e.g. John Doe)"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-[#0055CC] text-white rounded-lg text-xs font-semibold"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMemberInput(false)}
                            className="px-2 py-1 text-xs text-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowMemberInput(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Assignee</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Labels Selector */}
              <div>
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Toggle Labels</span>
                </h5>

                <div className="space-y-1">
                  {PRESET_LABEL_OPTIONS.map((lbl) => {
                    const isSelected = card.labels.some((l) => l.name.toLowerCase() === lbl.name.toLowerCase());
                    return (
                      <button
                        key={lbl.name}
                        onClick={() => handleToggleLabel(lbl)}
                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${lbl.bg} ${lbl.text}`}
                      >
                        <span>{lbl.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>

                {showLabelInput ? (
                  <form onSubmit={handleCreateCustomLabel} className="mt-2 space-y-1.5">
                    <input
                      type="text"
                      placeholder="Custom label name..."
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-[#0055CC] text-white rounded-lg text-xs font-semibold"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLabelInput(false)}
                        className="px-2 py-1 text-xs text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowLabelInput(true)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Label</span>
                  </button>
                )}
              </div>

              {/* Organization Messenger & Team Discussion */}
              {onOpenOrgMessages && (
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Organization Chat</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenOrgMessages(card);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Discuss in Org Messages</span>
                  </button>
                </div>
              )}

              {/* Delete Campaign Action */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => onDeleteCard(card.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs transition-colors cursor-pointer"
                  id="card-modal-delete-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Campaign</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FULLSCREEN LIGHTBOX & PREVIEW FOR PHOTO AND PDF */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {previewAttachment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700"
            >
              {/* Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  {previewAttachment.type === 'pdf' || previewAttachment.name.toLowerCase().endsWith('.pdf') ? (
                    <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <span className="text-sm font-bold truncate">{previewAttachment.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => setPreviewAttachment(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60">
                {previewAttachment.type === 'pdf' || previewAttachment.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewAttachment.url}
                    title={previewAttachment.name}
                    className="w-full h-[65vh] rounded-lg border border-slate-800 bg-white"
                  />
                ) : (
                  <img
                    src={previewAttachment.url}
                    alt={previewAttachment.name}
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
