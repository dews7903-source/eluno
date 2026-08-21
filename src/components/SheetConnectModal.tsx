import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Upload,
  Link,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Board, ColumnMapping, UserProfile } from '../types';
import {
  DEFAULT_SHEET_URL,
  DEFAULT_SHEET_ID,
  parseGoogleSheetUrl,
  fetchSpreadsheetMetadata,
  fetchSheetValues,
  parseRawDataToBoard,
  parseCSVData,
} from '../services/googleSheets';

interface SheetConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  user?: UserProfile | null;
  onGoogleSignIn?: () => void;
  onApplyNewBoardData: (newData: {
    lists: Board['lists'];
    cards: Board['cards'];
    headers: string[];
    mapping: ColumnMapping;
    sheetTitle?: string;
    sheetUrl?: string;
    sheetId?: string;
    tabName?: string;
    availableTabs?: string[];
  }) => void;
}

export const SheetConnectModal: React.FC<SheetConnectModalProps> = ({
  isOpen,
  onClose,
  board,
  onApplyNewBoardData,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload' | 'paste' | 'mapping'>('url');
  const [sheetUrl, setSheetUrl] = useState(board.spreadsheetUrl || DEFAULT_SHEET_URL);
  const [selectedTab, setSelectedTab] = useState(board.sheetTabName || 'Sheet1');
  const [availableTabs, setAvailableTabs] = useState<string[]>(board.availableTabs || ['Sheet1']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Column mapping states
  const [headers, setHeaders] = useState<string[]>(board.headers || []);
  const [mapping, setMapping] = useState<ColumnMapping>(board.columnMapping);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [fetchedSheetTitle, setFetchedSheetTitle] = useState<string>(board.title);
  const [pastedCSV, setPastedCSV] = useState('');

  if (!isOpen) return null;

  const handleFetchSheetInfo = async (urlToFetch?: string) => {
    setErrorMsg(null);
    setSuccessNotice(null);
    const targetUrl = urlToFetch || sheetUrl;
    const parsed = parseGoogleSheetUrl(targetUrl);
    
    if (!parsed.sheetId) {
      setErrorMsg('Please enter a valid Google Spreadsheet URL or Sheet ID.');
      return;
    }

    setIsLoading(true);
    try {
      let token: string | null = null;
      try {
        const { getAccessToken } = await import('../services/localAuthPlugin');
        token = await getAccessToken();
      } catch (_) {}

      const meta = await fetchSpreadsheetMetadata(parsed.sheetId, token);
      const tabNames = meta.tabs.map((t) => t.title);
      setAvailableTabs(tabNames);
      setFetchedSheetTitle(meta.title);

      const activeTabName = tabNames.length > 0 ? tabNames[0] : (parsed.gid || 'Sheet1');
      setSelectedTab(activeTabName);

      // Fetch values for the active tab
      const data = await fetchSheetValues(parsed.sheetId, activeTabName, token);
      if (data.headers.length === 0) {
        throw new Error(`The tab "${activeTabName}" is empty or has no header columns.`);
      }

      setHeaders(data.headers);
      setPreviewRows(data.rows);

      const parsedBoard = parseRawDataToBoard(data.headers, data.rows, meta.title);
      setMapping(parsedBoard.mapping);

      setSuccessNotice(`Successfully connected "${meta.title}". Found ${data.headers.length} columns and ${data.rows.length} rows.`);
      setActiveTab('mapping');
    } catch (err: any) {
      console.error('Error fetching sheet:', err);
      setErrorMsg(err.message || 'Failed to access Google Sheet. Please ensure you have permission or connect your Google account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickConnectDefault = () => {
    setSheetUrl(DEFAULT_SHEET_URL);
    handleFetchSheetInfo(DEFAULT_SHEET_URL);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseCSVData(text);
        if (parsed.headers.length === 0) {
          throw new Error('CSV file appears to be empty or formatted incorrectly.');
        }
        setHeaders(parsed.headers);
        setPreviewRows(parsed.rows);
        setFetchedSheetTitle(file.name.replace(/\.[^/.]+$/, ''));
        const parsedBoard = parseRawDataToBoard(parsed.headers, parsed.rows, file.name);
        setMapping(parsedBoard.mapping);
        setSuccessNotice(`Loaded ${parsed.headers.length} columns and ${parsed.rows.length} rows from CSV file.`);
        setActiveTab('mapping');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleParsePastedCSV = () => {
    setErrorMsg(null);
    setSuccessNotice(null);
    if (!pastedCSV.trim()) {
      setErrorMsg('Please paste comma-separated or tab-separated spreadsheet values.');
      return;
    }

    try {
      const parsed = parseCSVData(pastedCSV);
      if (parsed.headers.length === 0) {
        throw new Error('Could not parse any columns from the pasted content.');
      }
      setHeaders(parsed.headers);
      setPreviewRows(parsed.rows);
      setFetchedSheetTitle('Pasted Spreadsheet Data');
      const parsedBoard = parseRawDataToBoard(parsed.headers, parsed.rows, 'Pasted Data');
      setMapping(parsedBoard.mapping);
      setSuccessNotice(`Parsed ${parsed.headers.length} columns and ${parsed.rows.length} rows.`);
      setActiveTab('mapping');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse spreadsheet text.');
    }
  };

  const handleApply = () => {
    const parsedBoard = parseRawDataToBoard(headers, previewRows, fetchedSheetTitle || board.title, mapping);
    const parsedUrl = parseGoogleSheetUrl(sheetUrl);

    onApplyNewBoardData({
      lists: parsedBoard.lists,
      cards: parsedBoard.cards,
      headers,
      mapping,
      sheetTitle: fetchedSheetTitle,
      sheetUrl,
      sheetId: parsedUrl.sheetId || undefined,
      tabName: selectedTab,
      availableTabs,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans"
          id="sheet-connect-modal"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Connect Google Sheet & 2-Way Sync</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Load any Google Sheet into your Kanban board with bidirectional real-time synchronization
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Target Sheet Shortcut Banner */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-[#0055CC] shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 truncate">
                Target Sheet: <strong className="text-[#0055CC]">gid=265307111</strong>
              </span>
            </div>
            <button
              onClick={handleQuickConnectDefault}
              disabled={isLoading}
              className="px-3 py-1 bg-[#0055CC] hover:bg-[#0047AB] text-white rounded-md text-xs font-semibold shrink-0 shadow-xs transition-colors flex items-center gap-1"
            >
              <span>1-Click Load</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'url'
                  ? 'border-[#0055CC] text-[#0055CC]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>Google Sheet URL</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-[#0055CC] text-[#0055CC]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'paste'
                  ? 'border-[#0055CC] text-[#0055CC]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Data</span>
            </button>

            {headers.length > 0 && (
              <button
                onClick={() => setActiveTab('mapping')}
                className={`flex items-center gap-2 pb-2.5 px-2 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === 'mapping'
                    ? 'border-[#0055CC] text-[#0055CC]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Column Mapping ({headers.length})</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            {successNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1 font-medium">{successNotice}</div>
              </div>
            )}

            {/* TAB 1: Google Sheets URL */}
            {activeTab === 'url' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Google Spreadsheet URL or Sheet ID
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1GYOXTCW5NLDvaIh4elVRRthln2orBY8sryqQect3kfE/edit?gid=265307111"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055CC]/20 focus:border-[#0055CC]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Paste any spreadsheet link with view or edit access.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleFetchSheetInfo()}
                    disabled={isLoading || !sheetUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0055CC] hover:bg-[#0047AB] text-white font-semibold text-xs shadow-md disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Connecting & Reading Spreadsheet...' : 'Fetch Sheet & Configure Mapping'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Upload CSV File */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0055CC] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0055CC] group-hover:scale-110 transition-transform mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or drag & drop CSV file
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports exported sheets from Google Sheets, Excel (.csv, .tsv)
                  </p>
                  <input
                    type="file"
                    accept=".csv, .tsv, .txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* TAB 3: Paste CSV */}
            {activeTab === 'paste' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Paste Spreadsheet Content (CSV / TSV)
                  </label>
                  <textarea
                    rows={6}
                    value={pastedCSV}
                    onChange={(e) => setPastedCSV(e.target.value)}
                    placeholder="Task Title,Status,Description,Priority,Due Date,Assignee&#10;Implement Auth,To Do,Google OAuth integration,High,2026-08-25,Alex&#10;Design Kanban,In Progress,Atlassian theme polish,Urgent,2026-08-22,Sarah"
                    className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055CC]/20"
                  />
                </div>

                <button
                  onClick={handleParsePastedCSV}
                  disabled={!pastedCSV.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0055CC] hover:bg-[#0047AB] text-white font-semibold text-xs shadow-md disabled:opacity-50 transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  <span>Parse Data & Map Columns</span>
                </button>
              </div>
            )}

            {/* TAB 4: Column Mapping */}
            {activeTab === 'mapping' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Detected {headers.length} Columns
                    </span>
                    <p className="text-[11px] text-slate-500">{previewRows.length} rows ready to import</p>
                  </div>
                  {availableTabs.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Tab:</span>
                      <select
                        value={selectedTab}
                        onChange={(e) => {
                          setSelectedTab(e.target.value);
                          if (board.spreadsheetId) {
                            handleFetchSheetInfo();
                          }
                        }}
                        className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-medium"
                      >
                        {availableTabs.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Title Col */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Task Title Column *
                    </label>
                    <select
                      value={mapping.titleCol}
                      onChange={(e) => setMapping({ ...mapping, titleCol: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status / List Col */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Status / Column List *
                    </label>
                    <select
                      value={mapping.listCol}
                      onChange={(e) => setMapping({ ...mapping, listCol: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description Col */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Description Column
                    </label>
                    <select
                      value={mapping.descCol || ''}
                      onChange={(e) => setMapping({ ...mapping, descCol: e.target.value || undefined })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="">(None)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Col */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Priority Column
                    </label>
                    <select
                      value={mapping.priorityCol || ''}
                      onChange={(e) => setMapping({ ...mapping, priorityCol: e.target.value || undefined })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="">(None)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date Col */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Due Date Column
                    </label>
                    <select
                      value={mapping.dueDateCol || ''}
                      onChange={(e) => setMapping({ ...mapping, dueDateCol: e.target.value || undefined })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="">(None)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee Col */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Assignee Column
                    </label>
                    <select
                      value={mapping.assigneeCol || ''}
                      onChange={(e) => setMapping({ ...mapping, assigneeCol: e.target.value || undefined })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="">(None)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleApply}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply & Render Board ({previewRows.length} Cards)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
