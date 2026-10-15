import RoutePlanDetailPage from "./RoutePlanDetailPage"

// Public LM workspace for owner registration; RP3 context and the existing shell are reused.
export default function RouteChangeDecisionPage() {
  return <RoutePlanDetailPage emergencyView="decision" />
}
