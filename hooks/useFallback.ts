'use client'

import { useMemo } from 'react'

interface QueryLike<T> {
  data: T | undefined
  isLoading: boolean
  isFetching: boolean   // ← add this
  isError: boolean
  isWaitingForData?: boolean
}

interface FallbackResult<T> {
  data: T
  isPreview: boolean
  isLoading: boolean
  isError: boolean
}

export function useFallback<T>(
  query: QueryLike<T>,
  mockData: T,
): FallbackResult<T> {
  // isLoading is true only when there's no cached data AND a fetch is in-flight.
  // isFetching is true whenever ANY fetch is in-flight (including background refetches).
  // We treat either as "still loading" so we never flash mock data before real data arrives.
  const isActuallyLoading =
    query.isWaitingForData ||
    query.isLoading ||
    (query.isFetching && !query.data)

  const isPreview = useMemo(() => {
    if (isActuallyLoading) return false
    return !query.data
  }, [isActuallyLoading, query.data])

  const data: T = query.data ?? mockData

  return {
    data,
    isPreview,
    isLoading: isActuallyLoading,
    isError: query.isError,
  }
}