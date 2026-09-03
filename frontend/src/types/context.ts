export interface ContextFile {
  id: string
  name: string
  /** File extension / language label shown as the file's type, e.g. 'json', 'markdown', 'typescript'. */
  type: string
  /** Size in bytes. */
  size: number
}

export interface UsageStats {
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}
