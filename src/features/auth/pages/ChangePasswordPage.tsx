import { useNavigate } from "react-router-dom";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  function returnToPreviousPage() {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <AuthFlowLayout title="Change password" onBack={returnToPreviousPage}>
      <div className="mt-5">
        <ChangePasswordForm onSuccess={returnToPreviousPage} />
      </div>
    </AuthFlowLayout>
  );
}
