type MockEnvironment = { DEV?: boolean; PROD?: boolean; MODE?: string; VITE_ENABLE_FLOW6_MOCKS?: string }

export function isFlow6MockMode(env: MockEnvironment = import.meta.env) {
  return env.PROD !== true && (env.DEV === true || env.MODE === "test") && env.VITE_ENABLE_FLOW6_MOCKS === "true"
}
