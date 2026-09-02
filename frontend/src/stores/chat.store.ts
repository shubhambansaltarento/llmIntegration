import { createStore } from 'solid-js/store'
import type { Conversation, Message } from '../types/conversation'
import type { ChatMessagePayload } from '../services/chat.service'
import { streamChatMessage, ApiError, type ApiErrorCode } from '../services/chat-stream.service'
import { showToast } from '../components/feedback/Toast'

export type ChatStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled'

export type ChatErrorKind = 'network' | 'rate_limit' | 'server'

export interface ChatError {
  kind: ChatErrorKind
  /** Canonical, user-facing copy for this kind - stable text the UI keys off. */
  message: string
  /** Raw message from the backend/transport, shown as secondary detail. */
  detail?: string
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  input: string
  chatStatus: ChatStatus
  error: ChatError | null
  /** Which conversation/message `chatStatus` currently describes, so the UI
   *  only shows thinking/streaming/error/cancelled affordances next to the
   *  request they actually belong to - not whichever conversation happens
   *  to be active. Set when a request starts and cleared only once the
   *  status returns to 'idle' (dismissed, continued, or superseded by a
   *  new request), so an error/cancelled banner survives switching away
   *  from and back to the conversation it belongs to. */
  streamingConversationId: string | null
  streamingMessageId: string | null
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
  error: null,
  streamingConversationId: null,
  streamingMessageId: null,
})

// --- Request bookkeeping ---------------------------------------------------
//
// These live outside the Solid store on purpose: an AbortController isn't
// serializable UI state, and `requestSeq` is a plain guard token, not
// something any component renders. Reactive state and control-flow
// plumbing are kept separate deliberately.

/** Bumped on every new request and every cancellation. Callbacks from a
 *  request capture the sequence number they were started with and compare
 *  it against this value before touching shared state - a stale callback
 *  from a superseded or just-cancelled request becomes a no-op instead of
 *  a race that can clobber a newer status (e.g. a chunk arriving a tick
 *  after Stop was clicked, flipping 'cancelled' back to 'streaming'). */
let requestSeq = 0
let activeController: AbortController | null = null

interface PendingRequest {
  conversationId: string
  assistantMessageId: string
  history: ChatMessagePayload[]
}

/** The request that last failed, kept so Retry can resend the exact same
 *  history into the exact same assistant bubble instead of creating a
 *  second, duplicate assistant message. */
let pendingRequest: PendingRequest | null = null

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

function removeMessage(conversationId: string, messageId: string) {
  setChatState(
    'conversations',
    (conversation) => conversation.id === conversationId,
    'messages',
    (messages) => messages.filter((message) => message.id !== messageId),
  )
}

function setInput(value: string) {
  setChatState('input', value)
}

function classifyThrownError(error: unknown): ChatError {
  if (error instanceof ApiError) {
    return classifyCode(error.code, error.message)
  }

  return { kind: 'server', message: 'Something went wrong.' }
}

function classifyCode(code: ApiErrorCode | undefined, backendMessage: string): ChatError {
  if (code === 'rate_limit') {
    return {
      kind: 'rate_limit',
      message: 'Too many requests. Please try again.',
      detail: backendMessage,
    }
  }

  if (!code) {
    // No code means the failure never reached the backend at all (see
    // ApiError thrown from the fetch() catch in chat-stream.service) -
    // that is, by elimination, a network failure.
    return { kind: 'network', message: 'Connection interrupted.' }
  }

  return { kind: 'server', message: 'Something went wrong.', detail: backendMessage }
}

async function runRequest(
  conversationId: string,
  assistantMessageId: string,
  history: ChatMessagePayload[],
) {
  requestSeq += 1
  const mySeq = requestSeq

  const controller = new AbortController()
  activeController = controller
  pendingRequest = { conversationId, assistantMessageId, history }

  setChatState({
    chatStatus: 'thinking',
    error: null,
    streamingConversationId: conversationId,
    streamingMessageId: assistantMessageId,
  })

  let accumulated = ''

  try {
    await streamChatMessage(
      history,
      {
        onChunk: (delta) => {
          if (mySeq !== requestSeq) return

          if (chatState.chatStatus !== 'streaming') {
            setChatState('chatStatus', 'streaming')
          }

          accumulated += delta
          updateMessage(conversationId, assistantMessageId, { content: accumulated })
        },
        onDone: () => {
          if (mySeq !== requestSeq) return

          setChatState('chatStatus', 'completed')
        },
        onError: (message, code) => {
          if (mySeq !== requestSeq) return

          const chatError = classifyCode(code, message)
          setChatState({ chatStatus: 'error', error: chatError })
          showToast(chatError.message, 'error')
        },
      },
      controller.signal,
    )
  } catch (error) {
    // A superseded request (we've already moved on, e.g. cancelGeneration
    // already bumped requestSeq and set 'cancelled') should not overwrite
    // whatever the newer/cancelling code path already decided.
    if (mySeq !== requestSeq) return

    const chatError = classifyThrownError(error)
    setChatState({ chatStatus: 'error', error: chatError })
    showToast(chatError.message, 'error')
  } finally {
    if (mySeq === requestSeq) {
      activeController = null
    }
  }
}

/** Entry point for sending a new user message. */
function sendMessage(text: string) {
  const trimmed = text.trim()

  if (!trimmed || chatState.chatStatus === 'thinking' || chatState.chatStatus === 'streaming') {
    return
  }

  const conversationId = chatState.activeConversationId ?? createConversation()
  const priorMessages =
    chatState.conversations.find((conversation) => conversation.id === conversationId)
      ?.messages ?? []

  const history: ChatMessagePayload[] = [
    ...priorMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: 'user' as const, content: trimmed },
  ]

  addMessage(conversationId, {
    id: crypto.randomUUID(),
    role: 'user',
    content: trimmed,
  })

  setChatState('input', '')

  // The assistant message exists (empty) before any network activity, so
  // there is always a bubble in the store for chunks to fill in.
  const assistantMessageId = crypto.randomUUID()
  addMessage(conversationId, {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
  })

  void runRequest(conversationId, assistantMessageId, history)
}

/** Stops an in-flight request. Sets 'cancelled' synchronously and
 *  invalidates the request's callbacks so a chunk already in flight can't
 *  arrive afterwards and flip the status back to 'streaming'. */
function cancelGeneration() {
  if (!activeController) return

  requestSeq += 1
  activeController.abort()
  activeController = null

  setChatState({ chatStatus: 'cancelled', error: null })
  showToast('Generation stopped.', 'info')
}

/** Resends the last failed request's exact history into the same assistant
 *  bubble - no duplicate user or assistant message is created. */
function retry() {
  if (chatState.chatStatus !== 'error' || !pendingRequest) return

  const { conversationId, assistantMessageId, history } = pendingRequest
  updateMessage(conversationId, assistantMessageId, { content: '' })
  void runRequest(conversationId, assistantMessageId, history)
}

/** If the given assistant bubble never received any content (the request
 *  failed or was cancelled before a single chunk arrived), remove it
 *  rather than leaving an empty bubble behind in the transcript. */
function removeIfEmpty(conversationId: string, assistantMessageId: string) {
  const conversation = chatState.conversations.find((c) => c.id === conversationId)
  const message = conversation?.messages.find((m) => m.id === assistantMessageId)

  if (message && message.content === '') {
    removeMessage(conversationId, assistantMessageId)
  }
}

/** Dismisses an error banner. */
function dismissError() {
  if (chatState.chatStatus !== 'error') return

  if (pendingRequest) {
    removeIfEmpty(pendingRequest.conversationId, pendingRequest.assistantMessageId)
  }

  pendingRequest = null
  setChatState({
    chatStatus: 'idle',
    error: null,
    streamingConversationId: null,
    streamingMessageId: null,
  })
}

/** Acknowledges a cancelled generation and unblocks the composer, keeping
 *  whatever partial content was already streamed. */
function continueAfterCancel() {
  if (chatState.chatStatus !== 'cancelled') return

  if (pendingRequest) {
    removeIfEmpty(pendingRequest.conversationId, pendingRequest.assistantMessageId)
  }

  pendingRequest = null
  setChatState({
    chatStatus: 'idle',
    streamingConversationId: null,
    streamingMessageId: null,
  })
}

export {
  chatState,
  createConversation,
  selectConversation,
  deleteConversation,
  addMessage,
  updateMessage,
  setInput,
  sendMessage,
  cancelGeneration,
  retry,
  dismissError,
  continueAfterCancel,
}
