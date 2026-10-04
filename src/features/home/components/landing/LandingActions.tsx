import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { normalizeRole } from "@/features/auth/access-control";
import { getTransportCta } from "../../lib/landing-navigation";

export function TransportLink({
  final = false,
  onClick,
}: {
  final?: boolean;
  onClick?: () => void;
}) {
  const authenticated = useAuthStore((state) => Boolean(state.accessToken));
  const principal = useAuthStore((state) => state.principal);
  const cta = getTransportCta(
    authenticated,
    principal?.roles.map(normalizeRole) ?? [],
  );
  if (!cta)
    return (
      <a className="landing-button" href="#platform" onClick={onClick}>
        Explore the platform <ArrowUpRight aria-hidden="true" />
      </a>
    );
  return (
    <Link className="landing-button" to={cta.to} onClick={onClick}>
      {final && cta.to === "/bookings/new" ? "Start a transport" : cta.label}
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}
