import { useRouteError } from "react-router-dom";

import { ServerErrorPage } from "@/shared/components/common";

export function RouteErrorBoundary() {
  const error = useRouteError();
  console.error("Route rendering failed:", error);
  return <ServerErrorPage />;
}
