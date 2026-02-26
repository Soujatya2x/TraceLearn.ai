import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AnalysisStatus, Language, Session } from '@/types'

export type Theme = 'light' | 'dark'

interface AppState {
  currentSessionId: string | null
  currentSession: Session | null
  analysisStatus: AnalysisStatus
  code: string
  language: Language
  logFile: File | null
  projectFiles: File[]
  isPolling: boolean
  sidebarOpen: boolean
  theme: Theme
  setCurrentSessionId: (id: string | null) => void
  setCurrentSession: (session: Session | null) => void
  setAnalysisStatus: (status: AnalysisStatus) => void
  setCode: (code: string) => void
  setLanguage: (language: Language) => void
  setLogFile: (file: File | null) => void
  setProjectFiles: (files: File[]) => void
  setIsPolling: (polling: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  resetWorkspace: () => void
}

const INITIAL_CODE = `# Paste or type your code here
def calculate_average(numbers):
    total = sum(numbers)
    return total / len(numbers)

result = calculate_average([])
print(f"Average: {result}")
`

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        currentSessionId: null,
        currentSession: null,
        analysisStatus: 'idle',
        code: INITIAL_CODE,
        language: 'python',
        logFile: null,
        projectFiles: [],
        isPolling: false,
        sidebarOpen: true,
        theme: 'dark',
        setCurrentSessionId: (id) => set({ currentSessionId: id }),
        setCurrentSession: (session) => set({ currentSession: session }),
        setAnalysisStatus: (status) => set({ analysisStatus: status }),
        setCode: (code) => set({ code }),
        setLanguage: (language) => set({ language }),
        setLogFile: (logFile) => set({ logFile }),
        setProjectFiles: (projectFiles) => set({ projectFiles }),
        setIsPolling: (isPolling) => set({ isPolling }),
        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
        setTheme: (theme) => set({ theme }),
        toggleTheme: () =>
          set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
        resetWorkspace: () =>
          set({
            currentSessionId: null,
            currentSession: null,
            analysisStatus: 'idle',
            code: INITIAL_CODE,
            logFile: null,
            projectFiles: [],
            isPolling: false,
          }),
      }),
      {
        name: 'tracelearn-storage',
        partialize: (state) => ({ theme: state.theme, language: state.language }),
      },
    ),
    { name: 'TraceLearnStore' },
  ),
)