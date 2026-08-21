import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Board, CardItem } from '../types';

interface CalendarViewProps {
  board: Board;
  onCardClick: (card: CardItem) => void;
  onAddCardOnDate: (title: string, dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  board,
  onCardClick,
  onAddCardOnDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month (0: Sunday, 1: Monday, ...)
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0-6

  // Total days in month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map cards by Date string YYYY-MM-DD
  const cardsByDate: Record<string, CardItem[]> = {};
  const unassignedCards: CardItem[] = [];

  board.cards.forEach((card) => {
    if (card.dueDate) {
      const dateKey = card.dueDate.slice(0, 10);
      if (!cardsByDate[dateKey]) cardsByDate[dateKey] = [];
      cardsByDate[dateKey].push(card);
    } else {
      unassignedCards.push(card);
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar cells
  const calendarCells = [];

  // Empty leading cells
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }

  // Days in month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const formattedDay = String(day).padStart(2, '0');
    const formattedMonth = String(month + 1).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    calendarCells.push({ day, dateStr });
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Calendar Header Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{monthName}</h2>
            <p className="text-xs text-slate-500">Timeline & Due Date Planner</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {daysOfWeek.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-50/50 dark:bg-slate-950/20 p-2" />;
            }

            const dayCards = cardsByDate[cell.dateStr] || [];
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={cell.dateStr}
                className={`min-h-[110px] p-2 flex flex-col justify-between group transition-colors ${
                  isToday
                    ? 'bg-sky-50/60 dark:bg-sky-950/30 font-semibold'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cell.day}
                  </span>

                  <button
                    onClick={() => {
                      const title = prompt(`Add task for ${cell.dateStr}:`);
                      if (title && title.trim()) {
                        onAddCardOnDate(title.trim(), cell.dateStr);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded transition-all"
                    title="Add task on this day"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Cards List */}
                <div className="space-y-1 flex-1 overflow-y-auto max-h-[90px] custom-scrollbar">
                  {dayCards.map((card) => {
                    const isDone = card.completed;

                    return (
                      <div
                        key={card.id}
                        onClick={() => onCardClick(card)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer truncate flex items-center gap-1.5 transition-transform hover:scale-[1.02] shadow-xs ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 line-through opacity-80'
                            : card.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : card.priority === 'high'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={card.title}
                      >
                        {card.priority === 'urgent' && <Flame className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
                        {isDone && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />}
                        <span className="truncate">{card.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
