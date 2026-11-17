import { useNavigate } from "react-router-dom";
import { ROLE_ROUTES } from "@/app/route-config";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { usePageTitle } from "@/shared/hooks";
import { useBackTarget } from "@/shared/hooks/useBackTarget";

export default function ChangePasswordPage() {
  usePageTitle("Change Password");
  const navigate = useNavigate();

  const backTarget = useBackTarget({
    fallback: ROLE_ROUTES.profile,
    fallbackLabel: "Back to Profile",
    allowedOrigins: [ROLE_ROUTES.profile, "/profile-settings", "/profile"],
    labels: {
      [ROLE_ROUTES.profile]: "Back to Profile",
    },
  });

  function returnToPreviousPage() {
    navigate(backTarget.href, { replace: true });
  }

  return (
    <AuthFlowLayout
      title="Change password"
      backTo={backTarget.href}
      backLabel={backTarget.label}
    >
      <div className="mt-5">
        <ChangePasswordForm onSuccess={returnToPreviousPage} />
      </div>
    </AuthFlowLayout>
  );
}
