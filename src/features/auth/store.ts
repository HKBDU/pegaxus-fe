import { create } from 'zustand'
import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import type { AuthPrincipal } from '@/features/auth/types'

interface AuthState {
  accessToken: string | null
  principal: AuthPrincipal | null
  setAuth: (payload: { accessToken: string; principal: AuthPrincipal }) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        principal: null,
        setAuth: ({ accessToken, principal }) => set({ accessToken, principal }),
        setAccessToken: (accessToken) => set({ accessToken }),
        clearAuth: () => set({ accessToken: null, principal: null }),
      }),
      {
        name: 'pegaxus-auth',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  ),
)
