import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Plus, X } from 'lucide-react';
import { Board, CardItem, FilterState } from '../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  board: Board;
  filterState: FilterState;
  onCardClick: (card: CardItem) => void;
  onAddCard: (listId: string, title: string) => void;
  onAddList: (title: string) => void;
  onUpdateListTitle: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onSortList: (listId: string, sortBy: 'dueDate' | 'priority' | 'title') => void;
  onSetWipLimit: (listId: string, limit?: number) => void;
  onMoveCard: (cardId: string, targetListId: string) => void;
  onQuickToggleComplete: (cardId: string) => void;
  onUpdateStatus?: (cardId: string, status: any) => void;
  onOpenOrgMessages?: (card: CardItem) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  filterState,
  onCardClick,
  onAddCard,
  onAddList,
  onUpdateListTitle,
  onDeleteList,
  onSortList,
  onSetWipLimit,
  onMoveCard,
  onQuickToggleComplete,
  onUpdateStatus,
  onOpenOrgMessages,
}) => {
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // Filter Cards based on active filter state
  const filteredCards = board.cards.filter((card) => {
    // Specific Task Title Query
    if (filterState.titleQuery?.trim()) {
      const tq = filterState.titleQuery.toLowerCase().trim();
      if (!card.title.toLowerCase().includes(tq)) return false;
    }

    // Status / List Column Filter
    if (filterState.selectedLists && filterState.selectedLists.length > 0) {
      if (!filterState.selectedLists.includes(card.listId)) return false;
    }

    // General Search Query
    if (filterState.searchQuery.trim()) {
      const q = filterState.searchQuery.toLowerCase();
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchDesc = card.description.toLowerCase().includes(q);
      const matchLabels = card.labels.some((l) => l.name.toLowerCase().includes(q));
      const matchCreator = card.creator?.name.toLowerCase().includes(q);
      const matchAssignees = card.assignees.some((a) => a.name.toLowerCase().includes(q)) || matchCreator;
      if (!matchTitle && !matchDesc && !matchLabels && !matchAssignees) return false;
    }

    // Label filters
    if (filterState.selectedLabels.length > 0) {
      const hasMatchingLabel = card.labels.some((l) =>
        filterState.selectedLabels.includes(l.name)
      );
      if (!hasMatchingLabel) return false;
    }

    // Priority filters
    if (filterState.selectedPriorities.length > 0) {
      if (!filterState.selectedPriorities.includes(card.priority)) return false;
    }

    // Character & Assignee filters
    if (filterState.selectedAssignees.length > 0) {
      const hasMatchingAssignee = card.assignees.some((a) =>
        filterState.selectedAssignees.includes(a.name)
      );
      const hasMatchingCreator =
        card.creator && filterState.selectedAssignees.includes(card.creator.name);
      if (!hasMatchingAssignee && !hasMatchingCreator) return false;
    }

    // Due date filter
    if (filterState.dueFilter !== 'all') {
      if (filterState.dueFilter === 'noDueDate' && card.dueDate) return false;
      if (filterState.dueFilter !== 'noDueDate' && !card.dueDate) return false;

      if (card.dueDate) {
        const due = new Date(card.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueNormalized = new Date(due);
        dueNormalized.setHours(0, 0, 0, 0);

        if (filterState.dueFilter === 'overdue' && (dueNormalized >= today || card.completed)) {
          return false;
        }
        if (filterState.dueFilter === 'dueToday' && dueNormalized.getTime() !== today.getTime()) {
          return false;
        }
        if (filterState.dueFilter === 'dueThisWeek') {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          if (dueNormalized < today || dueNormalized > nextWeek) return false;
        }
      }
    }

    return true;
  });

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (!cardId) return;

    const targetList = board.lists.find((l) => l.id === targetListId);
    const isDoneColumn = targetList?.title.toLowerCase().includes('done') || targetList?.title.toLowerCase().includes('complete');

    onMoveCard(cardId, targetListId);
    setDraggedCardId(null);

    // Fire celebration confetti if moved to "Done" column!
    if (isDoneColumn) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (_) {}
    }
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      onAddList(newListTitle.trim());
      setNewListTitle('');
      setIsAddingList(false);
    }
  };

  return (
    <main className="w-full flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6" id="kanban-canvas-container">
      <div className="flex items-start gap-4 h-full min-w-max pb-4">
        {/* Render Columns */}
        {board.lists.map((list) => {
          const columnCards = filteredCards
            .filter((c) => c.listId === list.id)
            .sort((a, b) => a.order - b.order);

          return (
            <KanbanColumn
              key={list.id}
              list={list}
              cards={columnCards}
              onCardClick={onCardClick}
              onAddCard={onAddCard}
              onUpdateListTitle={onUpdateListTitle}
              onDeleteList={onDeleteList}
              onSortList={onSortList}
              onSetWipLimit={onSetWipLimit}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onQuickToggleComplete={onQuickToggleComplete}
              onUpdateStatus={onUpdateStatus}
              onOpenOrgMessages={onOpenOrgMessages}
            />
          );
        })}

        {/* Add Another Column / List Button */}
        <div className="w-[260px] sm:w-[270px] shrink-0">
          {isAddingList ? (
            <div className="p-3 rounded-xl bg-[#F7F8F9] border border-gray-200 shadow-sm">
              <form onSubmit={handleCreateList} className="space-y-2">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Enter column title..."
                  autoFocus
                  className="w-full px-3 py-1.5 text-xs rounded bg-white border border-[#0055CC] text-[#172B4D] focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-md bg-[#0055CC] hover:bg-[#0047AB] text-white font-semibold text-xs transition-colors shadow-xs"
                    id="add-list-submit-btn"
                  >
                    Add Column
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListTitle('');
                    }}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingList(true)}
              className="w-full h-24 bg-white/50 hover:bg-white/80 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:text-[#0055CC] hover:border-[#0055CC]/50 transition-all font-medium group cursor-pointer"
              id="add-another-list-btn"
            >
              <Plus className="w-6 h-6 mb-1 text-gray-400 group-hover:text-[#0055CC] transition-colors" />
              <span className="text-xs font-bold uppercase tracking-wider">Add Column</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
};
