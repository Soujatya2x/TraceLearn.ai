// ============================================================
// TraceLearn.ai — Auth Zustand Store
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  signInWithEmail,
  signUpWithEmail,
  getCurrentUser,
  signOut as signOutService,
  refreshAccessToken,
  tokenStorage,
} from "@/services/api/authService";
import { useAppStore } from "@/store/useAppStore";
import type {
  AuthStatus,
  SignInEmailRequest,
  SignUpEmailRequest,
  User,
} from "@/types/auth";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  initAuth: () => Promise<void>;
  signInEmail: (payload: SignInEmailRequest) => Promise<void>;
  signUpEmail: (payload: SignUpEmailRequest) => Promise<void>;
  signInWithOAuth: (provider: "google" | "github") => void;
  signOut: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

function syncUserId(user: User | null) {
  useAppStore.getState().setUserId(user?.id ?? null);
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      status: "idle",
      error: null,

      initAuth: async () => {
        set({ status: "loading" });

        const hasAccessInMemory =
          Boolean(tokenStorage.getAccess()) && !tokenStorage.isExpired();

        // If we already have a valid access token (set by callback page), skip refresh
        if (hasAccessInMemory) {
          try {
            const user = await getCurrentUser();
            syncUserId(user);
            set({ user, status: "authenticated" });
          } catch {
            tokenStorage.clear();
            syncUserId(null);
            set({ user: null, status: "unauthenticated" });
          }
          return; // ← EXIT HERE, don't attempt refresh
        }

        // No token in memory — try silent refresh (cross-domain cookie won't work
        // between vercel.app and hopto.org, so this will fail and user goes to sign-in)
        try {
          await refreshAccessToken();
          const user = await getCurrentUser();
          syncUserId(user);
          set({ user, status: "authenticated" });
        } catch {
          tokenStorage.clear();
          syncUserId(null);
          set({ user: null, status: "unauthenticated" });
        }
      },

      signInEmail: async (payload) => {
        set({ status: "loading", error: null });
        try {
          const { user } = await signInWithEmail(payload);
          syncUserId(user);
          set({ user, status: "authenticated", error: null });
        } catch (err: unknown) {
          const message = extractErrorMessage(
            err,
            "Invalid email or password.",
          );
          set({ status: "unauthenticated", error: message });
          throw err;
        }
      },

      signUpEmail: async (payload) => {
        set({ status: "loading", error: null });
        try {
          const { user } = await signUpWithEmail(payload);
          syncUserId(user);
          set({ user, status: "authenticated", error: null });
        } catch (err: unknown) {
          const message = extractErrorMessage(
            err,
            "Could not create account. Try again.",
          );
          set({ status: "unauthenticated", error: message });
          throw err;
        }
      },

      signInWithOAuth: (provider) => {
        set({ status: "loading", error: null });
        const backendBase =
          process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
          "http://localhost:8080";
        window.location.href = `${backendBase}/oauth2/authorization/${provider}`;
      },

      signOut: async () => {
        set({ status: "loading" });
        try {
          await signOutService();
        } finally {
          syncUserId(null);
          set({ user: null, status: "unauthenticated", error: null });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => {
        syncUserId(user);
        set({ user, status: user ? "authenticated" : "unauthenticated" });
      },
    }),
    { name: "TraceLearnAuthStore" },
  ),
);

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const resp = (err as { response?: { data?: { message?: string } } })
      .response;
    return resp?.data?.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
