export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessageInput {
  role: ChatRole
  content: string
}

export interface ChatRequestBody {
  messages: ChatMessageInput[]
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  content: string
  createdAt: string
}

export interface ChatResponseBody {
  message: AssistantMessage
}

export interface ErrorResponseBody {
  error: string
}

export type ChatStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
