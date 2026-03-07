import apiClient from './client'
import { API_ENDPOINTS } from './endpoints'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RagUploadResponse {
  collectionId: string
  indexedFiles: string[]
  chunkCount: number
  message: string
}

export interface SourceReference {
  fileName: string
  excerpt: string
  score: number
}

export interface RagQueryResponse {
  answer: string
  sources: SourceReference[]
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Upload one or more files.
 * Uses FormData (multipart/form-data) — no Content-Type header override needed,
 * axios sets it automatically including the boundary.
 */
export async function uploadRagFiles(files: File[]): Promise<RagUploadResponse> {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))

  const response = await apiClient.post<{ success: boolean; data: RagUploadResponse }>(
    API_ENDPOINTS.RAG_UPLOAD,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Large files can take a while to upload + index — extend timeout to 3 min
      timeout: 180_000,
    },
  )

  return response.data.data
}

/**
 * Send a user question to the RAG pipeline.
 */
export async function queryRag(
  collectionId: string,
  query: string,
  topK = 5,
): Promise<RagQueryResponse> {
  const response = await apiClient.post<{ success: boolean; data: RagQueryResponse }>(
    API_ENDPOINTS.RAG_QUERY,
    { collectionId, query, topK },
  )

  return response.data.data
}