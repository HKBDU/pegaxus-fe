import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeRole } from "./access-control";
import type {
  AuthPrincipal,
  AuthResponse,
  AuthUser,
  RefreshTokenResponse,
} from "@/features/auth/types";

interface AuthState {
  sessionVersion: number;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  user: AuthUser | null;
  principal: AuthPrincipal | null;
  setAuth: (payload: AuthResponse) => void;
  setAccessToken: (accessToken: string) => void;
  setTokens: (tokens: RefreshTokenResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
      (set) => ({
        sessionVersion: 0,
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        user: null,
        principal: null,
        setAuth: ({ accessToken, refreshToken, expiresIn, user }) =>
          set((state) => ({
            sessionVersion: state.sessionVersion + 1,
            accessToken,
            refreshToken,
            expiresIn,
            user,
            principal: {
              id: user.accountId,
              displayName: user.fullName,
              roles: [normalizeRole(user.role)],
              permissions: [],
            },
          })),
        setAccessToken: (accessToken) => set({ accessToken }),
        setTokens: (tokens) => set((state) => ({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? state.refreshToken,
          expiresIn: tokens.expiresIn ?? state.expiresIn,
        })),
        clearAuth: () =>
          set((state) => ({
            sessionVersion: state.sessionVersion + 1,
            accessToken: null,
            refreshToken: null,
            expiresIn: null,
            user: null,
            principal: null,
          })),
      }),
      {
        name: "pegaxus-auth",
        storage: createJSONStorage(() => localStorage),
        partialize: ({ accessToken, refreshToken, expiresIn, user, principal }) => ({
          accessToken, refreshToken, expiresIn, user, principal,
        }),
      },
  ),
);
