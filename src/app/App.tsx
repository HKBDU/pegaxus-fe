import { QueryProvider, RouterProvider } from '@/app/providers'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider />
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  )
}
