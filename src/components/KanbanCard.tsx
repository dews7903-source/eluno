import React from 'react';
import {
  Paperclip,
  Flame,
  AlertCircle,
  Clock,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { CardItem, CardStatus, PriorityLevel } from '../types';
import {
  CARD_STATUS_CONFIG,
  getNormalizedCardStatus,
} from '../utils/statusConfig';

interface KanbanCardProps {
  card: CardItem;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  onQuickToggleComplete?: (cardId: string) => void;
  onUpdateStatus?: (cardId: string, status: CardStatus) => void;
  onOpenOrgMessages?: (card: CardItem) => void;
}

const PRIORITY_BADGES: Record<
  PriorityLevel,
  { label: string; bg: string; text: string; border: string; dot: string; icon: React.ReactNode }
> = {
  urgent: {
    label: 'Urgent',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
    icon: <Flame className="w-3 h-3 text-rose-500" />,
  },
  high: {
    label: 'High',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: <AlertCircle className="w-3 h-3 text-amber-500" />,
  },
  medium: {
    label: 'Medium',
    bg: 'bg-sky-50 dark:bg-sky-950/50',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-500',
    icon: <Clock className="w-3 h-3 text-sky-500" />,
  },
  low: {
    label: 'Low',
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    icon: null,
  },
};

export const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  onClick,
  onDragStart,
  onQuickToggleComplete,
  onUpdateStatus,
  onOpenOrgMessages,
}) => {
  const currentStatus = getNormalizedCardStatus(card);
  const isDone = currentStatus === 'done' || card.completed;
  const statusConfig = CARD_STATUS_CONFIG[currentStatus] || CARD_STATUS_CONFIG.in_process;

  // Format Start Date & ETA Date separately
  const effectiveEta = card.etaDate || card.dueDate;
  let isOverdue = false;
  let formattedEta = '';

  if (effectiveEta) {
    const due = new Date(effectiveEta);
    if (!isNaN(due.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueNormalized = new Date(due);
      dueNormalized.setHours(0, 0, 0, 0);

      isOverdue = dueNormalized < today && !isDone;
      formattedEta = due.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } else {
      formattedEta = effectiveEta;
    }
  }

  const priorityMeta = PRIORITY_BADGES[card.priority] || PRIORITY_BADGES.medium;
  const customFieldFirst = card.customFields ? Object.entries(card.customFields)[0] : null;

  const handleDoneCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateStatus) {
      onUpdateStatus(card.id, isDone ? 'in_process' : 'done');
    } else if (onQuickToggleComplete) {
      onQuickToggleComplete(card.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={onClick}
      className={`group relative bg-white dark:bg-slate-900 rounded-lg transition-all duration-150 cursor-pointer select-none overflow-hidden ${
        isDone
          ? 'border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 opacity-80 hover:opacity-100 shadow-2xs'
          : 'border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-2xs hover:shadow-sm'
      }`}
      id={`kanban-card-${card.id}`}
    >
      {/* Cover Image or Accent Color Bar */}
      {card.coverImage ? (
        <div className="relative h-20 w-full overflow-hidden bg-slate-950">
          <img
            src={card.coverImage}
            alt="Card cover"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
          {isDone && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-bold flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>DONE</span>
            </div>
          )}
        </div>
      ) : card.coverColor ? (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: card.coverColor }}
        />
      ) : null}

      {/* Done Top Border */}
      {isDone && !card.coverImage && (
        <div className="h-0.5 w-full bg-emerald-500" />
      )}

      <div className="p-2.5 space-y-1.5">
        {/* Labels Row */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {card.labels.map((label) => (
              <span
                key={label.id}
                className="text-[9px] px-1.5 py-0.2 rounded font-semibold tracking-tight bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Card Title & Checkbox */}
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={handleDoneCheckboxClick}
            className="mt-0.5 shrink-0 focus:outline-none transition-transform active:scale-90"
            title={isDone ? 'Mark in progress' : 'Mark as Done'}
          >
            {isDone ? (
              <div className="w-3.5 h-3.5 rounded bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-slate-800 transition-colors" />
            )}
          </button>

          <h4
            className={`flex-1 text-xs font-medium leading-snug break-words transition-colors ${
              isDone
                ? 'line-through text-slate-400 dark:text-slate-500 decoration-slate-400 dark:decoration-slate-500'
                : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
            }`}
          >
            {card.title}
          </h4>
        </div>

        {/* Badges & Meta Row */}
        <div className="flex items-center justify-between gap-1 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center flex-wrap gap-1.5">
            {/* Status dot / indicator */}
            {currentStatus !== 'in_process' && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}>
                <span className={`w-1 h-1 rounded-full ${statusConfig.dotColor}`} />
                <span>{statusConfig.label}</span>
              </span>
            )}

            {/* Priority (if not low) */}
            {card.priority && card.priority !== 'low' && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold border ${priorityMeta.bg} ${priorityMeta.text} ${priorityMeta.border}`}>
                {priorityMeta.icon}
                <span>{priorityMeta.label}</span>
              </span>
            )}

            {/* Due / ETA Date */}
            {formattedEta && (
              <div
                className={`flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                  isOverdue
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700'
                }`}
                title={`Due: ${effectiveEta}`}
              >
                <Clock className="w-2.5 h-2.5" />
                <span>{formattedEta}</span>
              </div>
            )}

            {/* Custom Field (Story Points) */}
            {customFieldFirst && (
              <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-semibold">
                {customFieldFirst[0] === 'Story Points' ? `${customFieldFirst[1]} pts` : customFieldFirst[1]}
              </span>
            )}

            {/* Attachments */}
            {card.attachments && card.attachments.length > 0 && (
              <div className="flex items-center gap-0.5 text-slate-400 hover:text-slate-600" title={`${card.attachments.length} attachments`}>
                <Paperclip className="w-2.5 h-2.5" />
                <span className="font-semibold text-[9px]">{card.attachments.length}</span>
              </div>
            )}
          </div>

          {/* Assignees Avatars */}
          {((card.assignees && card.assignees.length > 0) || card.creator) && (
            <div className="flex items-center -space-x-1 shrink-0">
              {card.assignees && card.assignees.length > 0 ? (
                card.assignees.slice(0, 3).map((assignee) => (
                  <img
                    key={assignee.id}
                    src={
                      assignee.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        assignee.name
                      )}`
                    }
                    alt={assignee.name}
                    title={`Assigned: ${assignee.name}`}
                    className="w-4.5 h-4.5 rounded-full ring-1.5 ring-white dark:ring-slate-900 shadow-2xs object-cover"
                    referrerPolicy="no-referrer"
                  />
                ))
              ) : card.creator ? (
                <div
                  className="w-4.5 h-4.5 rounded-full bg-amber-500 text-slate-950 text-[8px] flex items-center justify-center font-bold ring-1.5 ring-white dark:ring-slate-900 shadow-2xs"
                  title={`Creator: ${card.creator.name}`}
                >
                  {card.creator.name ? card.creator.name.slice(0, 2).toUpperCase() : 'CR'}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
