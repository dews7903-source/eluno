import { CardAttachment } from '../types';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

const DRIVE_TOKEN_STORAGE_KEY = 'sheetboard_google_drive_token';
const DRIVE_USER_STORAGE_KEY = 'sheetboard_google_drive_user';

export interface GoogleDriveUser {
  email?: string;
  name?: string;
  picture?: string;
  connectedAt: string;
}

export interface DriveFolderItem {
  id: string;
  name: string;
  webViewLink?: string;
  mimeType: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  webViewLink: string;
  thumbnailLink?: string;
  size?: string;
  mimeType: string;
}

/**
 * Retrieve saved Google Drive access token from local storage
 */
export function getSavedDriveToken(): string | null {
  try {
    const item = localStorage.getItem(DRIVE_TOKEN_STORAGE_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item);
    // Check if token expired (with 1 minute safety buffer)
    if (parsed.expiresAt && Date.now() > parsed.expiresAt - 60000) {
      localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
      return null;
    }
    return parsed.token || null;
  } catch (e) {
    return null;
  }
}

/**
 * Save Google Drive access token with expiration
 */
export function saveDriveToken(token: string, expiresInSeconds: number = 3599): void {
  try {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(
      DRIVE_TOKEN_STORAGE_KEY,
      JSON.stringify({ token, expiresAt, savedAt: new Date().toISOString() })
    );
  } catch (e) {
    console.error('Failed to save drive token:', e);
  }
}

/**
 * Retrieve saved Drive User Profile
 */
export function getSavedDriveUser(): GoogleDriveUser | null {
  try {
    const item = localStorage.getItem(DRIVE_USER_STORAGE_KEY);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Save Drive User Profile
 */
export function saveDriveUser(user: GoogleDriveUser): void {
  try {
    localStorage.setItem(DRIVE_USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save drive user:', e);
  }
}

/**
 * Clear Drive Connection
 */
export function disconnectDrive(): void {
  localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
  localStorage.removeItem(DRIVE_USER_STORAGE_KEY);
}

/**
 * Check if user is currently connected to Google Drive
 */
export function isDriveConnected(): boolean {
  return !!getSavedDriveToken();
}

/**
 * Request Google Drive OAuth Token using Google Identity Services (GSI)
 */
export async function requestGoogleDriveToken(): Promise<{ token: string; user?: GoogleDriveUser }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available'));
    }

    if (!window.google?.accounts?.oauth2) {
      // If script is still loading, wait a moment and retry
      let retries = 0;
      const interval = setInterval(() => {
        retries++;
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          initiateClient();
        } else if (retries > 30) {
          clearInterval(interval);
          reject(new Error('Google Identity Services SDK failed to load. Please check your network connection.'));
        }
      }, 100);
      return;
    }

    initiateClient();

    function initiateClient() {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: '402022149307-ehm8eghd8b67p14k2e2hghdqu92mkmkm.apps.googleusercontent.com', // Will work with prompt or generic client
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error) {
              return reject(new Error(response.error_description || response.error));
            }
            if (response.access_token) {
              const token = response.access_token;
              const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) : 3599;
              saveDriveToken(token, expiresIn);

              // Fetch User profile
              let userInfo: GoogleDriveUser = {
                connectedAt: new Date().toISOString(),
              };
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (userRes.ok) {
                  const data = await userRes.json();
                  userInfo = {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                    connectedAt: new Date().toISOString(),
                  };
                  saveDriveUser(userInfo);
                }
              } catch (err) {
                console.warn('Could not fetch user profile details:', err);
              }

              resolve({ token, user: userInfo });
            } else {
              reject(new Error('No access token received from Google'));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err.message || 'Google Sign-In popup was closed or blocked'));
          },
        });

        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        reject(err);
      }
    }
  });
}

/**
 * List folders in Google Drive
 */
export async function listDriveFolders(token?: string | null): Promise<DriveFolderItem[]> {
  const activeToken = token || getSavedDriveToken();
  if (!activeToken) {
    throw new Error('Google Drive is not connected. Please connect your Google account.');
  }

  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,mimeType)&pageSize=50&orderBy=name`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${activeToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      disconnectDrive();
      throw new Error('Google Drive session expired. Please reconnect Google Drive.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to fetch folders (HTTP ${response.status})`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
    mimeType: f.mimeType,
  }));
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string,
  token?: string | null
): Promise<DriveFolderItem> {
  const activeToken = token || getSavedDriveToken();
  if (!activeToken) {
    throw new Error('Google Drive is not connected.');
  }

  const metadata: any = {
    name: folderName.trim(),
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,mimeType', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    if (response.status === 401) {
      disconnectDrive();
      throw new Error('Google Drive session expired. Please reconnect.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to create Google Drive folder');
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
    mimeType: data.mimeType,
  };
}

/**
 * Fetch folder metadata by ID
 */
export async function getDriveFolderInfo(
  folderId: string,
  token?: string | null
): Promise<DriveFolderItem | null> {
  const activeToken = token || getSavedDriveToken();
  if (!activeToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,webViewLink,mimeType,trashed`,
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.trashed) return null;
      return {
        id: data.id,
        name: data.name,
        webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
        mimeType: data.mimeType,
      };
    }
  } catch (err) {
    console.warn('Failed to get folder info:', err);
  }
  return null;
}

/**
 * Upload a File directly to a specific Google Drive Folder using multipart upload
 */
export async function uploadFileToDriveFolder(
  file: File,
  folderId: string,
  onProgress?: (progress: number) => void,
  token?: string | null
): Promise<DriveUploadResult> {
  const activeToken = token || getSavedDriveToken();
  if (!activeToken) {
    throw new Error('Google Drive is not connected. Please connect Google Drive first.');
  }

  if (!folderId) {
    throw new Error('No Google Drive folder assigned to this card. Please select or create a folder in Card Settings.');
  }

  // Metadata for the file with explicit parents array pointing to card's folderId
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Read file as ArrayBuffer
  const fileData = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileData);

  const metadataContentType = 'application/json; charset=UTF-8';
  const fileContentType = file.type || 'application/octet-stream';

  // Build multipart body
  const encoder = new TextEncoder();
  const part1 = encoder.encode(
    delimiter +
    `Content-Type: ${metadataContentType}\r\n\r\n` +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${fileContentType}\r\n\r\n`
  );
  const part3 = encoder.encode(closeDelimiter);

  // Combine Uint8Arrays
  const combined = new Uint8Array(part1.length + fileBytes.length + part3.length);
  combined.set(part1, 0);
  combined.set(fileBytes, part1.length);
  combined.set(part3, part1.length + fileBytes.length);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink,size,mimeType');
    xhr.setRequestHeader('Authorization', `Bearer ${activeToken}`);
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({
            fileId: res.id,
            fileName: res.name || file.name,
            fileUrl: res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`,
            webViewLink: res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`,
            thumbnailLink: res.thumbnailLink,
            size: res.size ? `${(parseInt(res.size, 10) / (1024 * 1024)).toFixed(2)} MB` : undefined,
            mimeType: res.mimeType || file.type,
          });
        } catch (e) {
          reject(new Error('Failed to parse Google Drive upload response.'));
        }
      } else if (xhr.status === 401) {
        disconnectDrive();
        reject(new Error('Google Drive session expired. Please reconnect your account and retry.'));
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error?.message || `Upload failed with HTTP ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Upload failed with HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during Google Drive file upload.'));
    };

    xhr.send(combined);
  });
}
