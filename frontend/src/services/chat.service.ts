export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  content: string
  createdAt: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function sendChatMessages(
  messages: ChatMessagePayload[],
): Promise<AssistantMessage> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.message
}
