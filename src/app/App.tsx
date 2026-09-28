import { QueryProvider, RouterProvider } from '@/app/providers'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider />
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
