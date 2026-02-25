// ============================================================
// TraceLearn.ai — Centralized Axios API Client
// ============================================================

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
})

// ─── Request Interceptor ─────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach auth token if available (future-proof)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('tl_auth_token')
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
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
