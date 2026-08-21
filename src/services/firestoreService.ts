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

// Circuit-breaker for Firestore quota exhaustion (e.g. Free Spark Plan daily write cap)
let isQuotaExceeded = false;
let quotaExceededResetTime = 0;

function checkQuotaExceeded(): boolean {
  if (isQuotaExceeded) {
    // Retry after 10 minutes
    if (Date.now() > quotaExceededResetTime) {
      isQuotaExceeded = false;
      return false;
    }
    return true;
  }
  return false;
}

function handleFirestoreError(context: string, error: any): void {
  const errMsg = error?.message || String(error);
  if (error?.code === 'resource-exhausted' || errMsg.includes('resource-exhausted') || errMsg.includes('Quota limit exceeded')) {
    if (!isQuotaExceeded) {
      console.warn(`Firestore write quota reached on free tier. Automatically switching to local & server storage for persistence.`);
    }
    isQuotaExceeded = true;
    quotaExceededResetTime = Date.now() + 10 * 60 * 1000; // 10 minutes
  } else {
    console.warn(`Firestore [${context}]:`, errMsg);
  }
}

/**
 * Save / Update a full Board in Firestore
 */
export async function saveBoardToFirestore(board: Board, orgId?: string): Promise<boolean> {
  if (checkQuotaExceeded()) {
    return false;
  }

  try {
    const cleanedBoard = JSON.parse(JSON.stringify(board));
    
    // If an orgId is provided, save directly to the workspace doc (1 single write instead of 2)
    if (orgId) {
      const wsRef = doc(db, 'workspaces', orgId.toUpperCase());
      await setDoc(wsRef, {
        board: cleanedBoard,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return true;
    }

    const cleanBoardId = board.id || 'default_board';
    const docRef = doc(db, 'boards', cleanBoardId);
    
    await setDoc(docRef, {
      ...cleanedBoard,
      orgId: null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return true;
  } catch (error: any) {
    handleFirestoreError('saveBoard', error);
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
    handleFirestoreError(`fetchBoard(${boardId})`, error);
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
  try {
    const docRef = doc(db, 'boards', boardId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as Board);
        }
      },
      (err) => {
        handleFirestoreError(`subscribeBoard(${boardId})`, err);
        if (onError) onError(err);
      }
    );
  } catch (e: any) {
    handleFirestoreError(`subscribeBoardInit(${boardId})`, e);
    return () => {};
  }
}

/**
 * Save Workspace (Board, Members, Messages) to Firestore
 */
export async function saveWorkspaceToFirestore(
  orgId: string,
  data: Partial<FirestoreWorkspaceData>
): Promise<boolean> {
  if (checkQuotaExceeded()) {
    return false;
  }

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
  } catch (error: any) {
    handleFirestoreError(`saveWorkspace(${orgId})`, error);
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
    handleFirestoreError(`fetchWorkspace(${orgId})`, error);
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
  try {
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
        handleFirestoreError(`subscribeWorkspace(${cleanId})`, err);
        if (onError) onError(err);
      }
    );
  } catch (e: any) {
    handleFirestoreError(`subscribeWorkspaceInit(${orgId})`, e);
    return () => {};
  }
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
  if (checkQuotaExceeded()) {
    return [];
  }

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
  } catch (error: any) {
    handleFirestoreError('listWorkspaces', error);
    return [];
  }
}

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfileToFirestore(user: UserProfile): Promise<void> {
  if (!user.uid || checkQuotaExceeded()) return;
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
  } catch (error: any) {
    handleFirestoreError('syncUserProfile', error);
  }
}
