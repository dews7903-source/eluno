import React, { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  Flame,
  Calendar,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react';
import { CardItem, ColumnList } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  list: ColumnList;
  cards: CardItem[];
  onCardClick: (card: CardItem) => void;
  onAddCard: (listId: string, title: string) => void;
  onUpdateListTitle: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onSortList: (listId: string, sortBy: 'dueDate' | 'priority' | 'title') => void;
  onSetWipLimit: (listId: string, limit?: number) => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetListId: string) => void;
  onQuickToggleComplete?: (cardId: string) => void;
  onUpdateStatus?: (cardId: string, status: any) => void;
  onOpenOrgMessages?: (card: CardItem) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  list,
  cards,
  onCardClick,
  onAddCard,
  onUpdateListTitle,
  onDeleteList,
  onSortList,
  onSetWipLimit,
  onDragStart,
  onDragOver,
  onDrop,
  onQuickToggleComplete,
  onUpdateStatus,
  onOpenOrgMessages,
}) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const isWipExceeded = list.wipLimit !== undefined && list.wipLimit > 0 && cards.length > list.wipLimit;

  const handleCreateCard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newCardTitle.trim()) {
      onAddCard(list.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(true); // Keep open for rapid entry
    }
  };

  const handleTitleSubmit = () => {
    if (titleInput.trim() && titleInput !== list.title) {
      onUpdateListTitle(list.id, titleInput.trim());
    } else {
      setTitleInput(list.title);
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      onDragOver={(e) => {
        onDragOver(e);
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop(e, list.id);
      }}
      className={`w-[260px] sm:w-[270px] shrink-0 bg-[#F7F8F9] rounded-xl flex flex-col max-h-full border transition-all duration-150 shadow-xs ${
        isDragOver
          ? 'border-[#0055CC] ring-2 ring-[#0055CC]/20 bg-blue-50/40'
          : 'border-gray-200'
      }`}
      id={`kanban-column-${list.id}`}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between gap-2 border-b border-gray-200/60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(list.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="font-bold text-xs px-2 py-0.5 rounded bg-white border border-[#0055CC] text-[#172B4D] w-full"
            />
          ) : (
            <h2
              onClick={() => {
                setTitleInput(list.title);
                setIsEditingTitle(true);
              }}
              className="font-bold text-xs text-[#44546F] uppercase tracking-wider truncate cursor-pointer hover:text-[#172B4D] transition-colors"
              title="Click to rename column"
            >
              {list.title.replace(/[^\w\s-]/g, '').trim() || list.title} ({cards.length})
            </h2>
          )}

          {isWipExceeded && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-bounce shrink-0"
              title={`WIP Limit Exceeded (${cards.length}/${list.wipLimit})`}
            >
              Limit {list.wipLimit}
            </span>
          )}
        </div>

        {/* List Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-200 transition-colors"
            id={`list-menu-btn-${list.id}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 z-40 animate-in fade-in zoom-in-95 text-[#172B4D]">
              <div className="px-2 py-1 text-[10px] font-bold text-[#44546F] uppercase tracking-wider">
                Column Actions
              </div>

              <button
                onClick={() => {
                  onSortList(list.id, 'dueDate');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[#172B4D] hover:bg-gray-100 transition-colors text-left"
              >
                <Calendar className="w-3.5 h-3.5 text-[#0055CC]" />
                <span>Sort by Due Date</span>
              </button>

              <button
                onClick={() => {
                  onSortList(list.id, 'priority');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[#172B4D] hover:bg-gray-100 transition-colors text-left"
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Sort by Priority</span>
              </button>

              <button
                onClick={() => {
                  onSortList(list.id, 'title');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[#172B4D] hover:bg-gray-100 transition-colors text-left"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sort Alphabetically</span>
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={() => {
                  const limit = prompt('Enter maximum WIP limit for this list (or leave blank to remove):', list.wipLimit ? String(list.wipLimit) : '');
                  if (limit !== null) {
                    const num = parseInt(limit, 10);
                    onSetWipLimit(list.id, isNaN(num) || num <= 0 ? undefined : num);
                  }
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[#172B4D] hover:bg-gray-100 transition-colors text-left"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Set WIP Limit...</span>
              </button>

              <button
                onClick={() => {
                  onDeleteList(list.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete List</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards Scrollable Container */}
      <div className="flex-1 px-2 py-2 overflow-y-auto flex flex-col gap-2 min-h-0 custom-scrollbar">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
            onDragStart={onDragStart}
            onQuickToggleComplete={onQuickToggleComplete}
            onUpdateStatus={onUpdateStatus}
            onOpenOrgMessages={onOpenOrgMessages}
          />
        ))}

        {cards.length === 0 && !isAddingCard && (
          <div className="h-16 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-gray-400 text-xs font-medium">
            No campaigns
          </div>
        )}
      </div>

      {/* Column Footer: + Add a campaign */}
      <div className="p-2 pt-1">
        {isAddingCard ? (
          <form onSubmit={handleCreateCard} className="space-y-2 bg-white p-2.5 rounded-lg border border-[#0055CC] shadow-xs">
            <textarea
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter campaign name..."
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateCard();
                }
                if (e.key === 'Escape') {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }
              }}
              className="w-full text-xs text-[#172B4D] focus:outline-none resize-none"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-[#0055CC] hover:bg-[#0047AB] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Add campaign
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full p-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg flex items-center gap-2 font-medium transition-colors text-left"
            id={`add-card-btn-${list.id}`}
          >
            <Plus className="w-4 h-4 text-gray-500" />
            <span>Add a card</span>
          </button>
        )}
      </div>
    </div>
  );
};
