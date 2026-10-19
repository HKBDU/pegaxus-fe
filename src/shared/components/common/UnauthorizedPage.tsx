import { StatusPage } from './StatusPage'

export function UnauthorizedPage() {
  return <StatusPage image="/Unauthorized.png" imageAlt="Horse transport waiting at a restricted checkpoint" eyebrow="401 / Sign-in required" title="Access required" description="Please sign in with a Pegaxus account to continue to this route-control area." primaryLabel="Sign in" primaryTo="/login" primaryAction="login" />
}
