const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error(
    'MISSING ENVIRONMENT VARIABLE: VITE_API_URL\n' +
      'Please create .env file with: VITE_API_URL=http://localhost:8080/api/v1/',
  )
}

export const env = {
  API_URL: API_URL.endsWith('/') ? API_URL : `${API_URL}/`,
} as const
