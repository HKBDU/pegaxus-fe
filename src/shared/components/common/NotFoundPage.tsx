import { StatusPage } from './StatusPage'
import { usePageTitle } from '@/shared/hooks'

export function NotFoundPage() {
  usePageTitle("Not Found")
  return <StatusPage image="/404NotFound.png" imageAlt="Horse and transport route across a global landscape" eyebrow="404 / Destination unavailable" title="Page not found" description="This route has wandered off the map. Return to the Pegaxus stable and continue your journey." />
}
