/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, OWNER_EMAIL } from '../types/ikk';

const AUTH_STORAGE_KEY = 'ikk_auth_user_session';

/**
 * Get current authenticated user from storage.
 * Default is null (Guest / Tamu - unauthenticated).
 */
export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) {
      // Re-evaluate role in case owner email constant changes
      const isOwnerAccount = parsed.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase();
      parsed.role = isOwnerAccount ? 'owner' : 'contributor';
      return parsed;
    }
  } catch (err) {
    console.error('Error reading auth session:', err);
  }
  return null;
}

/**
 * Save authenticated user to storage.
 */
export function saveStoredUser(user: UserProfile | null): void {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Error saving auth session:', err);
  }
}

/**
 * Check if the active user is the verified account owner (sifarofatunnisa24@gmail.com).
 */
export function isOwner(user: UserProfile | null): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === OWNER_EMAIL.trim().toLowerCase();
}

/**
 * Check if the user is authorized to upload documents.
 * Strictly restricted to the account owner.
 */
export function canUploadData(user: UserProfile | null): boolean {
  return isOwner(user);
}

/**
 * Check if the user is authorized to add/edit catatan rekon.
 * Any user logged in with a Google account can write catatan.
 */
export function canWriteNotes(user: UserProfile | null): boolean {
  return !!user && !!user.email;
}

/**
 * Helper to log in with a Google email address.
 */
export function loginWithGoogleEmail(email: string, name?: string, picture?: string): UserProfile {
  const cleanEmail = email.trim().toLowerCase();
  const isOwnerAccount = cleanEmail === OWNER_EMAIL.trim().toLowerCase();

  const user: UserProfile = {
    email: cleanEmail,
    name: name || (isOwnerAccount ? 'Sifa Rofatunnisa (Pemilik)' : cleanEmail.split('@')[0]),
    picture: picture || undefined,
    role: isOwnerAccount ? 'owner' : 'contributor',
    loginMethod: 'google',
    loginAt: new Date().toISOString()
  };

  saveStoredUser(user);
  return user;
}

/**
 * Log out current user and return to guest state.
 */
export function logoutUser(): void {
  saveStoredUser(null);
}
