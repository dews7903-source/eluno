import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveView, Board, BoardTheme, CardItem, CardStatus, ColumnList, FilterState, UserOrgProfile, UserProfile } from './types';
import { INITIAL_BOARD, BOARD_THEMES } from './services/sampleData';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { SpreadsheetView } from './components/SpreadsheetView';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { CardDetailModal } from './components/CardDetailModal';
import { SheetConnectModal } from './components/SheetConnectModal';
import { VariationPreviewModal } from './components/VariationPreviewModal';
import { WallpaperModal } from './components/WallpaperModal';
import { OrgMessagesModal } from './components/OrgMessagesModal';
import { OrgIdManagerModal } from './components/OrgIdManagerModal';
import { OnlineWorkspaceModal } from './components/OnlineWorkspaceModal';
import { FilterBar } from './components/FilterBar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer, ToastMessage } from './components/Toast';
import { initAuth, getAccessToken, saveLocalStoredUser } from './services/localAuthPlugin';
import { getUserOrgProfile, saveUserOrgProfile } from './services/orgMessageService';
import {
  getWorkspaceFromUrl,
  fetchOnlineWorkspace,
  syncBoardToOnlineWorkspace,
  setWorkspaceToUrl,
} from './services/onlineWorkspaceService';
import { subscribeToWorkspaceFromFirestore } from './services/firestoreService';
import {
  writeSheetValues,
  fetchSheetValues,
  parseRawDataToBoard,
  convertCardsToSpreadsheetRows,
  exportBoardToCSV,
} from './services/googleSheets';

const LOCAL_STORAGE_KEY = 'sheetboard_kanban_board_data';

export default function App() {
  // Load initial board from localStorage or use INITIAL_BOARD
  const [board, setBoard] = useState<Board>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return INITIAL_BOARD;
  });

  const [activeView, setActiveView] = useState<ActiveView>('kanban');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals and drawers
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [isOrgMessagesOpen, setIsOrgMessagesOpen] = useState(false);
  const [isOrgIdModalOpen, setIsOrgIdModalOpen] = useState(false);
  const [isOnlineWorkspaceModalOpen, setIsOnlineWorkspaceModalOpen] = useState(false);
  const [orgMessageTargetCampaign, setOrgMessageTargetCampaign] = useState<CardItem | null>(null);
  const [userOrgProfile, setUserOrgProfile] = useState<UserOrgProfile>(() => {
    const urlOrg = getWorkspaceFromUrl();
    const current = getUserOrgProfile();
    if (urlOrg && urlOrg !== current.orgId) {
      const updated = { ...current, orgId: urlOrg };
      saveUserOrgProfile(updated);
      return updated;
    }
    return current;
  });
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    searchQuery: '',
    titleQuery: '',
    selectedLists: [],
    selectedLabels: [],
    selectedPriorities: [],
    selectedAssignees: [],
    dueFilter: 'all',
    onlyAssignedToMe: false,
  });

  // Keep a ref to latest board state for debounced sync
  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load and listen to online workspace board in real-time from Firestore
  useEffect(() => {
    const targetOrg = getWorkspaceFromUrl() || userOrgProfile.orgId;
    if (!targetOrg) return;

    // Initial fetch
    fetchOnlineWorkspace(targetOrg)
      .then((ws) => {
        if (ws && ws.board && ws.board.cards && ws.board.cards.length > 0) {
          setBoard(ws.board);
          setHasUnsavedChanges(false);
        }
      })
      .catch((e) => console.warn('Initial online workspace sync failed:', e));

    // Real-time Firestore live subscription
    const unsubscribe = subscribeToWorkspaceFromFirestore(targetOrg, (wsData) => {
      if (wsData && wsData.board && wsData.board.cards) {
        setBoard((prev) => {
          // Avoid overwriting if timestamps match or no changes
          if (JSON.stringify(prev.cards) !== JSON.stringify(wsData.board?.cards)) {
            return wsData.board as Board;
          }
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, [userOrgProfile.orgId]);

  // Save board to local storage & broadcast to online workspace
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(board));
    } catch (_) {}

    // Debounced online sync to server
    const timer = setTimeout(() => {
      if (userOrgProfile.orgId) {
        syncBoardToOnlineWorkspace(userOrgProfile.orgId, board, userRef.current);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [board, userOrgProfile.orgId]);

  // Initialize Firebase Google Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (userProfile) => {
        setUser(userProfile);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Core Push to Google Sheets helper
  const pushToGoogleSheets = async (targetBoard: Board, silent = false) => {
    if (!targetBoard.spreadsheetId) return false;

    const token = await getAccessToken();
    const tabName = targetBoard.sheetTabName || 'Sheet1';
    const rows = convertCardsToSpreadsheetRows(
      targetBoard.cards,
      targetBoard.lists,
      targetBoard.headers,
      targetBoard.columnMapping
    );

    setIsSyncing(true);
    try {
      if (!token || token.startsWith('local-')) {
        // Attempt to request real Google OAuth token if only local token exists
        const { requestGoogleOAuthToken } = await import('./services/localAuthPlugin');
        try {
          const authRes = await requestGoogleOAuthToken();
          if (authRes.accessToken) {
            await writeSheetValues(targetBoard.spreadsheetId, tabName, rows, authRes.accessToken);
            setBoard((prev) => ({
              ...prev,
              lastSyncedAt: new Date().toISOString(),
            }));
            setHasUnsavedChanges(false);
            if (!silent) {
              addToast('success', 'Google Sheet Synced', `Updated ${targetBoard.cards.length} rows in "${tabName}".`);
            }
            return true;
          }
        } catch (oauthErr) {
          console.warn('OAuth popup dismissed or unavailable, saved locally:', oauthErr);
          if (!silent) {
            addToast('info', 'Local Changes Saved', 'Changes saved in browser. Click "Connect Google" to write directly to Google Sheets.');
          }
          return false;
        }
      }

      await writeSheetValues(targetBoard.spreadsheetId, tabName, rows, token!);
      setBoard((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));
      setHasUnsavedChanges(false);
      if (!silent) {
        addToast('success', 'Google Sheet Synced', `Updated ${targetBoard.cards.length} rows in "${tabName}".`);
      }
      return true;
    } catch (err: any) {
      console.error('Push to sheets failed:', err);
      if (!silent) {
        addToast('warning', 'Google Sync Notice', err.message || 'Changes saved in local session. Ensure spreadsheet allows edit access.');
      }
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Core Pull from Google Sheets helper
  const pullFromGoogleSheets = async (targetBoard: Board) => {
    if (!targetBoard.spreadsheetId) return;

    const token = await getAccessToken();
    setIsSyncing(true);
    try {
      const tabName = targetBoard.sheetTabName || 'Sheet1';
      const data = await fetchSheetValues(targetBoard.spreadsheetId, tabName, token);

      if (data.headers.length === 0) {
        throw new Error(`The sheet tab "${tabName}" is empty.`);
      }

      const parsed = parseRawDataToBoard(
        data.headers,
        data.rows,
        targetBoard.title,
        targetBoard.columnMapping
      );

      setBoard((prev) => ({
        ...prev,
        lists: parsed.lists,
        cards: parsed.cards,
        headers: data.headers,
        columnMapping: parsed.mapping,
        lastSyncedAt: new Date().toISOString(),
      }));
      setHasUnsavedChanges(false);
      addToast('success', 'Sheet Refreshed', `Pulled ${parsed.cards.length} tasks from Google Sheet.`);
    } catch (err: any) {
      console.error('Pull from sheets failed:', err);
      addToast('error', 'Pull Failed', err.message || 'Could not fetch from Google Sheet');
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatic Debounced 2-Way Sync (Push to Google Sheet on change)
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (board.autoSync === false) return;
    if (!board.spreadsheetId) return;
    if (!user) return;

    const timer = setTimeout(() => {
      pushToGoogleSheets(boardRef.current, true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, board.autoSync, board.spreadsheetId, user]);

  // Manual Trigger for Sync Button
  const handleSyncWithGoogleSheets = async () => {
    if (!board.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    if (!user) {
      addToast('warning', 'Google Sign-In Required', 'Please connect your Google account to sync spreadsheet data.');
      return;
    }

    if (hasUnsavedChanges) {
      // If there are unsaved local modifications, push to sheet
      await pushToGoogleSheets(board, false);
    } else {
      // Otherwise, pull latest updates from sheet
      await pullFromGoogleSheets(board);
    }
  };

  // Toggle Auto-Sync
  const handleToggleAutoSync = () => {
    setBoard((prev) => {
      const nextVal = !prev.autoSync;
      addToast('info', nextVal ? 'Auto-Sync Enabled' : 'Auto-Sync Paused', nextVal ? 'Changes will automatically save to Google Sheet in real time.' : 'Changes will be saved manually via the Sync button.');
      return { ...prev, autoSync: nextVal };
    });
  };

  // Card Handlers
  const handleAddCard = (listId: string, title: string) => {
    const listCards = board.cards.filter((c) => c.listId === listId);
    const creator = user
      ? {
          id: `usr-${user.uid}`,
          name: user.displayName || 'You',
          email: user.email || '',
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.displayName || 'You')}`,
        }
      : {
          id: 'usr-1',
          name: 'Alex Rivera',
          email: 'alex@company.com',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        };

    const newCard: CardItem = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      description: '',
      listId,
      order: listCards.length,
      priority: 'medium',
      completed: false,
      labels: [],
      creator,
      assignees: [creator],
      checklist: [],
      comments: [],
      attachments: [],
      customFields: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBoard((prev) => ({
      ...prev,
      cards: [...prev.cards, newCard],
    }));
    setHasUnsavedChanges(true);
    addToast('success', 'Card Added', `"${title}" added to list.`);
  };

  const handleUpdateCard = (updatedCard: CardItem) => {
    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
    }));
    if (selectedCard && selectedCard.id === updatedCard.id) {
      setSelectedCard(updatedCard);
    }
    setHasUnsavedChanges(true);
  };

  const handleDeleteCard = (cardId: string) => {
    const cardToDelete = board.cards.find((c) => c.id === cardId);
    setConfirmState({
      isOpen: true,
      title: 'Delete Card?',
      message: `Are you sure you want to permanently delete "${cardToDelete?.title || 'this card'}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        setBoard((prev) => ({
          ...prev,
          cards: prev.cards.filter((c) => c.id !== cardId),
        }));
        if (selectedCard?.id === cardId) {
          setSelectedCard(null);
        }
        setHasUnsavedChanges(true);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'Card Deleted', 'The task has been removed.');
      },
    });
  };

  const handleMoveCard = (cardId: string, targetListId: string) => {
    const targetList = board.lists.find((l) => l.id === targetListId);
    const isDone = targetList?.title.toLowerCase().includes('done') || targetList?.title.toLowerCase().includes('complete');
    const isHold = targetList?.title.toLowerCase().includes('hold') || targetList?.title.toLowerCase().includes('block');
    const isReview = targetList?.title.toLowerCase().includes('review') || targetList?.title.toLowerCase().includes('qa');
    const isBacklog = targetList?.title.toLowerCase().includes('backlog');
    const isPending = targetList?.title.toLowerCase().includes('todo') || targetList?.title.toLowerCase().includes('pending');

    const inferredStatus: CardStatus = isDone
      ? 'done'
      : isHold
      ? 'hold'
      : isReview
      ? 'in_review'
      : isBacklog
      ? 'backlog'
      : isPending
      ? 'pending'
      : 'in_process';

    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              listId: targetListId,
              completed: isDone,
              status: inferredStatus,
              order: prev.cards.filter((other) => other.listId === targetListId).length,
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateCardStatus = (cardId: string, status: CardStatus) => {
    setBoard((prev) => {
      const isDone = status === 'done';
      // Optionally find matching column if exists
      let matchingListId: string | undefined;
      if (status === 'done') {
        matchingListId = prev.lists.find((l) => l.title.toLowerCase().includes('done') || l.title.toLowerCase().includes('complete'))?.id;
      } else if (status === 'in_process') {
        matchingListId = prev.lists.find((l) => l.title.toLowerCase().includes('progress') || l.title.toLowerCase().includes('process'))?.id;
      } else if (status === 'in_review') {
        matchingListId = prev.lists.find((l) => l.title.toLowerCase().includes('review'))?.id;
      } else if (status === 'backlog') {
        matchingListId = prev.lists.find((l) => l.title.toLowerCase().includes('backlog'))?.id;
      } else if (status === 'pending') {
        matchingListId = prev.lists.find((l) => l.title.toLowerCase().includes('todo') || l.title.toLowerCase().includes('pending'))?.id;
      }

      return {
        ...prev,
        cards: prev.cards.map((c) => {
          if (c.id === cardId) {
            return {
              ...c,
              status,
              completed: isDone,
              listId: matchingListId || c.listId,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        }),
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleQuickToggleComplete = (cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => {
        if (c.id === cardId) {
          const nextCompleted = !c.completed;
          return {
            ...c,
            completed: nextCompleted,
            status: nextCompleted ? 'done' : 'in_process',
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      }),
    }));
    setHasUnsavedChanges(true);
  };

  // List Handlers
  const handleAddList = (title: string) => {
    const newList: ColumnList = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      order: board.lists.length,
    };
    setBoard((prev) => ({
      ...prev,
      lists: [...prev.lists, newList],
    }));
    setHasUnsavedChanges(true);
    addToast('success', 'List Created', `New column "${title}" added.`);
  };

  const handleUpdateListTitle = (listId: string, title: string) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => (l.id === listId ? { ...l, title } : l)),
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeleteList = (listId: string) => {
    const listToDelete = board.lists.find((l) => l.id === listId);
    const cardCount = board.cards.filter((c) => c.listId === listId).length;

    setConfirmState({
      isOpen: true,
      title: `Delete Column "${listToDelete?.title}"?`,
      message: `Deleting this column will remove ${cardCount} card(s) contained within it. Are you sure you want to proceed?`,
      confirmText: 'Delete Column',
      isDestructive: true,
      onConfirm: () => {
        setBoard((prev) => ({
          ...prev,
          lists: prev.lists.filter((l) => l.id !== listId),
          cards: prev.cards.filter((c) => c.listId !== listId),
        }));
        setHasUnsavedChanges(true);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'List Deleted', `Column "${listToDelete?.title}" removed.`);
      },
    });
  };

  const handleSortList = (listId: string, sortBy: 'dueDate' | 'priority' | 'title') => {
    const listCards = board.cards.filter((c) => c.listId === listId);
    const otherCards = board.cards.filter((c) => c.listId !== listId);

    const sorted = [...listCards].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'dueDate') {
        const aDate = a.dueDate || '9999-99-99';
        const bDate = b.dueDate || '9999-99-99';
        return aDate.localeCompare(bDate);
      }
      if (sortBy === 'priority') {
        const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
        return weights[b.priority] - weights[a.priority];
      }
      return 0;
    });

    const reordered = sorted.map((c, idx) => ({ ...c, order: idx }));

    setBoard((prev) => ({
      ...prev,
      cards: [...otherCards, ...reordered],
    }));
    setHasUnsavedChanges(true);
    addToast('info', 'List Sorted', `Cards ordered by ${sortBy}.`);
  };

  const handleSetWipLimit = (listId: string, limit?: number) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => (l.id === listId ? { ...l, wipLimit: limit } : l)),
    }));
    setHasUnsavedChanges(true);
  };

  // Board Title update
  const handleUpdateBoardTitle = (title: string) => {
    setBoard((prev) => ({ ...prev, title }));
    setHasUnsavedChanges(true);
  };

  // Theme selection
  const handleSelectTheme = (theme: BoardTheme) => {
    setBoard((prev) => ({ ...prev, theme }));
  };

  // Export handlers
  const handleExportCSV = () => {
    const csvContent = exportBoardToCSV(board.cards, board.lists, board.headers, board.columnMapping);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${board.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'CSV Exported', 'Spreadsheet CSV file downloaded.');
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(board, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${board.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'JSON Exported', 'Complete board state downloaded.');
  };

  // Apply new board data from Sheet Connect modal
  const handleApplyNewBoardData = (newData: {
    lists: Board['lists'];
    cards: Board['cards'];
    headers: string[];
    mapping: Board['columnMapping'];
    sheetTitle?: string;
    sheetUrl?: string;
    sheetId?: string;
    tabName?: string;
    availableTabs?: string[];
  }) => {
    setBoard((prev) => ({
      ...prev,
      title: newData.sheetTitle || prev.title,
      lists: newData.lists,
      cards: newData.cards,
      headers: newData.headers,
      columnMapping: newData.mapping,
      spreadsheetUrl: newData.sheetUrl || prev.spreadsheetUrl,
      spreadsheetId: newData.sheetId || prev.spreadsheetId,
      sheetTabName: newData.tabName || prev.sheetTabName,
      availableTabs: newData.availableTabs || prev.availableTabs,
      lastSyncedAt: new Date().toISOString(),
      autoSync: true,
    }));
    setHasUnsavedChanges(false);
    addToast('success', 'Board Connected', `Loaded ${newData.cards.length} cards across ${newData.lists.length} columns from Google Sheet.`);
  };

  // Apply workflow template from Variation Preview modal
  const handleApplyTemplate = (templateData: {
    title: string;
    lists: ColumnList[];
    cards: CardItem[];
    spreadsheetUrl?: string;
    spreadsheetId?: string;
    sheetTabName?: string;
    autoSync?: boolean;
    theme?: BoardTheme;
  }) => {
    setBoard((prev) => ({
      ...prev,
      title: templateData.title,
      lists: templateData.lists,
      cards: templateData.cards,
      spreadsheetUrl: templateData.spreadsheetUrl,
      spreadsheetId: templateData.spreadsheetId,
      sheetTabName: templateData.sheetTabName,
      autoSync: templateData.autoSync ?? true,
      theme: templateData.theme || prev.theme,
      lastSyncedAt: templateData.spreadsheetId ? new Date().toISOString() : undefined,
    }));
    setHasUnsavedChanges(false);
    addToast('success', 'Template Loaded', `Now showing "${templateData.title}" with live interactive support.`);
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-gradient-to-br ${board.theme.gradient} transition-all duration-300 font-sans relative overflow-x-hidden`}
      id="main-app-container"
    >
      {/* Live Custom Wallpaper & Background Image Layer */}
      {board.theme.wallpaperUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-500 z-0"
          style={{
            backgroundImage: `url(${board.theme.wallpaperUrl})`,
            opacity: (board.theme.wallpaperOpacity ?? 100) / 100,
            filter: board.theme.wallpaperBlur ? `blur(${board.theme.wallpaperBlur}px)` : undefined,
          }}
          aria-hidden="true"
        />
      )}

      {/* Subtle overlay tint for maximum readability */}
      {board.theme.wallpaperUrl && (
        <div className="absolute inset-0 bg-slate-950/20 backdrop-brightness-95 pointer-events-none z-0" />
      )}

      {/* Main App Content */}
      <div className="relative z-10 flex flex-col min-h-screen flex-1">
        {/* Header */}
        <Header
          board={board}
          activeView={activeView}
          onViewChange={setActiveView}
          filterState={filterState}
          onToggleFilterBar={() => setIsFilterBarOpen(!isFilterBarOpen)}
          onUpdateFilter={setFilterState}
          user={user}
          userOrgProfile={userOrgProfile}
          isSyncing={isSyncing}
          onSyncWithGoogleSheets={handleSyncWithGoogleSheets}
          onOpenSheetModal={() => setIsSheetModalOpen(true)}
          onSelectTheme={handleSelectTheme}
          onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onUpdateBoardTitle={handleUpdateBoardTitle}
          hasUnsavedChanges={hasUnsavedChanges}
          onToggleAutoSync={handleToggleAutoSync}
          onOpenVariationModal={() => setIsVariationModalOpen(true)}
          onOpenOrgMessages={() => {
            setOrgMessageTargetCampaign(null);
            setIsOrgMessagesOpen(true);
          }}
          onOpenOrgIdManager={() => setIsOrgIdModalOpen(true)}
          onOpenOnlineWorkspaceModal={() => setIsOnlineWorkspaceModalOpen(true)}
        />

      {/* Filter Drawer */}
      {isFilterBarOpen && (
        <FilterBar
          isOpen={isFilterBarOpen}
          onClose={() => setIsFilterBarOpen(false)}
          filterState={filterState}
          onUpdateFilter={setFilterState}
          onResetFilters={() =>
            setFilterState({
              searchQuery: '',
              titleQuery: '',
              selectedLists: [],
              selectedLabels: [],
              selectedPriorities: [],
              selectedAssignees: [],
              dueFilter: 'all',
              onlyAssignedToMe: false,
            })
          }
          board={board}
        />
      )}

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'kanban' && (
          <KanbanBoard
            board={board}
            filterState={filterState}
            onCardClick={setSelectedCard}
            onAddCard={handleAddCard}
            onAddList={handleAddList}
            onUpdateListTitle={handleUpdateListTitle}
            onDeleteList={handleDeleteList}
            onSortList={handleSortList}
            onSetWipLimit={handleSetWipLimit}
            onMoveCard={handleMoveCard}
            onQuickToggleComplete={handleQuickToggleComplete}
            onUpdateStatus={handleUpdateCardStatus}
            onOpenOrgMessages={(card) => {
              setOrgMessageTargetCampaign(card);
              setIsOrgMessagesOpen(true);
            }}
          />
        )}

        {activeView === 'spreadsheet' && (
          <div className="flex-1 overflow-y-auto">
            <SpreadsheetView
              board={board}
              filterState={filterState}
              onCardClick={setSelectedCard}
              onUpdateCard={handleUpdateCard}
              onAddCard={handleAddCard}
              onDeleteCard={handleDeleteCard}
              onExportCSV={handleExportCSV}
              onOpenOrgMessages={(card) => {
                setOrgMessageTargetCampaign(card);
                setIsOrgMessagesOpen(true);
              }}
            />
          </div>
        )}

        {activeView === 'calendar' && (
          <div className="flex-1 overflow-y-auto">
            <CalendarView
              board={board}
              onCardClick={setSelectedCard}
              onAddCardOnDate={(title, dateStr) => {
                const listId = board.lists[0]?.id || 'list-todo';
                const listCards = board.cards.filter((c) => c.listId === listId);
                const newCard: CardItem = {
                  id: `card-${Date.now()}`,
                  title,
                  description: '',
                  listId,
                  order: listCards.length,
                  priority: 'medium',
                  dueDate: dateStr,
                  etaDate: dateStr,
                  completed: false,
                  labels: [],
                  assignees: [],
                  checklist: [],
                  comments: [],
                  attachments: [],
                  customFields: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setBoard((prev) => ({ ...prev, cards: [...prev.cards, newCard] }));
                setHasUnsavedChanges(true);
                addToast('success', 'Campaign Scheduled', `Created campaign for ${dateStr}.`);
              }}
            />
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="flex-1 overflow-y-auto">
            <AnalyticsView board={board} />
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          key={selectedCard.id}
          card={selectedCard}
          lists={board.lists}
          onClose={() => setSelectedCard(null)}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          currentUser={
            user
              ? {
                  name: user.displayName || 'You',
                  avatar: user.photoURL || undefined,
                  email: user.email || undefined,
                }
              : null
          }
          onOpenOrgMessages={(card) => {
            setOrgMessageTargetCampaign(card);
            setIsOrgMessagesOpen(true);
          }}
        />
      )}

      {/* Organization Messages & Team Announcements Modal */}
      {isOrgMessagesOpen && (
        <OrgMessagesModal
          isOpen={isOrgMessagesOpen}
          onClose={() => setIsOrgMessagesOpen(false)}
          board={board}
          selectedCampaign={orgMessageTargetCampaign}
          onSelectCampaign={(card) => setSelectedCard(card)}
          userOrgProfile={userOrgProfile}
          onOpenOrgIdManager={() => {
            setIsOrgMessagesOpen(false);
            setIsOrgIdModalOpen(true);
          }}
        />
      )}

      {/* Online Workspace Login & Workspace Finder Modal */}
      {isOnlineWorkspaceModalOpen && (
        <OnlineWorkspaceModal
          isOpen={isOnlineWorkspaceModalOpen}
          onClose={() => setIsOnlineWorkspaceModalOpen(false)}
          currentOrgProfile={userOrgProfile}
          currentUser={user}
          board={board}
          onWorkspaceSwitched={(newProfile, newUser, onlineBoard) => {
            setUserOrgProfile(newProfile);
            setUser(newUser);
            saveLocalStoredUser(newUser);
            if (onlineBoard && onlineBoard.cards && onlineBoard.cards.length > 0) {
              setBoard(onlineBoard);
            }
          }}
          onShowToast={addToast}
        />
      )}

      {/* Organization ID & Connected Team Members Workspace Modal */}
      {isOrgIdModalOpen && (
        <OrgIdManagerModal
          isOpen={isOrgIdModalOpen}
          onClose={() => setIsOrgIdModalOpen(false)}
          userOrgProfile={userOrgProfile}
          onUpdateProfile={(updated) => {
            setUserOrgProfile(updated);
            saveUserOrgProfile(updated);
            addToast(
              'success',
              'Organization Workspace Updated',
              `Active Org ID: ${updated.orgId} (${updated.orgName})`
            );
          }}
          onSwitchToEmployee={(member) => {
            const switchedUser: UserProfile = {
              uid: member.id,
              displayName: member.name,
              email: member.email,
              photoURL: member.avatar,
            };
            setUser(switchedUser);
            saveLocalStoredUser(switchedUser);
            addToast(
              'success',
              'Switched Active Profile',
              `Now signed in as ${member.name} (${member.role} • ${userOrgProfile.orgId})`
            );
          }}
        />
      )}

      {/* Google Sheet Connector Modal */}
      {isSheetModalOpen && (
        <SheetConnectModal
          isOpen={isSheetModalOpen}
          onClose={() => setIsSheetModalOpen(false)}
          board={board}
          user={user}
          onApplyNewBoardData={handleApplyNewBoardData}
        />
      )}

      {/* Board Variations & Preview Modal */}
      {isVariationModalOpen && (
        <VariationPreviewModal
          isOpen={isVariationModalOpen}
          onClose={() => setIsVariationModalOpen(false)}
          currentBoard={board}
          activeView={activeView}
          onSelectView={setActiveView}
          onSelectTheme={handleSelectTheme}
          onApplyTemplate={handleApplyTemplate}
        />
      )}

      {/* Board Wallpaper & Background Customizer Modal */}
      {isWallpaperModalOpen && (
        <WallpaperModal
          isOpen={isWallpaperModalOpen}
          onClose={() => setIsWallpaperModalOpen(false)}
          currentTheme={board.theme}
          onApplyTheme={handleSelectTheme}
        />
      )}

      {/* Safe Confirmation Dialog (Destructive Operations & Syncs) */}
      {confirmState.isOpen && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          isDestructive={confirmState.isDestructive}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    </div>
  );
}
