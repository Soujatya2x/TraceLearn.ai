// ============================================================
// TraceLearn.ai — useFallback hook
//
// Wraps any TanStack Query result with smart mock-data fallback.
// If the backend returns real data → use it, no badge shown.
// If query fails / returns nothing → use mock, set isPreview=true.
//
// Usage:
//   const { data, isPreview } = useFallback(queryResult, MOCK_DATA)
// ============================================================

'use client'

import { useMemo } from 'react'

// Use a minimal interface instead of the full UseQueryResult generic.
// This means spreading a query object ({ ...roadmapQuery }) works fine,
// and there's no variance issue with TanStack's complex generics.
interface QueryLike<T> {
  data: T | undefined
  isLoading: boolean
  isError: boolean
}

interface FallbackResult<T> {
  /** Real backend data if available, otherwise mock. Always T, never undefined. */
  data: T
  /** True when mock data is being shown (backend missing/failed) */
  isPreview: boolean
  /** Pass-through from the original query */
  isLoading: boolean
  isError: boolean
}

export function useFallback<T>(
  query: QueryLike<T>,
  mockData: T,
): FallbackResult<T> {
  const isPreview = useMemo(() => {
    // Show preview badge when:
    // 1. Query errored out (backend down, 404, 500, etc.)
    // 2. Query succeeded but returned null/undefined
    // 3. No sessionId/userId passed so query was never enabled
    //    (isLoading=false, data=undefined)
    if (query.isLoading) return false
    return !query.data
  }, [query.isLoading, query.data])

  // Explicit typed const → TS knows this is always T, never T | undefined
  const data: T = query.data ?? mockData

  return {
    data,
    isPreview,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}