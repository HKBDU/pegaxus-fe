import { QueryProvider, RouterProvider } from '@/app/providers'
import { router } from '@/app/router'
import '@/app/notification-routes'
import { RealtimeProvider } from '@/shared/realtime'
import { Toaster } from 'sonner'

const openPath = (path: string) => void router.navigate(path)

export default function App() {
  return (
    <QueryProvider>
      <RealtimeProvider onNavigate={openPath}>
        <RouterProvider />
      </RealtimeProvider>
      <Toaster
        position="top-right"
        offset={{ top: 64, right: 12 }}
        mobileOffset={{ top: 60, right: 8 }}
        richColors
        closeButton
      />
    </QueryProvider>
  )
}
