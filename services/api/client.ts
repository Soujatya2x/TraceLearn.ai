import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

// ─── Constants ──────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'
const API_VERSION = '/api/v1'
const TIMEOUT_MS = 30_000

// ─── Create Axios Instance ───────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // withCredentials is set per-request in authService.ts for endpoints that
  // need to send/receive the httpOnly refresh token cookie.
  // We do NOT set it globally here because:
  //   1. CORS with withCredentials=true requires an explicit Allow-Origin header
  //      (wildcards are not allowed) — setting it globally could break other requests.
  //   2. Only auth endpoints need cookies — API calls use Bearer token in header.
})

// ─── Request Interceptor ─────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read access token from memory (tokenStorage module variable in authService.ts).
    // Import is lazy to avoid circular dependency — authService imports apiClient,
    // so we cannot import tokenStorage at the top level here.
    //
    // HIGH-3 FIX: access token is now in memory, not localStorage.
    // We dynamically require authService to access tokenStorage.getAccess().
    // This is safe — by the time any request fires, authService is already loaded.
    const { tokenStorage } = require('./authService') as {
      tokenStorage: { getAccess: () => string | null }
    }
    const token = tokenStorage.getAccess()
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response Interceptor ────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retryCount?: number
    }

    // Retry on 5xx with exponential backoff (max 3 retries)
    if (
      error.response?.status >= 500 &&
      (originalRequest._retryCount ?? 0) < 3
    ) {
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1
      const delay = Math.pow(2, originalRequest._retryCount) * 500
      await new Promise((resolve) => setTimeout(resolve, delay))
      return apiClient(originalRequest)
    }

    return Promise.reject(error)
  },
)

export default apiClient