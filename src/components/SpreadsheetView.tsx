import React, { useState } from 'react';
import {
  Table,
  Plus,
  ArrowUpDown,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Flame,
  Calendar,
  Flag,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { Board, CardItem, CardStatus, ColumnList, FilterState, PriorityLevel } from '../types';
import { CARD_STATUS_CONFIG, ALL_CARD_STATUSES, getNormalizedCardStatus } from '../utils/statusConfig';

interface SpreadsheetViewProps {
  board: Board;
  filterState?: FilterState;
  onCardClick: (card: CardItem) => void;
  onUpdateCard: (card: CardItem) => void;
  onAddCard: (listId: string, title: string) => void;
  onDeleteCard: (cardId: string) => void;
  onExportCSV: () => void;
  onOpenOrgMessages?: (card: CardItem) => void;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  board,
  filterState,
  onCardClick,
  onUpdateCard,
  onAddCard,
  onDeleteCard,
  onExportCSV,
  onOpenOrgMessages,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [newRowTitle, setNewRowTitle] = useState('');
  const [newRowListId, setNewRowListId] = useState(board.lists[0]?.id || 'list-todo');

  const filteredCards = board.cards.filter((c) => {
    // 1. If filterState is passed from top bar:
    if (filterState) {
      if (filterState.titleQuery?.trim()) {
        const tq = filterState.titleQuery.toLowerCase().trim();
        if (!c.title.toLowerCase().includes(tq)) return false;
      }

      if (filterState.selectedLists && filterState.selectedLists.length > 0) {
        if (!filterState.selectedLists.includes(c.listId)) return false;
      }

      if (filterState.selectedAssignees && filterState.selectedAssignees.length > 0) {
        const matchAssignee = c.assignees.some((a) => filterState.selectedAssignees.includes(a.name));
        const matchCreator = c.creator && filterState.selectedAssignees.includes(c.creator.name);
        if (!matchAssignee && !matchCreator) return false;
      }

      if (filterState.selectedPriorities && filterState.selectedPriorities.length > 0) {
        if (!filterState.selectedPriorities.includes(c.priority)) return false;
      }

      if (filterState.selectedLabels && filterState.selectedLabels.length > 0) {
        const matchLabel = c.labels.some((l) => filterState.selectedLabels.includes(l.name));
        if (!matchLabel) return false;
      }
    }

    // 2. In-view local search term
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.labels.some((l) => l.name.toLowerCase().includes(q)) ||
      c.assignees.some((a) => a.name.toLowerCase().includes(q)) ||
      (c.creator?.name.toLowerCase().includes(q) ?? false)
    );
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    let aVal: any = a.title;
    let bVal: any = b.title;

    if (sortCol === 'status') {
      const aList = board.lists.find((l) => l.id === a.listId)?.title || '';
      const bList = board.lists.find((l) => l.id === b.listId)?.title || '';
      aVal = aList;
      bVal = bList;
    } else if (sortCol === 'startDate') {
      aVal = a.startDate || '9999-99-99';
      bVal = b.startDate || '9999-99-99';
    } else if (sortCol === 'etaDate' || sortCol === 'dueDate') {
      aVal = a.etaDate || a.dueDate || '9999-99-99';
      bVal = b.etaDate || b.dueDate || '9999-99-99';
    } else if (sortCol === 'priority') {
      const pWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
      aVal = pWeights[a.priority] || 0;
      bVal = pWeights[b.priority] || 0;
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleQuickAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowTitle.trim()) return;
    onAddCard(newRowListId, newRowTitle.trim());
    setNewRowTitle('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search campaigns, assignees, or tags..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">
            {sortedCards.length} campaigns
          </span>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th
                  onClick={() => handleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:text-sky-600 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Campaign</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-sky-600 transition-colors w-36"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3 px-4 cursor-pointer hover:text-sky-600 transition-colors w-28"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('startDate')}
                  className="py-3 px-4 cursor-pointer hover:text-sky-600 transition-colors w-32"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Start Date</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('etaDate')}
                  className="py-3 px-4 cursor-pointer hover:text-sky-600 transition-colors w-32"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ETA Date</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 w-36">Assignees</th>
                <th className="py-3 px-4 w-36">Labels</th>
                <th className="py-3 px-4 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedCards.map((card, idx) => {
                const list = board.lists.find((l) => l.id === card.listId);
                const effectiveEta = card.etaDate || card.dueDate;

                return (
                  <tr
                    key={card.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono text-center">
                      {card.rowIndex || idx + 1}
                    </td>

                    {/* Campaign Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {card.coverColor && (
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: card.coverColor }}
                          />
                        )}
                        <button
                          onClick={() => onCardClick(card)}
                          className={`font-semibold text-left line-clamp-1 group-hover:underline cursor-pointer ${
                            card.completed || getNormalizedCardStatus(card) === 'done'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}
                        >
                          {card.title}
                        </button>
                      </div>
                      {card.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {card.description}
                        </p>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4">
                      <select
                        value={card.status || getNormalizedCardStatus(card)}
                        onChange={(e) => {
                          const targetStatus = e.target.value as CardStatus;
                          const isDone = targetStatus === 'done';
                          let matchingListId = card.listId;
                          if (targetStatus === 'done') {
                            matchingListId = board.lists.find((l) => l.title.toLowerCase().includes('done') || l.title.toLowerCase().includes('complete'))?.id || card.listId;
                          } else if (targetStatus === 'in_process') {
                            matchingListId = board.lists.find((l) => l.title.toLowerCase().includes('progress') || l.title.toLowerCase().includes('process'))?.id || card.listId;
                          } else if (targetStatus === 'in_review') {
                            matchingListId = board.lists.find((l) => l.title.toLowerCase().includes('review'))?.id || card.listId;
                          } else if (targetStatus === 'backlog') {
                            matchingListId = board.lists.find((l) => l.title.toLowerCase().includes('backlog'))?.id || card.listId;
                          } else if (targetStatus === 'pending') {
                            matchingListId = board.lists.find((l) => l.title.toLowerCase().includes('todo') || l.title.toLowerCase().includes('pending'))?.id || card.listId;
                          }

                          onUpdateCard({
                            ...card,
                            status: targetStatus,
                            listId: matchingListId,
                            completed: isDone,
                            updatedAt: new Date().toISOString(),
                          });
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs focus:ring-1 focus:ring-sky-500"
                      >
                        {ALL_CARD_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {CARD_STATUS_CONFIG[st].label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Priority Selector */}
                    <td className="py-3 px-4">
                      <select
                        value={card.priority}
                        onChange={(e) =>
                          onUpdateCard({
                            ...card,
                            priority: e.target.value as PriorityLevel,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className={`px-2 py-1 rounded-lg font-bold text-xs uppercase border ${
                          card.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                            : card.priority === 'high'
                            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                            : card.priority === 'medium'
                            ? 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </td>

                    {/* Start Date */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <input
                        type="date"
                        value={card.startDate || ''}
                        onChange={(e) =>
                          onUpdateCard({
                            ...card,
                            startDate: e.target.value || undefined,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 w-full"
                      />
                    </td>

                    {/* ETA Date */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <input
                        type="date"
                        value={effectiveEta || ''}
                        onChange={(e) =>
                          onUpdateCard({
                            ...card,
                            etaDate: e.target.value || undefined,
                            dueDate: e.target.value || undefined,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 w-full font-medium"
                      />
                    </td>

                    {/* Assignees & Creator */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {card.creator && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 font-bold text-[9px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                              Creator
                            </span>
                            <span className="truncate max-w-[100px]" title={`Creator: ${card.creator.name}`}>
                              {card.creator.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center -space-x-1">
                          {card.assignees
                            .filter((a) => !card.creator || a.name.toLowerCase() !== card.creator.name.toLowerCase())
                            .map((a) => (
                              <img
                                key={a.id}
                                src={a.avatar}
                                alt={a.name}
                                title={`Assignee: ${a.name}`}
                                className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-slate-900"
                                referrerPolicy="no-referrer"
                              />
                            ))}
                          {card.assignees.length === 0 && !card.creator && (
                            <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Labels */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {card.labels.map((lbl) => (
                          <span
                            key={lbl.id}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${lbl.bg} ${lbl.text}`}
                          >
                            {lbl.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Actions: Org Messages + Delete */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onOpenOrgMessages && (
                          <button
                            onClick={() => onOpenOrgMessages(card)}
                            className="p-1 text-indigo-600 hover:text-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Discuss Campaign in Org Messages"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteCard(card.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedCards.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No campaigns match the filter query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Add Campaign Row Form Footer */}
        <form
          onSubmit={handleQuickAddRow}
          className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-2"
        >
          <div className="flex items-center gap-2 flex-1 w-full">
            <Plus className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={newRowTitle}
              onChange={(e) => setNewRowTitle(e.target.value)}
              placeholder="Add a new campaign to spreadsheet..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={newRowListId}
              onChange={(e) => setNewRowListId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              {board.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newRowTitle.trim()}
              className="px-4 py-1.5 bg-[#0055CC] hover:bg-[#0047AB] text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              Add Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

