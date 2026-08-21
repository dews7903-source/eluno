export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export type CardStatus = 'pending' | 'in_process' | 'in_review' | 'hold' | 'backlog' | 'done';

export interface CardLabel {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex
  bg: string;
  text: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface CardComment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorEmail?: string;
  text: string;
  createdAt: string;
}

export interface CardAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'link' | 'file' | string;
  size?: string;
  mimeType?: string;
  driveFileId?: string;
  driveFolderId?: string;
  driveFileUrl?: string;
  uploadedAt?: string;
  uploadStatus?: 'uploading' | 'success' | 'error';
  uploadProgress?: number;
  uploadError?: string;
  createdAt: string;
}

export interface CardMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface CardItem {
  id: string;
  title: string; // Campaign Name / Task Title
  description: string;
  listId: string;
  order: number;
  priority: PriorityLevel;
  startDate?: string; // YYYY-MM-DD (Campaign Start Date)
  etaDate?: string; // YYYY-MM-DD (Target ETA / Delivery Date)
  dueDate?: string; // YYYY-MM-DD (Fallback compatibility)
  completed?: boolean;
  status?: CardStatus;
  // Google Drive Folder Connection per card
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderUrl?: string;
  labels: CardLabel[];
  assignees: CardMember[];
  creator?: CardMember;
  checklist: ChecklistItem[];
  comments: CardComment[];
  attachments: CardAttachment[];
  coverColor?: string;
  coverImage?: string;
  customFields: Record<string, string | number | boolean>;
  rowIndex?: number; // Row index in original spreadsheet (1-based or 0-based)
  createdAt: string;
  updatedAt: string;
}

export interface ColumnList {
  id: string;
  title: string;
  order: number;
  color?: string;
  wipLimit?: number;
}

export interface ColumnMapping {
  titleCol: string;
  listCol: string;
  descCol?: string;
  priorityCol?: string;
  startDateCol?: string;
  etaDateCol?: string;
  dueDateCol?: string;
  assigneeCol?: string;
  creatorCol?: string;
  labelsCol?: string;
  checklistCol?: string;
  customCols?: string[];
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  spreadsheetId?: string;
  spreadsheetGid?: string;
  spreadsheetUrl?: string;
  sheetTabName?: string;
  availableTabs?: string[];
  lists: ColumnList[];
  cards: CardItem[];
  columnMapping: ColumnMapping;
  headers: string[];
  lastSyncedAt?: string;
  autoSync?: boolean;
  theme: BoardTheme;
  isCustomTheme?: boolean;
}

export interface BoardTheme {
  id: string;
  name: string;
  gradient: string;
  cardBg: string;
  headerBg: string;
  isDark: boolean;
  wallpaperUrl?: string;
  wallpaperOpacity?: number;
  wallpaperBlur?: number;
  wallpaperFit?: 'cover' | 'contain' | 'repeat';
}

export interface FilterState {
  searchQuery: string;
  titleQuery: string;
  selectedLists: string[];
  selectedLabels: string[];
  selectedPriorities: PriorityLevel[];
  selectedAssignees: string[];
  dueFilter: 'all' | 'overdue' | 'dueToday' | 'dueThisWeek' | 'noDueDate';
  onlyAssignedToMe: boolean;
}

export type ActiveView = 'kanban' | 'spreadsheet' | 'calendar' | 'analytics';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface EmployeeAuth {
  isLoggedIn: boolean;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  orgId: string;
  orgName: string;
  department: string;
  role: string;
  avatar: string;
  loginTime: string;
}

export interface UserOrgProfile {
  orgId: string;
  orgName: string;
  userId: string;
  userName: string;
  userRole: string;
  userDept: string;
  userEmail: string;
  userAvatar: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  email?: string;
  joinedAt?: string;
}

export interface OrgCampaignRef {
  id: string;
  title: string;
  priority: PriorityLevel;
  startDate?: string;
  etaDate?: string;
  listTitle?: string;
}

export interface OrgMessageReaction {
  emoji: string;
  count: number;
  users: string[]; // member names
}

export interface OrgMessage {
  id: string;
  orgId: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  senderDept?: string;
  content: string;
  createdAt: string;
  pinned?: boolean;
  campaignRef?: OrgCampaignRef;
  reactions?: OrgMessageReaction[];
  isAnnouncement?: boolean;
}

export interface OrgChannel {
  id: string;
  name: string;
  topic?: string;
  type: 'channel' | 'direct' | 'announcement';
  unreadCount?: number;
  memberCount?: number;
  avatar?: string;
  status?: 'online' | 'busy' | 'away' | 'offline';
  department?: string;
}
