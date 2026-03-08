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
    
    Accept: 'application/json',
  },
})


// ─── Request Interceptor ─────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {

    // Lazy import to avoid circular dependency
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
      _handled401?: boolean
    }

    const status = error.response?.status


    // ── Handle expired JWT ────────────────────────────────────
    //
    // Strategy: attempt a silent token refresh FIRST.
    // On Vercel (cross-domain), the httpOnly refresh cookie is blocked by the
    // browser and refreshAccessToken() will throw — that's expected. We then
    // fall through to clear + redirect.
    // On same-domain deployments (localhost, self-hosted), the refresh will
    // succeed and the original request is retried transparently — no logout.

    if (status === 401 && !originalRequest._handled401) {

      originalRequest._handled401 = true

      try {
        const { refreshAccessToken, tokenStorage: ts } = require('./authService') as {
          refreshAccessToken: () => Promise<unknown>
          tokenStorage: { getAccess: () => string | null; clear: () => void }
        }

        await refreshAccessToken()

        // Refresh succeeded — attach the new token and retry the original request.
        const newToken = ts.getAccess()
        if (newToken && originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        }

        return apiClient(originalRequest)

      } catch {
        // Refresh failed (expected on Vercel cross-domain) — clear token and
        // redirect to sign-in so the user can re-authenticate via OAuth.
        try {
          const { tokenStorage: ts } = require('./authService') as {
            tokenStorage: { clear: () => void }
          }
          ts.clear()
        } catch { /* fail silently */ }

        if (typeof window !== 'undefined') {
          window.location.href = '/auth/sign-in'
        }

        return Promise.reject(error)
      }
    }


    // ── Retry logic for 5xx errors ───────────────────────────

    if (
      status &&
      status >= 500 &&
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