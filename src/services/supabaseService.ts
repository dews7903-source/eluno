import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const SUPABASE_STORAGE_URL_KEY = 'sheetboard_supabase_custom_url';
const SUPABASE_STORAGE_KEY_KEY = 'sheetboard_supabase_custom_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isCustom: boolean;
  isConnected: boolean;
}

let supabaseClient: SupabaseClient | null = null;

export function getStoredSupabaseConfig(): SupabaseConfig {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(SUPABASE_STORAGE_URL_KEY) || envUrl;
  const storedKey = localStorage.getItem(SUPABASE_STORAGE_KEY_KEY) || envKey;

  const isCustom = Boolean(localStorage.getItem(SUPABASE_STORAGE_URL_KEY));
  const isConnected = Boolean(storedUrl && storedKey && storedUrl.includes('supabase.co'));

  return {
    url: storedUrl,
    anonKey: storedKey,
    isCustom,
    isConnected,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (url && anonKey) {
    localStorage.setItem(SUPABASE_STORAGE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_STORAGE_KEY_KEY, anonKey.trim());
    supabaseClient = null; // reset client
  } else {
    localStorage.removeItem(SUPABASE_STORAGE_URL_KEY);
    localStorage.removeItem(SUPABASE_STORAGE_KEY_KEY);
    supabaseClient = null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const config = getStoredSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      supabaseClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return supabaseClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return null;
}

/**
 * Sync user profile with Supabase Auth or database
 */
export async function syncUserWithSupabase(user: UserProfile, password?: string): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client not configured (operating in free local offline mode)' };
  }

  try {
    // If password provided, attempt Supabase Auth sign-in or sign-up
    if (password && user.email) {
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // Try sign-up if doesn't exist
        const { data: signUpData, error: signUpError } = await client.auth.signUp({
          email: user.email,
          password: password,
          options: {
            data: {
              display_name: user.displayName,
              avatar_url: user.photoURL,
            },
          },
        });

        if (signUpError) {
          return { success: false, message: signUpError.message };
        }
        return { success: true, message: 'Signed up to Supabase Auth' };
      }

      if (signInError) {
        return { success: false, message: signInError.message };
      }

      return { success: true, message: 'Authenticated with Supabase' };
    }

    // Otherwise record local user session in Supabase profile metadata
    const { data: session } = await client.auth.getSession();
    return { success: true, message: 'Supabase connected' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Supabase sync failed' };
  }
}
