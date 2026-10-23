type Flow5Environment = {
  DEV?: boolean;
  PROD?: boolean;
  VITE_ENABLE_FLOW5_MOCKS?: string;
};

export function isEmergencyCostMockMode(
  env: Flow5Environment = import.meta.env,
) {
  return (
    env.DEV === true &&
    env.PROD !== true &&
    env.VITE_ENABLE_FLOW5_MOCKS === "true"
  );
}

export const emergencyCostSource = (): "mock" | "real" =>
  isEmergencyCostMockMode() ? "mock" : "real";
