import { OrgChannel, OrgMember, OrgMessage, UserOrgProfile } from '../types';

const STORAGE_USER_ORG_KEY = 'sheetboard_user_org_profile_v2';
const STORAGE_ORG_MEMBERS_PREFIX = 'sheetboard_org_members_v2_';
const STORAGE_ORG_MESSAGES_PREFIX = 'sheetboard_org_messages_v2_';
const STORAGE_ORG_CHANNELS_PREFIX = 'sheetboard_org_channels_v2_';

export const DEFAULT_USER_ORG_PROFILE: UserOrgProfile = {
  orgId: 'ORG-MARKETING-9021',
  orgName: 'Global Marketing & Operations',
  userId: 'usr-primary-lead',
  userName: 'Alex Rivera',
  userRole: 'Campaign Operations Lead',
  userDept: 'Marketing & Strategy',
  userEmail: 'alex.rivera@organization.internal',
  userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexRivera',
};

// Initial connected team members for the default Org ID
export const DEFAULT_CONNECTED_MEMBERS: Record<string, OrgMember[]> = {
  'ORG-MARKETING-9021': [
    {
      id: 'member-alex',
      orgId: 'ORG-MARKETING-9021',
      name: 'Alex Rivera',
      role: 'Campaign Operations Lead',
      department: 'Marketing & Strategy',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexRivera',
      status: 'online',
      email: 'alex.rivera@organization.internal',
      joinedAt: '2026-01-15',
    },
    {
      id: 'member-sarah',
      orgId: 'ORG-MARKETING-9021',
      name: 'Sarah Jenkins',
      role: 'Creative & Brand Director',
      department: 'Brand Design',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahJenkins',
      status: 'online',
      email: 'sarah.jenkins@organization.internal',
      joinedAt: '2026-02-01',
    },
    {
      id: 'member-david',
      orgId: 'ORG-MARKETING-9021',
      name: 'David Chen',
      role: 'Principal Data Analyst',
      department: 'Business Intelligence',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidChen',
      status: 'busy',
      email: 'david.chen@organization.internal',
      joinedAt: '2026-02-10',
    },
    {
      id: 'member-elena',
      orgId: 'ORG-MARKETING-9021',
      name: 'Elena Rostova',
      role: 'Growth & Media Strategist',
      department: 'User Acquisition',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaRostova',
      status: 'online',
      email: 'elena.rostova@organization.internal',
      joinedAt: '2026-03-05',
    },
  ],
};

export const DEFAULT_ORG_CHANNELS: OrgChannel[] = [
  {
    id: 'channel-announcements',
    name: 'org-announcements',
    topic: 'Official organization updates, executive notices, and company quarterly goals.',
    type: 'announcement',
    unreadCount: 0,
    memberCount: 24,
    department: 'All Organization',
  },
  {
    id: 'channel-milestones',
    name: 'campaign-milestones',
    topic: 'Cross-functional sprint status, delivery approvals, and Start/ETA date tracking.',
    type: 'channel',
    unreadCount: 0,
    memberCount: 18,
    department: 'Campaign Teams',
  },
  {
    id: 'channel-growth',
    name: 'growth-media',
    topic: 'User acquisition experiments, paid media launches, and performance analytics.',
    type: 'channel',
    unreadCount: 0,
    memberCount: 12,
    department: 'Marketing & Ops',
  },
  {
    id: 'channel-creative',
    name: 'brand-creative',
    topic: 'Design sprint assets, motion graphics reviews, and copy approvals.',
    type: 'channel',
    unreadCount: 0,
    memberCount: 9,
    department: 'Design & UX',
  },
  {
    id: 'channel-watercooler',
    name: 'watercooler',
    topic: 'Informal team discussions, welcome messages, and campaign launch wins 🎉',
    type: 'channel',
    unreadCount: 0,
    memberCount: 24,
    department: 'Social',
  },
];

// --- USER ORG PROFILE ---

export function getUserOrgProfile(): UserOrgProfile {
  try {
    const saved = localStorage.getItem(STORAGE_USER_ORG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading user org profile:', err);
  }
  return DEFAULT_USER_ORG_PROFILE;
}

export function saveUserOrgProfile(profile: UserOrgProfile): void {
  try {
    localStorage.setItem(STORAGE_USER_ORG_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving user org profile:', err);
  }
}

// --- ORG MEMBERS CONNECTED BY ORG ID ---

export function getConnectedOrgMembers(orgId: string): OrgMember[] {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const key = `${STORAGE_ORG_MEMBERS_PREFIX}${normalizedOrgId}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading connected org members:', err);
  }

  // Check if default exists for this org
  if (DEFAULT_CONNECTED_MEMBERS[normalizedOrgId]) {
    return DEFAULT_CONNECTED_MEMBERS[normalizedOrgId];
  }

  // If user created a custom Org ID, create a default self member
  const currentProfile = getUserOrgProfile();
  return [
    {
      id: `member-${Date.now()}`,
      orgId: normalizedOrgId,
      name: currentProfile.userName || 'Org Admin',
      role: currentProfile.userRole || 'Team Lead',
      department: currentProfile.userDept || 'General',
      avatar:
        currentProfile.userAvatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          currentProfile.userName || 'Admin'
        )}`,
      status: 'online',
      email: currentProfile.userEmail || 'admin@organization.internal',
      joinedAt: new Date().toISOString().split('T')[0],
    },
  ];
}

export function saveConnectedOrgMembers(orgId: string, members: OrgMember[]): void {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const key = `${STORAGE_ORG_MEMBERS_PREFIX}${normalizedOrgId}`;
  try {
    localStorage.setItem(key, JSON.stringify(members));
  } catch (err) {
    console.error('Error saving connected org members:', err);
  }
}

export function addOrgMember(
  orgId: string,
  memberData: Omit<OrgMember, 'id' | 'orgId' | 'joinedAt'>
): OrgMember {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const currentMembers = getConnectedOrgMembers(normalizedOrgId);

  const newMember: OrgMember = {
    ...memberData,
    id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    orgId: normalizedOrgId,
    joinedAt: new Date().toISOString().split('T')[0],
  };

  const updated = [...currentMembers, newMember];
  saveConnectedOrgMembers(normalizedOrgId, updated);
  return newMember;
}

export function removeOrgMember(orgId: string, memberId: string): void {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const currentMembers = getConnectedOrgMembers(normalizedOrgId);
  const updated = currentMembers.filter((m) => m.id !== memberId);
  saveConnectedOrgMembers(normalizedOrgId, updated);
}

// --- ORG MESSAGES (NO DEMO CHAT, SCOPED BY ORG ID) ---

export function getStoredOrgMessages(orgId: string): OrgMessage[] {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const key = `${STORAGE_ORG_MESSAGES_PREFIX}${normalizedOrgId}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading org messages:', err);
  }
  // Return empty list so there is no hardcoded demo chat!
  return [];
}

export function saveOrgMessages(orgId: string, messages: OrgMessage[]): void {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const key = `${STORAGE_ORG_MESSAGES_PREFIX}${normalizedOrgId}`;
  try {
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (err) {
    console.error('Error saving org messages:', err);
  }
}

// --- ORG CHANNELS ---

export function getStoredOrgChannels(orgId: string): OrgChannel[] {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const key = `${STORAGE_ORG_CHANNELS_PREFIX}${normalizedOrgId}`;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Error loading org channels:', err);
  }
  return DEFAULT_ORG_CHANNELS;
}

export function saveOrgChannels(orgId: string, channels: OrgChannel[]): void {
  const normalizedOrgId = orgId.trim().toUpperCase() || 'DEFAULT-ORG';
  const key = `${STORAGE_ORG_CHANNELS_PREFIX}${normalizedOrgId}`;
  try {
    localStorage.setItem(key, JSON.stringify(channels));
  } catch (err) {
    console.error('Error saving org channels:', err);
  }
}
