import { writable } from 'svelte/store';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '$lib/firebase';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  initialized: false
};

export const authStore = writable<AuthState>(initialState);

// Initialize auth state listener
export const initAuthListener = () => {
  return onAuthStateChanged(auth, (user) => {
    authStore.update(state => ({
      ...state,
      user,
      loading: false,
      initialized: true
    }));
  });
};

// Auth methods
export const authMethods = {
  signInWithEmail: async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signOut: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};