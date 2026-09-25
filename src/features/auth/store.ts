import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import type { AuthPrincipal } from '@/features/auth/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  principal: AuthPrincipal | null
  setAuth: (payload: { accessToken: string; refreshToken?: string; principal: AuthPrincipal }) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        principal: null,
        setAuth: ({ accessToken, refreshToken, principal }) => set({ accessToken, refreshToken: refreshToken ?? null, principal }),
        setAccessToken: (accessToken) => set({ accessToken }),
        clearAuth: () => set({ accessToken: null, refreshToken: null, principal: null }),
      }),
      {
        name: 'pegaxus-auth',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  ),
)
