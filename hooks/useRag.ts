'use client'

import { useMutation } from '@tanstack/react-query'
import { uploadRagFiles, queryRag } from '@/services/api/ragService'
import type { RagUploadResponse, RagQueryResponse } from '@/services/api/ragService'

/**
 * Hook for Phase 1: upload files + trigger indexing.
 *
 * Usage:
 *   const upload = useRagUpload()
 *   upload.mutate(fileList)
 *   upload.data         → RagUploadResponse (has collectionId)
 *   upload.isPending    → true while uploading + indexing
 *   upload.isSuccess    → true when RAG server confirmed "indexed"
 */
export function useRagUpload() {
  return useMutation<RagUploadResponse, Error, File[]>({
    mutationFn: (files: File[]) => uploadRagFiles(files),
  })
}

/**
 * Hook for Phase 2: ask a question about indexed documents.
 *
 * Usage:
 *   const ask = useRagQuery()
 *   ask.mutate({ collectionId, query })
 *   ask.data            → RagQueryResponse (has answer + sources)
 *   ask.isPending       → true while RAG is searching + generating
 */
export function useRagQuery() {
  return useMutation<
    RagQueryResponse,
    Error,
    { collectionId: string; query: string; topK?: number }
  >({
    mutationFn: ({ collectionId, query, topK }) =>
      queryRag(collectionId, query, topK),
  })
}