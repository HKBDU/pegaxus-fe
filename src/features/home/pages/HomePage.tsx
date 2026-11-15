import { PegaxusLanding } from "../components/landing/PegaxusLanding";
import { usePageTitle } from "@/shared/hooks";

export default function HomePage() {
  usePageTitle();
  return <PegaxusLanding />;
}
