import { createSignal, Show } from 'solid-js'
import {
  chatState,
  createConversation,
  addMessage,
  updateMessage,
  setChatStatus,
} from '../../stores/chat.store'
import { streamChatMessage } from '../../services/chat-stream.service'

function ChatInput() {
  const [value, setValue] = createSignal('')
  let abortController: AbortController | null = null

  const isBusy = () =>
    chatState.chatStatus === 'thinking' || chatState.chatStatus === 'streaming'

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()

    const text = value().trim()
    if (!text || isBusy()) {
      return
    }

    const conversationId = chatState.activeConversationId ?? createConversation()
    const priorMessages =
      chatState.conversations.find((conversation) => conversation.id === conversationId)
        ?.messages ?? []

    const history = [
      ...priorMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: 'user' as const, content: text },
    ]

    addMessage(conversationId, {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    })

    setValue('')
    setChatStatus('thinking')

    // The assistant message exists (empty) before any network activity,
    // so there is always a bubble in the store for chunks to fill in.
    const assistantMessageId = crypto.randomUUID()
    addMessage(conversationId, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    })

    let accumulated = ''
    abortController = new AbortController()

    try {
      await streamChatMessage(
        history,
        {
          onChunk: (delta) => {
            if (chatState.chatStatus !== 'streaming') {
              setChatStatus('streaming')
            }

            accumulated += delta
            updateMessage(conversationId, assistantMessageId, { content: accumulated })
          },
          onDone: () => {
            setChatStatus('completed')
          },
          onError: (message) => {
            updateMessage(conversationId, assistantMessageId, {
              content: accumulated || `Something went wrong: ${message}`,
            })
            setChatStatus('error')
          },
        },
        abortController.signal,
      )
    } catch (error) {
      if (abortController.signal.aborted) {
        updateMessage(conversationId, assistantMessageId, {
          content: accumulated || 'Cancelled.',
        })
        setChatStatus('cancelled')
        return
      }

      updateMessage(conversationId, assistantMessageId, {
        content: accumulated || 'Something went wrong talking to the backend. Please try again.',
      })
      setChatStatus('error')
    }
  }

  const handleStop = () => {
    abortController?.abort()
  }

  return (
    <form class="chat-input" onSubmit={handleSubmit}>
      <input
        class="chat-input__field"
        type="text"
        placeholder="Message AI Workspace..."
        value={value()}
        onInput={(event) => setValue(event.currentTarget.value)}
        disabled={isBusy()}
      />
      <Show
        when={isBusy()}
        fallback={
          <button class="chat-input__send" type="submit" disabled={!value().trim()}>
            Send
          </button>
        }
      >
        <button class="chat-input__stop" type="button" onClick={handleStop}>
          Stop
        </button>
      </Show>
    </form>
  )
}

export default ChatInput
