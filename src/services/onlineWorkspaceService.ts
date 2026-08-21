import { Board, OrgMember, OrgMessage, UserOrgProfile, UserProfile } from '../types';
import { saveUserOrgProfile, saveConnectedOrgMembers, saveOrgMessages } from './orgMessageService';
import {
  saveWorkspaceToFirestore,
  fetchWorkspaceFromFirestore,
  subscribeToWorkspaceFromFirestore,
  listWorkspacesFromFirestore,
  saveBoardToFirestore,
  FirestoreWorkspaceData,
} from './firestoreService';

export interface OnlineWorkspaceInfo {
  orgId: string;
  orgName: string;
  memberCount: number;
  onlineCount: number;
  updatedAt: string;
  hasBoard: boolean;
}

export interface OnlineWorkspaceFull {
  orgId: string;
  orgName: string;
  board: Board | null;
  members: OrgMember[];
  messages: OrgMessage[];
  updatedAt: string;
}

/**
 * Extract Org ID from browser URL query parameter (?org=...)
 */
export function getWorkspaceFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org') || params.get('workspace') || params.get('board');
    if (org && org.trim()) {
      return org.trim().toUpperCase();
    }
  } catch (e) {
    // Ignore in non-browser context
  }
  return null;
}

/**
 * Update URL with current Org ID without reloading page
 */
export function setWorkspaceToUrl(orgId: string): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('org', orgId.trim().toUpperCase());
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    // Ignore
  }
}

/**
 * Generate shareable URL with Org ID parameter
 */
export function generateShareableWorkspaceUrl(orgId: string): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('org', orgId.trim().toUpperCase());
    return url.toString();
  } catch (e) {
    return window.location.href;
  }
}

/**
 * List all available online workspaces from Firebase Firestore (with fallback to server API)
 */
export async function listOnlineWorkspaces(): Promise<OnlineWorkspaceInfo[]> {
  try {
    const firestoreList = await listWorkspacesFromFirestore();
    if (firestoreList && firestoreList.length > 0) {
      return firestoreList;
    }
  } catch (err) {
    console.warn('Firestore workspace list error, trying local server fallback:', err);
  }

  try {
    const res = await fetch('/api/workspaces');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch online workspaces list:', err);
  }
  return [];
}

/**
 * Fetch a specific online workspace by Org ID from Firestore (with fallback)
 */
export async function fetchOnlineWorkspace(orgId: string): Promise<OnlineWorkspaceFull | null> {
  const cleanId = orgId.trim().toUpperCase();
  try {
    const firestoreData = await fetchWorkspaceFromFirestore(cleanId);
    if (firestoreData) {
      return firestoreData;
    }
  } catch (err) {
    console.warn(`Firestore: Error fetching workspace ${cleanId}:`, err);
  }

  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data: OnlineWorkspaceFull = await res.json();
      return data;
    }
  } catch (err) {
    console.warn(`Could not fetch online workspace ${cleanId}:`, err);
  }
  return null;
}

/**
 * Check-in / Log in to an online workspace and sync to Firestore
 */
export async function loginOnlineWorkspace(
  orgId: string,
  user: {
    displayName: string;
    email: string;
    role?: string;
    department?: string;
    orgName?: string;
  }
): Promise<{ success: boolean; user: UserProfile; workspace: OnlineWorkspaceFull }> {
  const cleanId = orgId.trim().toUpperCase();
  const userId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.displayName || cleanId)}`;

  const member: OrgMember = {
    id: userId,
    orgId: cleanId,
    name: user.displayName || 'Team Member',
    role: user.role || 'Marketing Specialist',
    department: user.department || 'Growth & Operations',
    avatar,
    status: 'online',
    email: user.email,
    joinedAt: new Date().toISOString(),
  };

  // Check if workspace already exists in Firestore
  let existingWs = await fetchWorkspaceFromFirestore(cleanId);
  let members = existingWs?.members || [];
  
  // Update or append member
  const memberIdx = members.findIndex((m) => m.email === user.email || m.name === user.displayName);
  if (memberIdx >= 0) {
    members[memberIdx] = { ...members[memberIdx], status: 'online', role: member.role, department: member.department };
  } else {
    members.push(member);
  }

  const workspaceData: FirestoreWorkspaceData = {
    orgId: cleanId,
    orgName: user.orgName || existingWs?.orgName || `${cleanId} Workspace`,
    board: existingWs?.board || null,
    members,
    messages: existingWs?.messages || [],
    updatedAt: new Date().toISOString(),
  };

  // Save to Firestore
  await saveWorkspaceToFirestore(cleanId, workspaceData);

  const userProfile: UserProfile = {
    uid: userId,
    displayName: user.displayName,
    email: user.email,
    photoURL: avatar,
  };

  const orgProfile: UserOrgProfile = {
    orgId: cleanId,
    orgName: workspaceData.orgName,
    userId,
    userName: user.displayName,
    userRole: member.role,
    userDept: member.department,
    userEmail: user.email,
    userAvatar: avatar,
  };

  saveUserOrgProfile(orgProfile);
  if (workspaceData.members) saveConnectedOrgMembers(cleanId, workspaceData.members);
  if (workspaceData.messages) saveOrgMessages(cleanId, workspaceData.messages);
  setWorkspaceToUrl(cleanId);

  // Also notify server backend if online
  try {
    await fetch(`/api/workspaces/${encodeURIComponent(cleanId)}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: workspaceData.orgName,
        user: {
          uid: userId,
          displayName: user.displayName,
          email: user.email,
          role: member.role,
          department: member.department,
          photoURL: avatar,
        },
      }),
    });
  } catch (_) {}

  return {
    success: true,
    user: userProfile,
    workspace: workspaceData,
  };
}

/**
 * Broadcast & Sync Board Data to Firestore Online Workspace
 */
export async function syncBoardToOnlineWorkspace(
  orgId: string,
  board: Board,
  user?: UserProfile | null
): Promise<boolean> {
  const cleanId = orgId.trim().toUpperCase();
  try {
    // 1. Direct Firestore real-time sync
    const firestoreOk = await saveBoardToFirestore(board, cleanId);

    // 2. Also push to server proxy
    fetch(`/api/workspaces/${encodeURIComponent(cleanId)}/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board, user }),
    }).catch(() => {});

    return firestoreOk;
  } catch (err) {
    console.warn('Failed to sync board to Firestore:', err);
    return false;
  }
}
