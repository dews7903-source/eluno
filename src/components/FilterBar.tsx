import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X,
  Flame,
  Tag,
  Users,
  Calendar,
  RotateCcw,
  Check,
  FileText,
  Kanban,
  Columns3,
  Sparkles,
} from 'lucide-react';
import { Board, FilterState, PriorityLevel } from '../types';

interface FilterBarProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: FilterState;
  onUpdateFilter: (filters: FilterState) => void;
  onResetFilters: () => void;
  board: Board;
}

interface CharacterOption {
  name: string;
  avatar: string;
  isCreator: boolean;
  cardCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  isOpen,
  onClose,
  filterState,
  onUpdateFilter,
  onResetFilters,
  board,
}) => {
  const [characterSearch, setCharacterSearch] = useState('');

  // Extract all distinct characters (both Creators and Assignees) with card counts and metadata
  const allCharacters = useMemo<CharacterOption[]>(() => {
    const charactersMap = new Map<string, CharacterOption>();

    board.cards.forEach((card) => {
      // 1. Check Creator
      if (card.creator && card.creator.name && card.creator.name.trim()) {
        const cName = card.creator.name.trim();
        const existing = charactersMap.get(cName);
        if (existing) {
          existing.cardCount += 1;
          existing.isCreator = true;
        } else {
          charactersMap.set(cName, {
            name: cName,
            avatar:
              card.creator.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cName)}`,
            isCreator: true,
            cardCount: 1,
          });
        }
      }

      // 2. Check Assignees
      card.assignees?.forEach((member) => {
        if (member && member.name && member.name.trim()) {
          const mName = member.name.trim();
          const existing = charactersMap.get(mName);
          if (existing) {
            if (!card.creator || card.creator.name.trim() !== mName) {
              existing.cardCount += 1;
            }
          } else {
            charactersMap.set(mName, {
              name: mName,
              avatar:
                member.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mName)}`,
              isCreator: false,
              cardCount: 1,
            });
          }
        }
      });
    });

    return Array.from(charactersMap.values()).sort((a, b) => {
      if (a.isCreator && !b.isCreator) return -1;
      if (!a.isCreator && b.isCreator) return 1;
      return b.cardCount - a.cardCount;
    });
  }, [board.cards]);

  // Distinct labels from board
  const allLabels = useMemo<string[]>(() => {
    return Array.from(
      new Set(board.cards.flatMap((c) => c.labels.map((l) => l.name)))
    ).filter(Boolean);
  }, [board.cards]);

  // Map each list/status with its card count
  const listCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    board.lists.forEach((l) => {
      counts[l.id] = board.cards.filter((c) => c.listId === l.id).length;
    });
    return counts;
  }, [board.lists, board.cards]);

  // Filter characters list by characterSearch query
  const filteredCharacters = useMemo(() => {
    if (!characterSearch.trim()) return allCharacters;
    const q = characterSearch.toLowerCase();
    return allCharacters.filter((char) => char.name.toLowerCase().includes(q));
  }, [allCharacters, characterSearch]);

  if (!isOpen) return null;

  const toggleList = (listId: string) => {
    const isSelected = filterState.selectedLists?.includes(listId);
    const current = filterState.selectedLists || [];
    const updated = isSelected
      ? current.filter((id) => id !== listId)
      : [...current, listId];
    onUpdateFilter({ ...filterState, selectedLists: updated });
  };

  const handleSelectAllLists = () => {
    onUpdateFilter({
      ...filterState,
      selectedLists: board.lists.map((l) => l.id),
    });
  };

  const handleClearLists = () => {
    onUpdateFilter({
      ...filterState,
      selectedLists: [],
    });
  };

  const toggleCharacter = (name: string) => {
    const isSelected = filterState.selectedAssignees.includes(name);
    const updated = isSelected
      ? filterState.selectedAssignees.filter((a) => a !== name)
      : [...filterState.selectedAssignees, name];
    onUpdateFilter({ ...filterState, selectedAssignees: updated });
  };

  const handleSelectAllCharacters = () => {
    onUpdateFilter({
      ...filterState,
      selectedAssignees: allCharacters.map((c) => c.name),
    });
  };

  const handleClearCharacters = () => {
    onUpdateFilter({
      ...filterState,
      selectedAssignees: [],
    });
  };

  const toggleLabel = (labelName: string) => {
    const isSelected = filterState.selectedLabels.includes(labelName);
    const updated = isSelected
      ? filterState.selectedLabels.filter((l) => l !== labelName)
      : [...filterState.selectedLabels, labelName];
    onUpdateFilter({ ...filterState, selectedLabels: updated });
  };

  const togglePriority = (p: PriorityLevel) => {
    const isSelected = filterState.selectedPriorities.includes(p);
    const updated = isSelected
      ? filterState.selectedPriorities.filter((item) => item !== p)
      : [...filterState.selectedPriorities, p];
    onUpdateFilter({ ...filterState, selectedPriorities: updated });
  };

  const activeListsCount = filterState.selectedLists?.length || 0;
  const activeCharactersCount = filterState.selectedAssignees.length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 z-20 shadow-md overflow-hidden font-sans"
      id="filter-drawer-bar"
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Filter Bar: Task Title Filter & General Search & Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* 1. Dedicated Task Title Filter Input */}
            <div className="relative flex-1">
              <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
              <input
                type="text"
                value={filterState.titleQuery || ''}
                onChange={(e) => onUpdateFilter({ ...filterState, titleQuery: e.target.value })}
                placeholder="Filter by Task Title (e.g. Design UI, Deploy backend)..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-slate-900 dark:text-white placeholder-blue-400 dark:placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-[#0055CC] font-medium"
                id="filter-title-input"
              />
              {filterState.titleQuery && (
                <button
                  type="button"
                  onClick={() => onUpdateFilter({ ...filterState, titleQuery: '' })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Global Keywords / Description Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterState.searchQuery || ''}
                onChange={(e) => onUpdateFilter({ ...filterState, searchQuery: e.target.value })}
                placeholder="Search descriptions, notes, or keywords..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                id="filter-keyword-input"
              />
              {filterState.searchQuery && (
                <button
                  type="button"
                  onClick={() => onUpdateFilter({ ...filterState, searchQuery: '' })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons: Reset & Close */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
              title="Reset all active filters"
              id="filter-reset-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close filter drawer"
              id="filter-close-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Row Grid: 1. Status / List + 2. Characters & Assignees */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Status / List Filter Column */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Columns3 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Filter by Status / List
                  </span>
                  {activeListsCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.2 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                      {activeListsCount} active
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllLists}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  All
                </button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClearLists}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* List Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1" id="status-list-filter-pills">
              {board.lists.map((list) => {
                const isSelected = filterState.selectedLists?.includes(list.id);
                const count = listCounts[list.id] || 0;
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => toggleList(list.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    id={`filter-list-${list.id}`}
                  >
                    <span className="truncate max-w-[140px]">{list.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-indigo-600 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}

              {board.lists.length === 0 && (
                <p className="text-xs text-slate-400 italic">No columns found on this board.</p>
              )}
            </div>
          </div>

          {/* Character & Assignee Filter Column */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Filter by Character / Assignees
                  </span>
                  {activeCharactersCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.2 text-[10px] font-bold bg-[#0055CC] text-white rounded-full">
                      {activeCharactersCount} selected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {allCharacters.length > 4 && (
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Find..."
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                      className="pl-5 pr-2 py-0.5 text-[10px] rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-24 sm:w-28"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSelectAllCharacters}
                  className="font-semibold text-[#0055CC] hover:underline"
                >
                  All
                </button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClearCharacters}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Character Cards List */}
            <div className="flex flex-wrap gap-1.5 pt-1" id="character-filter-list">
              {filteredCharacters.map((char) => {
                const isSelected = filterState.selectedAssignees.includes(char.name);
                return (
                  <button
                    key={char.name}
                    type="button"
                    onClick={() => toggleCharacter(char.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/70 border-[#0055CC] text-[#0055CC] ring-2 ring-[#0055CC]/20 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    id={`filter-char-${char.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    title={`${char.name}: ${char.cardCount} card(s)${char.isCreator ? ' (Creator)' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={char.avatar}
                        alt={char.name}
                        className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      {char.isCreator && (
                        <span
                          className="absolute -top-1.5 -right-1 text-[8px]"
                          title="Card Creator / Author"
                        >
                          👑
                        </span>
                      )}
                    </div>

                    <span className="truncate max-w-[110px]">{char.name}</span>

                    {char.isCreator && (
                      <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                        Creator
                      </span>
                    )}

                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-[#0055CC] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {char.cardCount}
                    </span>

                    {isSelected && <Check className="w-3 h-3 text-[#0055CC] shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}

              {filteredCharacters.length === 0 && (
                <p className="text-xs text-slate-400 italic py-0.5">
                  {characterSearch.trim()
                    ? `No characters matching "${characterSearch}".`
                    : 'No assignees or creators found on this board.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Secondary Controls (Priority, Due Date, Labels) */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-0.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          {/* Priority Filters */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400 uppercase text-[10px]">Priority:</span>
            {(['urgent', 'high', 'medium', 'low'] as PriorityLevel[]).map((p) => {
              const isSelected = filterState.selectedPriorities.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] transition-all ${
                    isSelected
                      ? p === 'urgent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : p === 'high'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : p === 'medium'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Due Date Filters */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400 uppercase text-[10px]">Due:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'dueToday', label: 'Today' },
              { id: 'dueThisWeek', label: 'This Week' },
              { id: 'noDueDate', label: 'No Date' },
            ].map((d) => {
              const isSelected = filterState.dueFilter === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onUpdateFilter({ ...filterState, dueFilter: d.id as any })}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all ${
                    isSelected
                      ? 'bg-[#0055CC] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Labels Filter Pills */}
          {allLabels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Labels:</span>
              {allLabels.map((name) => {
                const isSelected = filterState.selectedLabels.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleLabel(name)}
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
