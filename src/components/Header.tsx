import React, { useState } from 'react';
import {
  Kanban,
  Table as TableIcon,
  Calendar as CalendarIcon,
  BarChart3,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Palette,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  Check,
  Plus,
  Share2,
  FileText,
  Search,
  Zap,
  MessageSquare,
  Building2,
  KeyRound,
  Users,
  Layers,
  Briefcase,
  Globe,
} from 'lucide-react';
import { ActiveView, Board, BoardTheme, FilterState, UserOrgProfile, UserProfile } from '../types';
import { BOARD_THEMES } from '../services/sampleData';

interface HeaderProps {
  board: Board;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  filterState: FilterState;
  onToggleFilterBar: () => void;
  onUpdateFilter?: (filter: FilterState) => void;
  user?: UserProfile | null;
  userOrgProfile?: UserOrgProfile;
  isSyncing: boolean;
  onSyncWithGoogleSheets: () => void;
  onOpenSheetModal: () => void;
  onSelectTheme: (theme: BoardTheme) => void;
  onOpenWallpaperModal?: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onUpdateBoardTitle: (title: string) => void;
  hasUnsavedChanges: boolean;
  onToggleAutoSync?: () => void;
  onOpenVariationModal?: () => void;
  onOpenOrgMessages?: () => void;
  onOpenOrgIdManager?: () => void;
  onOpenOnlineWorkspaceModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  board,
  activeView,
  onViewChange,
  filterState,
  onToggleFilterBar,
  onUpdateFilter,
  user,
  userOrgProfile,
  isSyncing,
  onSyncWithGoogleSheets,
  onOpenSheetModal,
  onSelectTheme,
  onOpenWallpaperModal,
  onExportCSV,
  onExportJSON,
  onUpdateBoardTitle,
  hasUnsavedChanges,
  onToggleAutoSync,
  onOpenVariationModal,
  onOpenOrgMessages,
  onOpenOrgIdManager,
  onOpenOnlineWorkspaceModal,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(board.title);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showWorkspaceToolsMenu, setShowWorkspaceToolsMenu] = useState(false);


  // Compute all unique characters on this board for quick one-click filtering
  const allCharacters = React.useMemo(() => {
    const map = new Map<string, { name: string; avatar: string; isCreator: boolean; cardCount: number }>();
    board.cards.forEach((c) => {
      if (c.creator?.name) {
        const name = c.creator.name.trim();
        const existing = map.get(name);
        if (existing) {
          existing.cardCount += 1;
          existing.isCreator = true;
        } else {
          map.set(name, {
            name,
            avatar: c.creator.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            isCreator: true,
            cardCount: 1,
          });
        }
      }
      c.assignees?.forEach((a) => {
        if (a?.name) {
          const name = a.name.trim();
          const existing = map.get(name);
          if (existing) {
            if (!c.creator || c.creator.name.trim() !== name) {
              existing.cardCount += 1;
            }
          } else {
            map.set(name, {
              name,
              avatar: a.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
              isCreator: false,
              cardCount: 1,
            });
          }
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.isCreator && !b.isCreator) return -1;
      if (!a.isCreator && b.isCreator) return 1;
      return b.cardCount - a.cardCount;
    });
  }, [board.cards]);

  const activeFilterCount =
    (filterState.titleQuery?.trim() ? 1 : 0) +
    (filterState.selectedLists?.length || 0) +
    filterState.selectedAssignees.length +
    filterState.selectedLabels.length +
    filterState.selectedPriorities.length +
    (filterState.dueFilter !== 'all' ? 1 : 0) +
    (filterState.searchQuery.trim() ? 1 : 0) +
    (filterState.onlyAssignedToMe ? 1 : 0);

  const handleTitleSubmit = () => {
    if (titleInput.trim() && titleInput !== board.title) {
      onUpdateBoardTitle(titleInput.trim());
    } else {
      setTitleInput(board.title);
    }
    setIsEditingTitle(false);
  };

  const formattedLastSynced = board.lastSyncedAt
    ? new Date(board.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <header className="w-full shrink-0 sticky top-0 z-30 shadow-xs font-sans">
      {/* Primary Top Bar (Atlassian Blue #0055CC) */}
      <nav className="h-[48px] bg-[#0055CC] text-white flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg tracking-tight">
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center shrink-0">
              <div className="w-3 h-4 border-2 border-white rounded-xs"></div>
            </div>
            <span>eluno</span>
          </div>

          {/* Quick Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {onOpenVariationModal && (
              <button
                onClick={onOpenVariationModal}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                id="top-variations-btn"
                title="Preview workflow variations and layout templates"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Variations</span>
              </button>
            )}
            <button
              onClick={onOpenSheetModal}
              className="px-3 py-1.5 text-white/90 hover:bg-white/20 rounded text-xs sm:text-sm font-medium transition-colors"
            >
              Workspaces
            </button>
            <button
              onClick={onOpenSheetModal}
              className="px-3 py-1.5 text-white/90 hover:bg-white/20 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5"
              title="Click to change or configure connected Google Sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span className="max-w-[140px] truncate">{board.sheetTabName || 'Google Sheet'}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
            <button
              onClick={onOpenSheetModal}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Sheet</span>
            </button>
          </div>
        </div>

        {/* Right Search & Profile in Top Nav */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={filterState.searchQuery}
              onChange={(e) => {
                onToggleFilterBar();
              }}
              onClick={onToggleFilterBar}
              className="bg-white/20 hover:bg-white/30 border-none rounded-md px-3 py-1 text-xs sm:text-sm text-white placeholder-white/70 w-32 sm:w-44 outline-none focus:bg-white focus:text-[#172B4D] transition-all cursor-pointer"
            />
          </div>

          {/* Online Login & Workspace Switcher Button */}
          {onOpenOnlineWorkspaceModal && (
            <button
              onClick={onOpenOnlineWorkspaceModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Online Login, Join Workspace Code, or Find Board"
              id="online-login-find-btn"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Online Login / Find</span>
            </button>
          )}

          {/* User / Workspace Profile Pill */}
          <button
            onClick={onOpenOnlineWorkspaceModal || onOpenOrgIdManager}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-xs transition-colors cursor-pointer"
            title="Click to switch user, change workspace, or invite others"
            id="workspace-user-profile-btn"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[10px]">
              {user?.displayName
                ? user.displayName.slice(0, 2).toUpperCase()
                : userOrgProfile?.userName
                ? userOrgProfile.userName.slice(0, 2).toUpperCase()
                : 'JD'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-bold">
                  {user?.displayName || userOrgProfile?.userName || 'Marketing Specialist'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active Online Session" />
              </div>
            </div>
          </button>
        </div>
      </nav>

      {/* Subheader Toolbar (White / Glassmorphism with Board Controls) */}
      <div className="h-[56px] border-b border-[#091E4224] bg-white/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 text-[#172B4D]">
        {/* Left: Editable Title & View Switcher */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          {/* Board Title */}
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(board.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="text-base sm:text-lg font-bold px-2 py-0.5 rounded border border-[#0055CC] text-[#172B4D] focus:outline-none max-w-[200px] sm:max-w-xs"
              id="board-title-input"
            />
          ) : (
            <h1
              onClick={() => {
                setTitleInput(board.title);
                setIsEditingTitle(true);
              }}
              className="text-sm sm:text-base font-bold text-[#172B4D] truncate cursor-pointer hover:text-[#0055CC] transition-colors max-w-[180px] sm:max-w-xs"
              title="Click to rename board"
            >
              {board.title}
            </h1>
          )}

          {/* Segmented View Switcher */}
          <div className="flex items-center bg-[#EBEDF0] rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => onViewChange('kanban')}
              className={`px-2.5 sm:px-3.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeView === 'kanban'
                  ? 'bg-white text-[#172B4D] shadow-xs font-semibold'
                  : 'text-[#44546F] hover:text-[#172B4D]'
              }`}
              id="view-tab-kanban"
            >
              Board
            </button>

            <button
              onClick={() => onViewChange('spreadsheet')}
              className={`px-2.5 sm:px-3.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeView === 'spreadsheet'
                  ? 'bg-white text-[#172B4D] shadow-xs font-semibold'
                  : 'text-[#44546F] hover:text-[#172B4D]'
              }`}
              id="view-tab-spreadsheet"
            >
              Table
            </button>

            <button
              onClick={() => onViewChange('calendar')}
              className={`px-2.5 sm:px-3.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeView === 'calendar'
                  ? 'bg-white text-[#172B4D] shadow-xs font-semibold'
                  : 'text-[#44546F] hover:text-[#172B4D]'
              }`}
              id="view-tab-calendar"
            >
              Timeline
            </button>

            <button
              onClick={() => onViewChange('analytics')}
              className={`hidden md:block px-2.5 sm:px-3.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeView === 'analytics'
                  ? 'bg-white text-[#172B4D] shadow-xs font-semibold'
                  : 'text-[#44546F] hover:text-[#172B4D]'
              }`}
              id="view-tab-analytics"
            >
              Analytics
            </button>
          </div>

          {/* Quick Character Avatars Filter Row */}
          {allCharacters.length > 0 && (
            <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Characters:
              </span>
              <div className="flex items-center -space-x-1.5 hover:space-x-1 transition-all">
                {allCharacters.slice(0, 5).map((char) => {
                  const isSelected = filterState.selectedAssignees.includes(char.name);
                  return (
                    <button
                      key={char.name}
                      type="button"
                      onClick={() => {
                        if (!onUpdateFilter) return;
                        const updated = isSelected
                          ? filterState.selectedAssignees.filter((a) => a !== char.name)
                          : [...filterState.selectedAssignees, char.name];
                        onUpdateFilter({ ...filterState, selectedAssignees: updated });
                      }}
                      className={`relative rounded-full transition-all group shrink-0 ${
                        isSelected
                          ? 'ring-2 ring-[#0055CC] scale-110 z-20 shadow-xs'
                          : 'hover:scale-105 hover:z-10 opacity-90 hover:opacity-100'
                      }`}
                      title={`Filter by ${char.name} (${char.cardCount} cards)${char.isCreator ? ' [Creator]' : ''}`}
                    >
                      <img
                        src={char.avatar}
                        alt={char.name}
                        className="w-6 h-6 rounded-full border border-white bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      {char.isCreator && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] drop-shadow-2xs">
                          👑
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#0055CC] border border-white rounded-full flex items-center justify-center">
                          <Check className="w-1.5 h-1.5 text-white stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {filterState.selectedAssignees.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateFilter?.({ ...filterState, selectedAssignees: [] })}
                  className="text-[10px] text-[#0055CC] font-semibold hover:underline ml-1"
                >
                  Clear ({filterState.selectedAssignees.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Auto-Sync, Filter, Theme, Export, Manual Sync */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Auto-Sync Toggle Button */}
          {onToggleAutoSync && (
            <button
              onClick={onToggleAutoSync}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
                board.autoSync
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'hover:bg-gray-100 border-gray-300 text-gray-500'
              }`}
              title={board.autoSync ? 'Auto-Sync is ON: Local changes automatically update your Google Sheet' : 'Auto-Sync is OFF: Click to enable real-time updates'}
            >
              <div className={`w-2 h-2 rounded-full ${board.autoSync ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span>{board.autoSync ? 'Auto-Sync ON' : 'Auto-Sync OFF'}</span>
            </button>
          )}

          {/* Consolidated Workspace & Tools Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowWorkspaceToolsMenu(!showWorkspaceToolsMenu);
                setShowThemeMenu(false);
                setShowExportMenu(false);
              }}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-900 dark:text-indigo-200 font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              id="toolbar-workspace-tools-btn"
              title="Workspace Tools: Org ID, Org Messages, Wallpaper & Variations"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Workspace Tools</span>
              <ChevronDown className="w-3 h-3 text-indigo-500" />
            </button>

            {showWorkspaceToolsMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 text-slate-800 dark:text-slate-100">
                <div className="px-2 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Organization &amp; Workspace
                </div>

                <div className="space-y-1 mt-1">
                  {/* 1. Organization ID & Members */}
                  {onOpenOrgIdManager && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceToolsMenu(false);
                        onOpenOrgIdManager();
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Org ID &amp; Members
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            {userOrgProfile?.orgId || 'ORG-MARKETING-9021'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Switch Org ID, invite or manage team roster
                        </p>
                      </div>
                    </button>
                  )}

                  {/* 2. Org Messages & Announcements */}
                  {onOpenOrgMessages && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceToolsMenu(false);
                        onOpenOrgMessages();
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Org Messages
                          </span>
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Real-time team chat &amp; campaign milestones
                        </p>
                      </div>
                    </button>
                  )}

                  <div className="my-1.5 border-t border-gray-100 dark:border-slate-800" />
                  <div className="px-2 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Customization &amp; Layouts
                  </div>

                  {/* 3. Board Wallpaper & Themes */}
                  {onOpenWallpaperModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceToolsMenu(false);
                        onOpenWallpaperModal();
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-[#0055CC] dark:text-blue-400 mt-0.5 group-hover:bg-[#0055CC] group-hover:text-white transition-colors">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0055CC] transition-colors">
                            Board Wallpaper
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold">
                            Photos
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Unsplash high-res photos, uploads &amp; gradients
                        </p>
                      </div>
                    </button>
                  )}

                  {/* 4. Variations & Workflow Layouts */}
                  {onOpenVariationModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowWorkspaceToolsMenu(false);
                        onOpenVariationModal();
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 mt-0.5 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                            Layout Variations
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 font-bold">
                            Templates
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Switch board themes, layouts &amp; workflows
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={onToggleFilterBar}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md border flex items-center gap-1.5 transition-colors ${
              activeFilterCount > 0
                ? 'bg-blue-50 border-[#0055CC] text-[#0055CC] font-semibold'
                : 'hover:bg-gray-100 border-gray-300 text-[#172B4D]'
            }`}
            id="toggle-filter-btn"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0055CC] text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowThemeMenu(false);
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm hover:bg-gray-100 rounded-md border border-gray-300 flex items-center gap-1 text-[#44546F]"
              title="Export options"
            >
              <Download className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    onExportCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[#172B4D] hover:bg-gray-100 transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => {
                    onExportJSON();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[#172B4D] hover:bg-gray-100 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-[#0055CC]" />
                  <span>Download JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Sync / Save Action Button */}
          <button
            onClick={onSyncWithGoogleSheets}
            disabled={isSyncing}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md font-medium shadow-xs flex items-center gap-1.5 transition-all ${
              isSyncing
                ? 'bg-blue-400 text-white cursor-wait'
                : hasUnsavedChanges
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold animate-pulse'
                : 'bg-[#0055CC] hover:bg-[#0047AB] text-white'
            }`}
            id="sync-google-sheets-btn"
            title={
              formattedLastSynced
                ? `Last saved: ${formattedLastSynced}. Click to push all updates to Google Sheet.`
                : 'Click to push updates to Google Sheet'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : hasUnsavedChanges ? 'Save to Sheets' : 'Sync Sheet'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
