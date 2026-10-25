export const REPORT_MOCK_MODE =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_REPORT_MOCKS === "true";

export const REPORT_DATA_SOURCE = REPORT_MOCK_MODE ? "demo" : "live";
