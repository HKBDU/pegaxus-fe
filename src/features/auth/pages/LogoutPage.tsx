import { useEffect, useRef } from "react";
import { useLogoutMutation } from "../hooks/useAuth";
import { LoadingState } from "@/shared/components/common";

export default function LogoutPage() {
  const { mutate } = useLogoutMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  return <LoadingState />;
}
