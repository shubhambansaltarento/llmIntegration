import { createStore } from 'solid-js/store'
import type { ContextFile, UsageStats } from '../types/context'

interface ContextState {
  files: ContextFile[]
  usage: UsageStats
}

const initialFiles: ContextFile[] = [
  { id: 'package.json', name: 'package.json', type: 'json', size: 1240 },
  { id: 'architecture.md', name: 'architecture.md', type: 'markdown', size: 5320 },
  { id: 'api.ts', name: 'api.ts', type: 'typescript', size: 2380 },
]

/** Files "discovered" by a mock Add Context click, standing in for a future
 *  file picker / repo browser. Cycled through in order so repeated clicks
 *  add distinct files instead of the same one forever. */
const mockAvailableFiles: ContextFile[] = [
  { id: 'chat.store.ts', name: 'chat.store.ts', type: 'typescript', size: 6480 },
  { id: 'README.md', name: 'README.md', type: 'markdown', size: 1890 },
  { id: 'tsconfig.json', name: 'tsconfig.json', type: 'json', size: 540 },
]

const [contextState, setContextState] = createStore<ContextState>({
  files: initialFiles,
  // Stand-in for a response's `usage` block until real requests report one.
  usage: {
    inputTokens: 1240,
    outputTokens: 860,
    estimatedCostUsd: 0.0184,
  },
})

function addMockContextFile() {
  const alreadyAdded = new Set(contextState.files.map((file) => file.id))
  const next = mockAvailableFiles.find((file) => !alreadyAdded.has(file.id))
  if (!next) return

  setContextState('files', (files) => [...files, next])
}

function removeContextFile(id: string) {
  setContextState('files', (files) => files.filter((file) => file.id !== id))
}

export { contextState, addMockContextFile, removeContextFile }
