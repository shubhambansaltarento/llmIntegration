import { createStore } from 'solid-js/store'
import type { Conversation, Message } from '../types/conversation'

export type ChatStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  input: string
  chatStatus: ChatStatus
}

const initialConversations: Conversation[] = [
  { id: '1', title: 'Trip planning to Japan', messages: [] },
  { id: '2', title: 'Debugging useEffect loop', messages: [] },
  { id: '3', title: 'SolidJS reactivity deep dive', messages: [] },
  { id: '4', title: 'Recipe: weekend sourdough', messages: [] },
  { id: '5', title: 'Interview prep notes', messages: [] },
]

const [chatState, setChatState] = createStore<ChatState>({
  conversations: initialConversations,
  activeConversationId: initialConversations[0]?.id ?? null,
  input: '',
  chatStatus: 'idle',
})

function createConversation(title = 'New Conversation') {
  const id = crypto.randomUUID()

  setChatState('conversations', (conversations) => [
    ...conversations,
    { id, title, messages: [] },
  ])
  setChatState('activeConversationId', id)

  return id
}

function selectConversation(id: string) {
  setChatState('activeConversationId', id)
}

function deleteConversation(id: string) {
  setChatState('conversations', (conversations) =>
    conversations.filter((conversation) => conversation.id !== id),
  )

  if (chatState.activeConversationId === id) {
    setChatState('activeConversationId', null)
  }
}

function addMessage(conversationId: string, message: Message) {
  setChatState(
    'conversations',
    (conversation) => conversation.id === conversationId,
    'messages',
    (messages) => [...messages, message],
  )
}

function updateMessage(
  conversationId: string,
  messageId: string,
  changes: Partial<Message>,
) {
  setChatState(
    'conversations',
    (conversation) => conversation.id === conversationId,
    'messages',
    (message) => message.id === messageId,
    changes,
  )
}

function setInput(value: string) {
  setChatState('input', value)
}

function setChatStatus(status: ChatStatus) {
  setChatState('chatStatus', status)
}

export {
  chatState,
  createConversation,
  selectConversation,
  deleteConversation,
  addMessage,
  updateMessage,
  setInput,
  setChatStatus,
}
