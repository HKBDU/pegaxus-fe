import { useEffect, useRef } from "react";
import { useLogoutMutation } from "../hooks/useAuth";
import { LoadingState } from "@/shared/components/common";
import { usePageTitle } from "@/shared/hooks";

export default function LogoutPage() {
  usePageTitle("Sign Out");
  const { mutate } = useLogoutMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  return <LoadingState />;
}
