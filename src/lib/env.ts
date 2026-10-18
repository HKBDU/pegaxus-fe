const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("MISSING ENVIRONMENT VARIABLE: VITE_API_URL\nPlease check your .env file.");
}

export const env = {
  API_URL: API_URL.endsWith("/") ? API_URL : `${API_URL}/`,
} as const;
