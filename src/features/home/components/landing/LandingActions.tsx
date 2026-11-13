import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLandingAuth } from "../../hooks/useLandingAuth";
import { useUser } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store";
import { ProfileDropdown } from "@/shared/components/ProfileDropdown";

export function CustomerAccountTools() {
  const { data: account } = useUser();
  const principal = useAuthStore((state) => state.principal);
  const user = account
    ? {
        name: account.fullName || account.email,
        email: account.email,
        avatarUrl: account.avatarUrl ?? undefined,
      }
    : {
        name: principal?.displayName ?? "Account",
        email: principal?.email ?? "",
      };
  return (
    <div className="brand-account-tools">
      <ProfileDropdown isLoggedIn user={user} />
    </div>
  );
}

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
  className = "landing-button",
  navbar = false,
}: {
  final?: boolean;
  onClick?: () => void;
  className?: string;
  navbar?: boolean;
}) {
  const { pending, cta, customer } = useLandingAuth();
  const destination =
    navbar && customer ? { to: "/bookings", label: "My Workspace" } : cta;
  if (pending)
    return (
      <span
        className={`${className} landing-action-pending`}
        role="status"
        aria-busy="true"
      >
        Preparing navigation
      </span>
    );
  if (!destination)
    return (
      <a className={className} href="#platform" onClick={onClick}>
        Explore the platform <ArrowUpRight aria-hidden="true" />
      </a>
    );
  return (
    <Link className={className} to={destination.to} onClick={onClick}>
      {destination.label}
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}
