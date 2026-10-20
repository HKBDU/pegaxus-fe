import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLandingAuth } from "../../hooks/useLandingAuth";

export function GuestLinks({
  className = "landing-sign-in",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const { guest } = useLandingAuth();
  if (!guest) return null;
  return (
    <>
      <Link to="/login" className={className} onClick={onClick}>
        Sign in
      </Link>
      <Link to="/register" className={className} onClick={onClick}>
        Sign up
      </Link>
    </>
  );
}

export function TransportLink({
  onClick,
}: {
  final?: boolean;
  onClick?: () => void;
}) {
  const { pending, cta } = useLandingAuth();
  if (pending)
    return (
      <span
        className="landing-button landing-action-pending"
        role="status"
        aria-busy="true"
      >
        Preparing navigation
      </span>
    );
  if (!cta)
    return (
      <a className="landing-button" href="#platform" onClick={onClick}>
        Explore the platform <ArrowUpRight aria-hidden="true" />
      </a>
    );
  return (
    <Link className="landing-button" to={cta.to} onClick={onClick}>
      {cta.label}
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}
