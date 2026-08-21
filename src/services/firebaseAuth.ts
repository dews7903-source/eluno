import {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from './firebaseConfig';
import { UserProfile } from '../types';
import { saveLocalStoredUser, saveGoogleOAuthToken } from './localAuthPlugin';
import { syncUserProfileToFirestore } from './firestoreService';

export * from './localAuthPlugin';

/**
 * Convert Firebase User to UserProfile
 */
export function formatFirebaseUser(user: FirebaseUser): UserProfile {
  return {
    uid: user.uid,
    displayName: user.displayName || (user.isAnonymous ? 'Guest User' : 'Team Member'),
    email: user.email,
    photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.uid)}`,
  };
}

/**
 * Firebase Google Sign-In with Popup
 */
export async function firebaseGoogleSignIn(): Promise<{ user: UserProfile; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const user = formatFirebaseUser(result.user);
    const token = await result.user.getIdToken();

    // If OAuth credential contains Google Access Token for Sheets
    const credential = (result as any)._tokenResponse?.oauthAccessToken;
    if (credential) {
      saveGoogleOAuthToken(credential, 3599);
    }

    saveLocalStoredUser(user, token);
    await syncUserProfileToFirestore(user);
    return { user, accessToken: token };
  } catch (error: any) {
    console.error('Firebase Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Firebase Anonymous / Guest Sign-In
 */
export async function firebaseAnonymousSignIn(): Promise<{ user: UserProfile; accessToken: string }> {
  try {
    const result = await signInAnonymously(auth);
    const user = formatFirebaseUser(result.user);
    const token = await result.user.getIdToken();

    saveLocalStoredUser(user, token);
    await syncUserProfileToFirestore(user);
    return { user, accessToken: token };
  } catch (error: any) {
    console.error('Firebase Anonymous Sign-In Error:', error);
    throw error;
  }
}

/**
 * Firebase Sign Out
 */
export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(auth);
    saveLocalStoredUser(null);
  } catch (error) {
    console.error('Firebase Sign Out Error:', error);
  }
}

/**
 * Initialize Firebase Auth listener
 */
export function initFirebaseAuthListener(
  onSuccess: (user: UserProfile, token: string) => void,
  onSignedOut?: () => void
) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = formatFirebaseUser(firebaseUser);
      const token = await firebaseUser.getIdToken();
      saveLocalStoredUser(user, token);
      syncUserProfileToFirestore(user);
      onSuccess(user, token);
    } else {
      if (onSignedOut) onSignedOut();
    }
  });
}
