import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import type {
  AuthPrincipal,
  AuthResponse,
  AuthUser,
} from "@/features/auth/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  user: AuthUser | null;
  principal: AuthPrincipal | null;
  setAuth: (payload: AuthResponse) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        user: null,
        principal: null,
        setAuth: ({ accessToken, refreshToken, expiresIn, user }) =>
          set({
            accessToken,
            refreshToken,
            expiresIn,
            user,
            principal: {
              id: user.accountId,
              displayName: user.fullName,
              roles: [user.role],
              permissions: [],
            },
          }),
        setAccessToken: (accessToken) => set({ accessToken }),
        clearAuth: () =>
          set({
            accessToken: null,
            refreshToken: null,
            expiresIn: null,
            user: null,
            principal: null,
          }),
      }),
      {
        name: "pegaxus-auth",
        storage: createJSONStorage(() => localStorage),
      },
    ),
  ),
);
