import Papa from 'papaparse';
import { Board, CardItem, ColumnList, ColumnMapping, PriorityLevel, CardLabel, ChecklistItem } from '../types';

export const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1GYOXTCW5NLDvaIh4elVRRthln2orBY8sryqQect3kfE/edit?gid=265307111#gid=265307111';
export const DEFAULT_SHEET_ID = '1GYOXTCW5NLDvaIh4elVRRthln2orBY8sryqQect3kfE';
export const DEFAULT_SHEET_GID = '265307111';

export interface SheetInfo {
  sheetId: string;
  title: string;
  tabs: { id: number; title: string; gid: string }[];
}

export function parseGoogleSheetUrl(url: string): { sheetId: string | null; gid: string | null } {
  if (!url) return { sheetId: null, gid: null };
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
  return {
    sheetId: idMatch ? idMatch[1] : (url.length > 20 && !url.includes('/') ? url : null),
    gid: gidMatch ? gidMatch[1] : null,
  };
}

// Fetch spreadsheet information (using API if token present, or fallback)
export async function fetchSpreadsheetMetadata(sheetId: string, token?: string | null): Promise<SheetInfo> {
  if (token) {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const title = data.properties?.title || 'Google Sheet Board';
        const tabs = (data.sheets || []).map((s: any) => ({
          id: s.properties.sheetId,
          title: s.properties.title,
          gid: String(s.properties.sheetId),
        }));

        return {
          sheetId,
          title,
          tabs: tabs.length > 0 ? tabs : [{ id: 0, title: 'Sheet1', gid: '0' }],
        };
      }
    } catch (err) {
      console.warn('API metadata fetch failed, falling back to public fetch:', err);
    }
  }

  // Fallback for public or direct sheets
  return {
    sheetId,
    title: 'Google Spreadsheet',
    tabs: [
      { id: 265307111, title: 'Sheet1', gid: '265307111' },
      { id: 0, title: 'Main Sheet', gid: '0' },
    ],
  };
}

// Fetch values from Google Sheet (OAuth API with public CSV fallback)
export async function fetchSheetValues(
  sheetId: string,
  tabNameOrGid: string,
  token?: string | null
): Promise<{ headers: string[]; rows: string[][] }> {
  // 1. Try authenticated Google Sheets REST API v4 if token is present
  if (token) {
    try {
      const range = tabNameOrGid && isNaN(Number(tabNameOrGid)) ? `'${tabNameOrGid}'!A1:ZZ5000` : 'A1:ZZ5000';
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawValues: string[][] = data.values || [];
        if (rawValues.length > 0) {
          const headers = rawValues[0].map((h) => String(h || '').trim());
          const rows = rawValues.slice(1);
          return { headers, rows };
        }
      }
    } catch (err) {
      console.warn('Authenticated fetch failed, attempting public CSV export fallback:', err);
    }
  }

  // 2. Public CSV Export Fallback (Works for all viewable spreadsheets without requiring OAuth)
  const gidParam = tabNameOrGid && !isNaN(Number(tabNameOrGid)) ? tabNameOrGid : (sheetId === DEFAULT_SHEET_ID ? DEFAULT_SHEET_GID : '0');
  
  const candidateUrls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gidParam}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidParam}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
  ];

  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>')) {
          const parsed = parseCSVData(text);
          if (parsed.headers.length > 0) {
            return parsed;
          }
        }
      }
    } catch (csvErr) {
      console.warn(`Attempt failed for ${url}:`, csvErr);
    }
  }

  throw new Error(
    'Could not access Google Sheet. Please sign in with Google or verify the sheet sharing setting is set to "Anyone with the link can view".'
  );
}

// Write back to Google Sheets
export async function writeSheetValues(
  sheetId: string,
  tabName: string,
  values: (string | number)[][],
  token: string
): Promise<void> {
  const range = tabName ? `'${tabName}'!A1` : 'A1';
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update Google Sheet (status ${response.status})`);
  }
}

const PRESET_LABEL_COLORS: { [key: string]: { bg: string; text: string; color: string } } = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', color: '#3b82f6' },
  green: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', color: '#10b981' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', color: '#f59e0b' },
  red: { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', color: '#f43f5e' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', color: '#a855f7' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', color: '#6366f1' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', color: '#14b8a6' },
};

export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (terms: string[]): string => {
    for (const term of terms) {
      const found = headers.find(
        (h) => h.toLowerCase() === term || h.toLowerCase().includes(term)
      );
      if (found) return found;
    }
    return '';
  };

  const titleCol = findMatch(['campaign', 'campaign name', 'task', 'title', 'item', 'name', 'summary', 'feature', 'ticket', 'action', 'story']) || headers[0] || 'Campaign';
  const listCol = findMatch(['status', 'list', 'stage', 'column', 'state', 'phase', 'lane', 'progress']) || (headers.length > 1 ? headers[1] : 'Status');
  const descCol = findMatch(['desc', 'description', 'notes', 'detail', 'details', 'body', 'comment', 'content']);
  const priorityCol = findMatch(['priority', 'severity', 'urgency', 'importance', 'level', 'impact']);
  const startDateCol = findMatch(['start date', 'start', 'launch date', 'begin date', 'created date', 'kickoff', 'start_date', 'date']);
  const etaDateCol = findMatch(['eta date', 'eta', 'target date', 'delivery date', 'deadline', 'due date', 'due', 'end date', 'completion date', 'eta_date']);
  const dueDateCol = etaDateCol || findMatch(['due', 'date', 'deadline', 'due date', 'target date', 'end date']);
  const assigneeCol = findMatch(['assignee', 'assigned to', 'member', 'person', 'responsible', 'assigned', 'who']);
  const creatorCol = findMatch(['creator', 'created by', 'author', 'reporter', 'submitter', 'requester', 'owner']);
  const labelsCol = findMatch(['label', 'labels', 'tag', 'tags', 'category', 'type', 'epic', 'component']);
  const checklistCol = findMatch(['checklist', 'subtasks', 'todos', 'items', 'tasks', 'steps']);

  return {
    titleCol,
    listCol,
    descCol: descCol || undefined,
    priorityCol: priorityCol || undefined,
    startDateCol: startDateCol || undefined,
    etaDateCol: etaDateCol || undefined,
    dueDateCol: dueDateCol || undefined,
    assigneeCol: assigneeCol || undefined,
    creatorCol: creatorCol || undefined,
    labelsCol: labelsCol || undefined,
    checklistCol: checklistCol || undefined,
    customCols: headers.filter(
      (h) => ![titleCol, listCol, descCol, priorityCol, startDateCol, etaDateCol, dueDateCol, assigneeCol, creatorCol, labelsCol, checklistCol].filter(Boolean).includes(h)
    ),
  };
}

export function parseRawDataToBoard(
  headers: string[],
  rows: string[][],
  boardTitle: string = 'Spreadsheet Board',
  mappingOverride?: ColumnMapping
): { lists: ColumnList[]; cards: CardItem[]; mapping: ColumnMapping } {
  const mapping = mappingOverride || autoDetectColumnMapping(headers);

  const titleIdx = headers.indexOf(mapping.titleCol);
  const listIdx = headers.indexOf(mapping.listCol);
  const descIdx = mapping.descCol ? headers.indexOf(mapping.descCol) : -1;
  const priorityIdx = mapping.priorityCol ? headers.indexOf(mapping.priorityCol) : -1;
  const startDateIdx = mapping.startDateCol ? headers.indexOf(mapping.startDateCol) : -1;
  const etaDateIdx = mapping.etaDateCol ? headers.indexOf(mapping.etaDateCol) : -1;
  const dueDateIdx = mapping.dueDateCol ? headers.indexOf(mapping.dueDateCol) : (etaDateIdx >= 0 ? etaDateIdx : -1);
  const assigneeIdx = mapping.assigneeCol ? headers.indexOf(mapping.assigneeCol) : -1;
  const creatorIdx = mapping.creatorCol ? headers.indexOf(mapping.creatorCol) : -1;
  const labelsIdx = mapping.labelsCol ? headers.indexOf(mapping.labelsCol) : -1;
  const checklistIdx = mapping.checklistCol ? headers.indexOf(mapping.checklistCol) : -1;

  const foundListsMap: { [key: string]: number } = {};
  const defaultLists = ['To Do', 'In Progress', 'Done'];

  // Scan rows to discover distinct list names
  rows.forEach((row) => {
    const listVal = listIdx >= 0 && row[listIdx] ? row[listIdx].trim() : 'To Do';
    if (listVal && !foundListsMap[listVal]) {
      foundListsMap[listVal] = Object.keys(foundListsMap).length;
    }
  });

  // Ensure there are at least reasonable lists
  if (Object.keys(foundListsMap).length === 0) {
    defaultLists.forEach((l, i) => {
      foundListsMap[l] = i;
    });
  }

  const lists: ColumnList[] = Object.keys(foundListsMap).map((listName, idx) => ({
    id: `list-${idx + 1}-${listName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    title: listName,
    order: idx,
  }));

  const labelPalette = ['blue', 'green', 'amber', 'purple', 'rose', 'indigo', 'teal'];
  let labelColorIdx = 0;
  const labelCache: Record<string, CardLabel> = {};

  const getOrCreateLabel = (name: string): CardLabel => {
    const clean = name.trim();
    if (labelCache[clean]) return labelCache[clean];
    const colorKey = labelPalette[labelColorIdx % labelPalette.length];
    labelColorIdx++;
    const palette = PRESET_LABEL_COLORS[colorKey] || PRESET_LABEL_COLORS.blue;
    const label: CardLabel = {
      id: `lbl-${Math.random().toString(36).substring(2, 8)}`,
      name: clean,
      color: palette.color,
      bg: palette.bg,
      text: palette.text,
    };
    labelCache[clean] = label;
    return label;
  };

  const cards: CardItem[] = [];

  rows.forEach((row, rowIdx) => {
    const rawTitle = titleIdx >= 0 && row[titleIdx] ? row[titleIdx].trim() : `Task ${rowIdx + 1}`;
    if (!rawTitle) return; // Skip empty rows

    const rawListName = listIdx >= 0 && row[listIdx] ? row[listIdx].trim() : 'To Do';
    const matchedList = lists.find(
      (l) => l.title.toLowerCase() === rawListName.toLowerCase()
    ) || lists[0];

    const description = descIdx >= 0 && row[descIdx] ? row[descIdx].trim() : '';

    // Priority
    let priority: PriorityLevel = 'medium';
    if (priorityIdx >= 0 && row[priorityIdx]) {
      const pVal = row[priorityIdx].toLowerCase().trim();
      if (pVal.includes('urgent') || pVal.includes('crit') || pVal.includes('block') || pVal === 'p0') priority = 'urgent';
      else if (pVal.includes('high') || pVal === 'p1') priority = 'high';
      else if (pVal.includes('low') || pVal === 'p3') priority = 'low';
    }

    // Start Date & ETA / Due Date
    let startDate: string | undefined = undefined;
    if (startDateIdx >= 0 && row[startDateIdx]) {
      const rawDate = row[startDateIdx].trim();
      if (rawDate) {
        const parsed = new Date(rawDate);
        startDate = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : rawDate;
      }
    }

    let etaDate: string | undefined = undefined;
    if (etaDateIdx >= 0 && row[etaDateIdx]) {
      const rawDate = row[etaDateIdx].trim();
      if (rawDate) {
        const parsed = new Date(rawDate);
        etaDate = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : rawDate;
      }
    }

    // Fallback Due Date
    let dueDate: string | undefined = etaDate;
    if (!dueDate && dueDateIdx >= 0 && row[dueDateIdx]) {
      const rawDate = row[dueDateIdx].trim();
      if (rawDate) {
        const parsed = new Date(rawDate);
        dueDate = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : rawDate;
      }
    }
    if (!etaDate && dueDate) {
      etaDate = dueDate;
    }

    // Assignee
    const assignees: CardItem['assignees'] = [];
    if (assigneeIdx >= 0 && row[assigneeIdx]) {
      const rawAssignees = row[assigneeIdx].split(/[,;/]/).map((a) => a.trim()).filter(Boolean);
      rawAssignees.forEach((name, aIdx) => {
        assignees.push({
          id: `mem-${rowIdx}-${aIdx}`,
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        });
      });
    }

    // Labels
    const labels: CardLabel[] = [];
    if (labelsIdx >= 0 && row[labelsIdx]) {
      const rawLabels = row[labelsIdx].split(/[,;|]/).map((l) => l.trim()).filter(Boolean);
      rawLabels.forEach((l) => {
        labels.push(getOrCreateLabel(l));
      });
    }

    // Checklists
    const checklist: ChecklistItem[] = [];
    if (checklistIdx >= 0 && row[checklistIdx]) {
      const items = row[checklistIdx].split(/[\n,;]/).map((i) => i.trim()).filter(Boolean);
      items.forEach((itemText, iIdx) => {
        const isDone = itemText.startsWith('[x]') || itemText.startsWith('✓') || itemText.startsWith('(done)');
        const cleanText = itemText.replace(/^\[[ xX]\]|\✓|\(done\)/, '').trim();
        checklist.push({
          id: `chk-${rowIdx}-${iIdx}`,
          text: cleanText || itemText,
          completed: isDone,
        });
      });
    }

    // Creator
    let creator: CardItem['creator'] = undefined;
    if (creatorIdx >= 0 && row[creatorIdx] && row[creatorIdx].trim()) {
      const creatorName = row[creatorIdx].trim();
      creator = {
        id: `usr-creator-${rowIdx}`,
        name: creatorName,
        email: `${creatorName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creatorName)}`,
      };
    } else if (assignees.length > 0) {
      creator = assignees[0];
    } else {
      creator = {
        id: 'usr-1',
        name: 'Alex Rivera',
        email: 'alex@company.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      };
    }

    // Custom fields
    const customFields: Record<string, string> = {};
    headers.forEach((header, hIdx) => {
      if (
        header &&
        ![mapping.titleCol, mapping.listCol, mapping.descCol, mapping.priorityCol, mapping.dueDateCol, mapping.assigneeCol, mapping.creatorCol, mapping.labelsCol, mapping.checklistCol].includes(header)
      ) {
        customFields[header] = row[hIdx] || '';
      }
    });

    cards.push({
      id: `card-${rowIdx + 1}-${Math.random().toString(36).substring(2, 7)}`,
      title: rawTitle,
      description,
      listId: matchedList.id,
      order: cards.filter((c) => c.listId === matchedList.id).length,
      priority,
      startDate,
      etaDate: etaDate || dueDate,
      dueDate: etaDate || dueDate,
      completed: matchedList.title.toLowerCase().includes('done') || matchedList.title.toLowerCase().includes('complete'),
      labels,
      assignees,
      creator,
      checklist,
      comments: [],
      attachments: [],
      customFields,
      rowIndex: rowIdx + 2, // 1-based header is row 1
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return { lists, cards, mapping };
}

export function convertCardsToSpreadsheetRows(
  cards: CardItem[],
  lists: ColumnList[],
  headers: string[],
  mapping: ColumnMapping
): (string | number)[][] {
  const rows: (string | number)[][] = [headers];

  const titleIdx = headers.indexOf(mapping.titleCol);
  const listIdx = headers.indexOf(mapping.listCol);
  const descIdx = mapping.descCol ? headers.indexOf(mapping.descCol) : -1;
  const priorityIdx = mapping.priorityCol ? headers.indexOf(mapping.priorityCol) : -1;
  const dueDateIdx = mapping.dueDateCol ? headers.indexOf(mapping.dueDateCol) : -1;
  const assigneeIdx = mapping.assigneeCol ? headers.indexOf(mapping.assigneeCol) : -1;
  const creatorIdx = mapping.creatorCol ? headers.indexOf(mapping.creatorCol) : -1;
  const labelsIdx = mapping.labelsCol ? headers.indexOf(mapping.labelsCol) : -1;
  const checklistIdx = mapping.checklistCol ? headers.indexOf(mapping.checklistCol) : -1;

  cards.forEach((card) => {
    const list = lists.find((l) => l.id === card.listId);
    const row = new Array(headers.length).fill('');

    if (titleIdx >= 0) row[titleIdx] = card.title;
    if (listIdx >= 0) row[listIdx] = list ? list.title : 'To Do';
    if (descIdx >= 0) row[descIdx] = card.description || '';
    if (priorityIdx >= 0) row[priorityIdx] = card.priority.toUpperCase();
    if (dueDateIdx >= 0) row[dueDateIdx] = card.dueDate || '';
    if (assigneeIdx >= 0) row[assigneeIdx] = card.assignees.map((a) => a.name).join(', ');
    if (creatorIdx >= 0 && card.creator) row[creatorIdx] = card.creator.name;
    if (labelsIdx >= 0) row[labelsIdx] = card.labels.map((l) => l.name).join(', ');
    if (checklistIdx >= 0) {
      row[checklistIdx] = card.checklist
        .map((c) => `${c.completed ? '[x]' : '[ ]'} ${c.text}`)
        .join('\n');
    }

    // Custom fields
    Object.entries(card.customFields || {}).forEach(([key, val]) => {
      const idx = headers.indexOf(key);
      if (idx >= 0) {
        row[idx] = String(val ?? '');
      }
    });

    rows.push(row);
  });

  return rows;
}

export function parseCSVData(csvText: string): { headers: string[]; rows: string[][] } {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parsed.data.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = (parsed.data[0] || []).map((h) => String(h || '').trim());
  const rows = parsed.data.slice(1);
  return { headers, rows };
}

export function exportBoardToCSV(cards: CardItem[], lists: ColumnList[], headers: string[], mapping: ColumnMapping): string {
  const rows = convertCardsToSpreadsheetRows(cards, lists, headers, mapping);
  return Papa.unparse(rows);
}
