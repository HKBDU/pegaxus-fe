import type { AxiosInstance } from "axios";
import type { RefreshTokenResponse } from "../types";

// Receive the existing client so its refresh interceptor can reuse this request
// without creating a service/client initialization cycle.
export async function requestRefreshToken(apiClient: AxiosInstance, refreshToken: string) {
  const response = await apiClient.post<unknown, { value: RefreshTokenResponse }>(
    "/auth/refresh-token",
    { refreshToken },
  );
  const tokens = response.value;
  if (!tokens || typeof tokens.accessToken !== "string" || !tokens.accessToken) {
    throw new Error("Refresh response does not contain an access token");
  }
  return tokens;
}
