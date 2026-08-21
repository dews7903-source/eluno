import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Board, OrgMember, OrgMessage, UserProfile } from '../types';

export interface FirestoreWorkspaceData {
  orgId: string;
  orgName: string;
  board: Board | null;
  members: OrgMember[];
  messages: OrgMessage[];
  updatedAt: string;
}

/**
 * Save / Update a full Board in Firestore
 */
export async function saveBoardToFirestore(board: Board, orgId?: string): Promise<boolean> {
  try {
    const cleanBoardId = board.id || 'default_board';
    const docRef = doc(db, 'boards', cleanBoardId);
    
    // Clean undefined values before storing
    const cleanedBoard = JSON.parse(JSON.stringify(board));
    
    await setDoc(docRef, {
      ...cleanedBoard,
      orgId: orgId || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Also update associated workspace if orgId provided
    if (orgId) {
      const wsRef = doc(db, 'workspaces', orgId.toUpperCase());
      await setDoc(wsRef, {
        board: cleanedBoard,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return true;
  } catch (error) {
    console.error('Firestore: Error saving board:', error);
    return false;
  }
}

/**
 * Fetch a Board by ID from Firestore
 */
export async function fetchBoardFromFirestore(boardId: string): Promise<Board | null> {
  try {
    const docRef = doc(db, 'boards', boardId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Board;
    }
  } catch (error: any) {
    console.warn(`Firestore: Note when fetching board ${boardId} (will use local cache if offline):`, error?.message || error);
  }
  return null;
}

/**
 * Real-time listener for Board changes in Firestore
 */
export function subscribeToBoardFromFirestore(
  boardId: string,
  onUpdate: (board: Board) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = doc(db, 'boards', boardId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as Board);
      }
    },
    (err) => {
      console.warn(`Firestore: Subscription error for board ${boardId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save Workspace (Board, Members, Messages) to Firestore
 */
export async function saveWorkspaceToFirestore(
  orgId: string,
  data: Partial<FirestoreWorkspaceData>
): Promise<boolean> {
  try {
    const cleanId = orgId.trim().toUpperCase();
    const docRef = doc(db, 'workspaces', cleanId);
    
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(
      docRef,
      {
        ...cleanData,
        orgId: cleanId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error(`Firestore: Error saving workspace ${orgId}:`, error);
    return false;
  }
}

/**
 * Fetch a Workspace from Firestore
 */
export async function fetchWorkspaceFromFirestore(orgId: string): Promise<FirestoreWorkspaceData | null> {
  try {
    const cleanId = orgId.trim().toUpperCase();
    const docRef = doc(db, 'workspaces', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirestoreWorkspaceData;
    }
  } catch (error: any) {
    console.warn(`Firestore: Note when fetching workspace ${orgId} (falling back to local):`, error?.message || error);
  }
  return null;
}

/**
 * Real-time listener for Workspace changes (Board, Members, Messages)
 */
export function subscribeToWorkspaceFromFirestore(
  orgId: string,
  onUpdate: (workspace: FirestoreWorkspaceData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const cleanId = orgId.trim().toUpperCase();
  const docRef = doc(db, 'workspaces', cleanId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as FirestoreWorkspaceData);
      }
    },
    (err) => {
      console.warn(`Firestore: Subscription error for workspace ${cleanId}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * List all available online Workspaces from Firestore
 */
export async function listWorkspacesFromFirestore(): Promise<Array<{
  orgId: string;
  orgName: string;
  memberCount: number;
  onlineCount: number;
  updatedAt: string;
  hasBoard: boolean;
}>> {
  try {
    const colRef = collection(db, 'workspaces');
    const snap = await getDocs(colRef);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as FirestoreWorkspaceData;
      const members = data.members || [];
      const onlineMembers = members.filter((m) => m.status === 'online');
      return {
        orgId: data.orgId || docSnap.id,
        orgName: data.orgName || `${docSnap.id} Workspace`,
        memberCount: members.length,
        onlineCount: onlineMembers.length,
        updatedAt: data.updatedAt || new Date().toISOString(),
        hasBoard: Boolean(data.board && data.board.cards && data.board.cards.length > 0),
      };
    });
  } catch (error) {
    console.error('Firestore: Error listing workspaces:', error);
    return [];
  }
}

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfileToFirestore(user: UserProfile): Promise<void> {
  if (!user.uid) return;
  try {
    const docRef = doc(db, 'users', user.uid);
    await setDoc(
      docRef,
      {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lastActiveAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Firestore: User profile sync error:', error);
  }
}
