import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Layout,
  Kanban,
  Table as TableIcon,
  Calendar as CalendarIcon,
  BarChart3,
  FileSpreadsheet,
  Check,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Code2,
  CalendarDays,
  Target,
  Palette,
} from 'lucide-react';
import { ActiveView, Board, BoardTheme, CardItem, ColumnList } from '../types';
import { BOARD_THEMES, INITIAL_CARDS, INITIAL_LISTS } from '../services/sampleData';
import { DEFAULT_SHEET_GID, DEFAULT_SHEET_ID, DEFAULT_SHEET_URL } from '../services/googleSheets';

interface VariationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoard: Board;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onSelectTheme: (theme: BoardTheme) => void;
  onApplyTemplate: (templateData: {
    title: string;
    lists: ColumnList[];
    cards: CardItem[];
    spreadsheetUrl?: string;
    spreadsheetId?: string;
    sheetTabName?: string;
    autoSync?: boolean;
    theme?: BoardTheme;
  }) => void;
}

export const TEMPLATE_VARIATIONS: {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  themeId: string;
  columnCount: number;
  taskCount: number;
  lists: ColumnList[];
  cards: CardItem[];
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  sheetTabName?: string;
}[] = [
  {
    id: 'google-sheet-sync',
    title: 'Google Spreadsheet Live Sync',
    category: 'Cloud Connected',
    description: 'Pre-configured with Google Sheet gid=265307111. Supports live bidirectional sync, column mapping, and automatic save.',
    icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
    themeId: 'professional-polish',
    columnCount: 5,
    taskCount: 7,
    spreadsheetUrl: DEFAULT_SHEET_URL,
    spreadsheetId: DEFAULT_SHEET_ID,
    sheetTabName: 'Sheet1',
    lists: INITIAL_LISTS,
    cards: INITIAL_CARDS,
  },
  {
    id: 'engineering-sprint',
    title: 'Software Engineering & Sprint',
    category: 'Development',
    description: 'Agile sprint workflow with story points, security tags, unit testing checklists, and code review columns.',
    icon: <Code2 className="w-5 h-5 text-blue-600" />,
    themeId: 'professional-polish',
    columnCount: 5,
    taskCount: 6,
    lists: [
      { id: 'eng-backlog', title: 'Sprint Backlog 📌', order: 0, wipLimit: 12 },
      { id: 'eng-todo', title: 'To Develop 💻', order: 1, wipLimit: 6 },
      { id: 'eng-progress', title: 'In Progress ⚡', order: 2, wipLimit: 4 },
      { id: 'eng-review', title: 'Code Review 🔍', order: 3, wipLimit: 3 },
      { id: 'eng-done', title: 'Deployed & QA ✅', order: 4 },
    ],
    cards: [
      {
        id: 'eng-1',
        title: 'Optimize Database Query Indexes for Multi-Tenant Partitioning',
        description: 'Analyze slow query logs and add composite B-tree indices on workspace_id and created_at.',
        listId: 'eng-progress',
        order: 0,
        priority: 'urgent',
        dueDate: '2026-08-23',
        completed: false,
        coverColor: '#3b82f6',
        labels: [
          { id: 'l1', name: 'Database', color: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-700' },
          { id: 'l2', name: 'Performance', color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700' },
        ],
        assignees: [
          { id: 'u1', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
        ],
        checklist: [
          { id: 'c1', text: 'Run EXPLAIN ANALYZE on query benchmark', completed: true },
          { id: 'c2', text: 'Create composite index on (tenant_id, status)', completed: true },
          { id: 'c3', text: 'Monitor query latency in staging', completed: false },
        ],
        comments: [],
        attachments: [],
        customFields: { 'Story Points': '8', 'Module': 'Data Engine' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'eng-2',
        title: 'Implement Dark Mode UI Theme with CSS Variable Tokens',
        description: 'Provide seamless theme switching across all views with persistent local preference.',
        listId: 'eng-review',
        order: 0,
        priority: 'high',
        dueDate: '2026-08-24',
        completed: false,
        coverColor: '#8b5cf6',
        labels: [
          { id: 'l3', name: 'Frontend', color: '#8b5cf6', bg: 'bg-purple-100', text: 'text-purple-700' },
          { id: 'l4', name: 'UI / UX', color: '#06b6d4', bg: 'bg-cyan-100', text: 'text-cyan-700' },
        ],
        assignees: [
          { id: 'u2', name: 'Sara Lin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara' },
        ],
        checklist: [
          { id: 'c4', text: 'Define slate semantic palette', completed: true },
          { id: 'c5', text: 'Test contrast ratios for WCAG compliance', completed: true },
        ],
        comments: [],
        attachments: [],
        customFields: { 'Story Points': '5', 'Module': 'Design System' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'eng-3',
        title: 'End-to-End WebSocket Reconnection Handling',
        description: 'Implement exponential backoff retry on disconnect to ensure 0 lost sync frames.',
        listId: 'eng-todo',
        order: 0,
        priority: 'medium',
        dueDate: '2026-08-26',
        completed: false,
        labels: [{ id: 'l5', name: 'Realtime', color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' }],
        assignees: [
          { id: 'u3', name: 'Devon Miles', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Devon' },
        ],
        checklist: [],
        comments: [],
        attachments: [],
        customFields: { 'Story Points': '3', 'Module': 'Sync Layer' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'eng-4',
        title: 'Containerized Cloud Run Health Check Optimization',
        description: 'Respond with 200 OK on /api/health within 50ms for container ingress readiness.',
        listId: 'eng-done',
        order: 0,
        priority: 'low',
        dueDate: '2026-08-19',
        completed: true,
        coverColor: '#10b981',
        labels: [{ id: 'l6', name: 'DevOps', color: '#64748b', bg: 'bg-slate-100', text: 'text-slate-700' }],
        assignees: [{ id: 'u1', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' }],
        checklist: [{ id: 'c6', text: 'Add probe route in server.ts', completed: true }],
        comments: [],
        attachments: [],
        customFields: { 'Story Points': '2', 'Module': 'Infra' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'sales-pipeline',
    title: 'Sales CRM & Lead Pipeline',
    category: 'Sales & Business',
    description: 'Track client accounts from initial outreach and product demos to contract negotiation and closed revenue.',
    icon: <Briefcase className="w-5 h-5 text-amber-600" />,
    themeId: 'ocean',
    columnCount: 5,
    taskCount: 5,
    lists: [
      { id: 'sales-lead', title: 'New Leads 📥', order: 0 },
      { id: 'sales-contacted', title: 'Contacted 📞', order: 1 },
      { id: 'sales-demo', title: 'Demo Scheduled 📅', order: 2 },
      { id: 'sales-proposal', title: 'Proposal Sent 📑', order: 3 },
      { id: 'sales-won', title: 'Closed / Won 🏆', order: 4 },
    ],
    cards: [
      {
        id: 'sales-c1',
        title: 'Acme Global - Enterprise Tier Expansion ($45,000 ARR)',
        description: 'VP of Engineering requested 250 additional developer seats and custom SSO SAML configuration.',
        listId: 'sales-proposal',
        order: 0,
        priority: 'urgent',
        dueDate: '2026-08-25',
        completed: false,
        coverColor: '#f59e0b',
        labels: [{ id: 'sl1', name: 'Enterprise', color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700' }],
        assignees: [{ id: 'sa1', name: 'Jordan Hayes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan' }],
        checklist: [
          { id: 'sc1', text: 'Draft Master Services Agreement', completed: true },
          { id: 'sc2', text: 'Security review questionnaire approval', completed: true },
          { id: 'sc3', text: 'Executive signature from VP', completed: false },
        ],
        comments: [],
        attachments: [],
        customFields: { 'Deal Value': '$45,000', 'Probability': '80%' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'sales-c2',
        title: 'Nordic Health Systems - Pilot Deployment ($18,000 ARR)',
        description: 'Clinical team reviewing HIPAA compliance checklist and spreadsheet data sync security.',
        listId: 'sales-demo',
        order: 0,
        priority: 'high',
        dueDate: '2026-08-28',
        completed: false,
        labels: [{ id: 'sl2', name: 'Healthcare', color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' }],
        assignees: [{ id: 'sa1', name: 'Jordan Hayes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan' }],
        checklist: [],
        comments: [],
        attachments: [],
        customFields: { 'Deal Value': '$18,000', 'Probability': '60%' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'sales-c3',
        title: 'Vertex Logistics - Closed Contract ($32,000 ARR)',
        description: 'Signed annual subscription with full spreadsheet workflow integration and onboarding kick-off.',
        listId: 'sales-won',
        order: 0,
        priority: 'medium',
        dueDate: '2026-08-18',
        completed: true,
        coverColor: '#10b981',
        labels: [{ id: 'sl3', name: 'Signed', color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' }],
        assignees: [{ id: 'sa2', name: 'Elena Rostova', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' }],
        checklist: [{ id: 'sc4', text: 'Invoice delivered and paid', completed: true }],
        comments: [],
        attachments: [],
        customFields: { 'Deal Value': '$32,000', 'Probability': '100%' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'content-calendar',
    title: 'Content & Editorial Publishing',
    category: 'Marketing',
    description: 'Manage article drafting, social announcements, graphic design reviews, and publication schedules.',
    icon: <CalendarDays className="w-5 h-5 text-purple-600" />,
    themeId: 'sunset',
    columnCount: 5,
    taskCount: 4,
    lists: [
      { id: 'cnt-ideas', title: 'Content Ideas 💡', order: 0 },
      { id: 'cnt-drafting', title: 'Drafting ✍️', order: 1 },
      { id: 'cnt-design', title: 'Graphics & Review 🎨', order: 2 },
      { id: 'cnt-scheduled', title: 'Scheduled ⏰', order: 3 },
      { id: 'cnt-published', title: 'Published 🚀', order: 4 },
    ],
    cards: [
      {
        id: 'cnt-1',
        title: 'Deep Dive: How to Automate Google Sheets with Modern Trello Boards',
        description: 'Comprehensive technical tutorial on bidirectional REST API integration and CSV parsing.',
        listId: 'cnt-scheduled',
        order: 0,
        priority: 'high',
        dueDate: '2026-08-21',
        completed: false,
        coverColor: '#ec4899',
        labels: [{ id: 'cl1', name: 'Blog', color: '#ec4899', bg: 'bg-pink-100', text: 'text-pink-700' }],
        assignees: [{ id: 'ca1', name: 'Maya Patel', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya' }],
        checklist: [
          { id: 'cc1', text: 'Write 1,500-word draft', completed: true },
          { id: 'cc2', text: 'Create animated GIF walkthrough', completed: true },
          { id: 'cc3', text: 'Set social teaser copy', completed: true },
        ],
        comments: [],
        attachments: [],
        customFields: { 'Channel': 'Official Blog', 'Target Word Count': '1,500' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'product-roadmap',
    title: 'Product Roadmap & Milestones',
    category: 'Product Strategy',
    description: 'Track quarterly feature epics, UX wireframes, beta testing programs, and milestone releases.',
    icon: <Target className="w-5 h-5 text-indigo-600" />,
    themeId: 'emerald',
    columnCount: 5,
    taskCount: 5,
    lists: [
      { id: 'rod-q1', title: 'Q1 Planned 🗺️', order: 0 },
      { id: 'rod-ux', title: 'UX & Specs 📐', order: 1 },
      { id: 'rod-dev', title: 'Engineering 🔨', order: 2 },
      { id: 'rod-beta', title: 'Beta Testing 🧪', order: 3 },
      { id: 'rod-live', title: 'General Availability 🎉', order: 4 },
    ],
    cards: [
      {
        id: 'rod-1',
        title: 'Multi-Workspace Collaborative Realtime Sync',
        description: 'Enables cross-team sharing with custom permission roles and active presence cursors.',
        listId: 'rod-dev',
        order: 0,
        priority: 'urgent',
        dueDate: '2026-09-01',
        completed: false,
        coverColor: '#10b981',
        labels: [{ id: 'rl1', name: 'Core Feature', color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' }],
        assignees: [{ id: 'ra1', name: 'David Kim', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' }],
        checklist: [],
        comments: [],
        attachments: [],
        customFields: { 'Quarter': 'Q3 2026', 'Impact': 'High' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
];

export const VariationPreviewModal: React.FC<VariationPreviewModalProps> = ({
  isOpen,
  onClose,
  currentBoard,
  activeView,
  onSelectView,
  onSelectTheme,
  onApplyTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'views' | 'themes'>('templates');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('google-sheet-sync');

  if (!isOpen) return null;

  const handleApplySelectedTemplate = (tpl: typeof TEMPLATE_VARIATIONS[0]) => {
    const matchedTheme = BOARD_THEMES.find((t) => t.id === tpl.themeId) || BOARD_THEMES[0];
    onApplyTemplate({
      title: tpl.title,
      lists: tpl.lists,
      cards: tpl.cards,
      spreadsheetUrl: tpl.spreadsheetUrl,
      spreadsheetId: tpl.spreadsheetId,
      sheetTabName: tpl.sheetTabName,
      autoSync: true,
      theme: matchedTheme,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-[#172B4D]"
        id="variation-preview-modal"
      >
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-gray-200 flex items-center justify-between bg-[#F4F5F7]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#0055CC] text-white shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#172B4D]">
                  Board Variations & Preview Switcher
                </h2>
                <p className="text-xs text-[#44546F] mt-0.5">
                  Instant 1-click preview across layout views, workflow datasets, and visual themes
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              id="close-variation-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-gray-200 bg-white flex items-center gap-2">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'templates'
                  ? 'border-[#0055CC] text-[#0055CC]'
                  : 'border-transparent text-[#44546F] hover:text-[#172B4D]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Workflow Templates ({TEMPLATE_VARIATIONS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('views')}
              className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'views'
                  ? 'border-[#0055CC] text-[#0055CC]'
                  : 'border-transparent text-[#44546F] hover:text-[#172B4D]'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>Interactive Views (4)</span>
            </button>

            <button
              onClick={() => setActiveTab('themes')}
              className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'themes'
                  ? 'border-[#0055CC] text-[#0055CC]'
                  : 'border-transparent text-[#44546F] hover:text-[#172B4D]'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Visual Themes ({BOARD_THEMES.length})</span>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="p-6 overflow-y-auto flex-1 max-h-[60vh]">
            {/* 1. Workflow Template Variations */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TEMPLATE_VARIATIONS.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0055CC] bg-blue-50/50 shadow-sm ring-2 ring-[#0055CC]/10'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-white border border-gray-200 shadow-xs">
                                {tpl.icon}
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#44546F] bg-gray-100 px-2 py-0.5 rounded">
                                  {tpl.category}
                                </span>
                                <h3 className="font-bold text-sm text-[#172B4D] mt-0.5">{tpl.title}</h3>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#0055CC] text-white flex items-center justify-center text-xs">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-[#44546F] leading-relaxed line-clamp-2 mt-1">
                            {tpl.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                          <div className="text-[11px] text-[#44546F] flex items-center gap-3">
                            <span><strong>{tpl.columnCount}</strong> Columns</span>
                            <span>•</span>
                            <span><strong>{tpl.cards.length}</strong> Tasks</span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySelectedTemplate(tpl);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0055CC] hover:bg-[#0047AB] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                          >
                            <span>Load Template</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Interactive View Variations */}
            {activeTab === 'views' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kanban */}
                <div
                  onClick={() => {
                    onSelectView('kanban');
                    onClose();
                  }}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    activeView === 'kanban'
                      ? 'border-[#0055CC] bg-blue-50/50 ring-2 ring-[#0055CC]/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                      <Kanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#172B4D]">Kanban Board View</h3>
                      <p className="text-[11px] text-[#44546F]">Visual columns & drag-and-drop workflow</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#44546F] mt-2 leading-relaxed">
                    Organize cards with WIP limits, drag-and-drop between columns, quick completion checkmarks, and detail drawers.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0055CC]">
                      {activeView === 'kanban' ? '✓ Currently Active' : 'Switch to Board View →'}
                    </span>
                  </div>
                </div>

                {/* Spreadsheet Table */}
                <div
                  onClick={() => {
                    onSelectView('spreadsheet');
                    onClose();
                  }}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    activeView === 'spreadsheet'
                      ? 'border-[#0055CC] bg-blue-50/50 ring-2 ring-[#0055CC]/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <TableIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#172B4D]">Spreadsheet Table View</h3>
                      <p className="text-[11px] text-[#44546F]">Inline editable grid with column sorting</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#44546F] mt-2 leading-relaxed">
                    Edit task properties directly in table cells, sort by title/status/priority, add new rows, and export to CSV.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0055CC]">
                      {activeView === 'spreadsheet' ? '✓ Currently Active' : 'Switch to Table View →'}
                    </span>
                  </div>
                </div>

                {/* Calendar */}
                <div
                  onClick={() => {
                    onSelectView('calendar');
                    onClose();
                  }}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    activeView === 'calendar'
                      ? 'border-[#0055CC] bg-blue-50/50 ring-2 ring-[#0055CC]/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#172B4D]">Timeline & Calendar View</h3>
                      <p className="text-[11px] text-[#44546F]">Monthly due-date calendar planner</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#44546F] mt-2 leading-relaxed">
                    View upcoming task deadlines across monthly calendar cells and create new scheduled cards with 1 click.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0055CC]">
                      {activeView === 'calendar' ? '✓ Currently Active' : 'Switch to Calendar View →'}
                    </span>
                  </div>
                </div>

                {/* Analytics */}
                <div
                  onClick={() => {
                    onSelectView('analytics');
                    onClose();
                  }}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    activeView === 'analytics'
                      ? 'border-[#0055CC] bg-blue-50/50 ring-2 ring-[#0055CC]/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#172B4D]">Metrics & Analytics View</h3>
                      <p className="text-[11px] text-[#44546F]">Sprint velocity, team workload & completion</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#44546F] mt-2 leading-relaxed">
                    Real-time metrics on completion rates, overdue tasks, priority breakdown charts, and team member workload.
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0055CC]">
                      {activeView === 'analytics' ? '✓ Currently Active' : 'Switch to Analytics View →'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Visual Themes Variations */}
            {activeTab === 'themes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {BOARD_THEMES.map((theme) => {
                  const isActive = currentBoard.theme.id === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onSelectTheme(theme);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-28 ${
                        isActive
                          ? 'border-[#0055CC] bg-blue-50/40 ring-2 ring-[#0055CC]/10'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full bg-gradient-to-tr ${theme.gradient} border border-gray-300`} />
                          <span className="font-bold text-xs text-[#172B4D]">{theme.name}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-[#0055CC]" />}
                      </div>

                      <div className="w-full h-8 rounded-lg overflow-hidden flex border border-gray-200">
                        <div className="w-1/3 h-full bg-[#0055CC]/20" />
                        <div className="w-1/3 h-full bg-gray-100" />
                        <div className="w-1/3 h-full bg-emerald-500/20" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-[#F4F5F7] border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-[#44546F]">
              All variations support real-time editing, drag-and-drop, and Google Sheets sync.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-[#172B4D] font-bold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
  );
};
