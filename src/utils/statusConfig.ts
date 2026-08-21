import React from 'react';
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  Search,
  Archive,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { CardStatus } from '../types';

export interface StatusConfig {
  id: CardStatus;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const CARD_STATUS_CONFIG: Record<CardStatus, StatusConfig> = {
  pending: {
    id: 'pending',
    label: 'Pending',
    shortLabel: 'Pending',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    icon: Clock,
    description: 'Waiting for start or prerequisites',
  },
  in_process: {
    id: 'in_process',
    label: 'In Process',
    shortLabel: 'In Process',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    dotColor: 'bg-blue-500 animate-pulse',
    icon: PlayCircle,
    description: 'Currently being actively worked on',
  },
  in_review: {
    id: 'in_review',
    label: 'In Review',
    shortLabel: 'Review',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800',
    dotColor: 'bg-purple-500',
    icon: Search,
    description: 'Under QA, review or stakeholder check',
  },
  hold: {
    id: 'hold',
    label: 'Hold',
    shortLabel: 'On Hold',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    icon: PauseCircle,
    description: 'Blocked or paused temporarily',
  },
  backlog: {
    id: 'backlog',
    label: 'Backlog',
    shortLabel: 'Backlog',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-400',
    icon: Archive,
    description: 'Planned for future cycle',
  },
  done: {
    id: 'done',
    label: 'Done',
    shortLabel: 'Done',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
    description: 'Completed and verified',
  },
};

export const ALL_CARD_STATUSES: CardStatus[] = [
  'pending',
  'in_process',
  'in_review',
  'hold',
  'backlog',
  'done',
];

/**
 * Infer or normalize a card's status from its status property, listId, or completed flag
 */
export function getNormalizedCardStatus(card: {
  status?: CardStatus;
  completed?: boolean;
  listId?: string;
}): CardStatus {
  if (card.status && CARD_STATUS_CONFIG[card.status]) {
    return card.status;
  }

  if (card.completed) {
    return 'done';
  }

  const list = (card.listId || '').toLowerCase();
  if (list.includes('done') || list.includes('complete')) return 'done';
  if (list.includes('hold') || list.includes('block')) return 'hold';
  if (list.includes('review') || list.includes('qa')) return 'in_review';
  if (list.includes('progress') || list.includes('process') || list.includes('doing')) return 'in_process';
  if (list.includes('backlog')) return 'backlog';
  if (list.includes('todo') || list.includes('pending')) return 'pending';

  return 'in_process';
}
