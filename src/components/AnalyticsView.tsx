import React from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  Users,
  Tag,
  BarChart3,
  TrendingUp,
  PieChart,
  ListTodo,
} from 'lucide-react';
import { Board, PriorityLevel } from '../types';

interface AnalyticsViewProps {
  board: Board;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ board }) => {
  const totalCards = board.cards.length;
  const completedCards = board.cards.filter((c) => c.completed).length;
  const completionRate = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  // Overdue count
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCards = board.cards.filter((c) => {
    if (!c.dueDate || c.completed) return false;
    const due = new Date(c.dueDate);
    return !isNaN(due.getTime()) && due < today;
  }).length;

  // Total Checklist Items
  let totalChecklistItems = 0;
  let completedChecklistItems = 0;
  board.cards.forEach((c) => {
    totalChecklistItems += c.checklist.length;
    completedChecklistItems += c.checklist.filter((i) => i.completed).length;
  });
  const checklistRate =
    totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;

  // Priority counts
  const priorityCounts: Record<PriorityLevel, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  board.cards.forEach((c) => {
    if (priorityCounts[c.priority] !== undefined) {
      priorityCounts[c.priority]++;
    }
  });

  // Assignee counts
  const assigneeCounts: Record<string, { name: string; avatar: string; count: number; completed: number }> = {};
  let unassignedCount = 0;

  board.cards.forEach((c) => {
    if (c.assignees.length === 0) {
      unassignedCount++;
    } else {
      c.assignees.forEach((a) => {
        if (!assigneeCounts[a.name]) {
          assigneeCounts[a.name] = { name: a.name, avatar: a.avatar, count: 0, completed: 0 };
        }
        assigneeCounts[a.name].count++;
        if (c.completed) assigneeCounts[a.name].completed++;
      });
    }
  });

  // Label counts
  const labelCounts: Record<string, { name: string; color: string; count: number }> = {};
  board.cards.forEach((c) => {
    c.labels.forEach((l) => {
      if (!labelCounts[l.name]) {
        labelCounts[l.name] = { name: l.name, color: l.color, count: 0 };
      }
      labelCounts[l.name].count++;
    });
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCards}</h3>
            <p className="text-xs text-slate-400 mt-1">{board.lists.length} active columns</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <ListTodo className="w-6 h-6" />
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Rate</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completionRate}%</h3>
            <p className="text-xs text-slate-400 mt-1">{completedCards} of {totalCards} finished</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Tasks</p>
            <h3 className={`text-2xl font-black mt-1 ${overdueCards > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {overdueCards}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{overdueCards > 0 ? 'Action required' : 'All on schedule'}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Checklist Velocity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Checklist Items</p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{checklistRate}%</h3>
            <p className="text-xs text-slate-400 mt-1">{completedChecklistItems}/{totalChecklistItems} subtasks</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Breakdown Section: Columns & Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-500" />
              <span>Cards by Column Stage</span>
            </h4>
            <span className="text-xs text-slate-500 font-semibold">{board.lists.length} lists</span>
          </div>

          <div className="space-y-3 pt-2">
            {board.lists.map((list) => {
              const count = board.cards.filter((c) => c.listId === list.id).length;
              const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;

              return (
                <div key={list.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {list.title}
                    </span>
                    <span className="text-slate-500 font-bold">
                      {count} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Priority Breakdown</span>
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Urgent</span>
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-800 dark:text-rose-200 mt-2">
                {priorityCounts.urgent}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">High</span>
                <span className="text-amber-500 font-bold text-xs">P1</span>
              </div>
              <p className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-2">
                {priorityCounts.high}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">Medium</span>
                <span className="text-sky-500 font-bold text-xs">P2</span>
              </div>
              <p className="text-2xl font-black text-sky-800 dark:text-sky-200 mt-2">
                {priorityCounts.medium}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Low</span>
                <span className="text-slate-400 font-bold text-xs">P3</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-2">
                {priorityCounts.low}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignee Workload & Labels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Balance */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Team Member Workload</span>
            </h4>
          </div>

          <div className="space-y-3 pt-2">
            {Object.values(assigneeCounts).map((member) => {
              const pct = totalCards > 0 ? Math.round((member.count / totalCards) * 100) : 0;

              return (
                <div key={member.name} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={member.avatar} alt={member.name} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
                      <p className="text-[10px] text-slate-400">{member.completed} completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      {member.count} tasks
                    </span>
                  </div>
                </div>
              );
            })}

            {unassignedCount > 0 && (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 opacity-70">
                <span className="text-xs text-slate-500 italic">Unassigned Tasks</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{unassignedCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Labels Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" />
              <span>Labels Distribution</span>
            </h4>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {Object.values(labelCounts).map((lbl) => (
              <div
                key={lbl.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lbl.color }} />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{lbl.name}</span>
                <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  {lbl.count}
                </span>
              </div>
            ))}
            {Object.keys(labelCounts).length === 0 && (
              <p className="text-xs text-slate-400 italic">No labels assigned yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
