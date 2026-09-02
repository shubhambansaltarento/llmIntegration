import { Show, For } from 'solid-js'
import { chatState, retry, dismissError, continueAfterCancel } from '../../stores/chat.store'
import LoadingIndicator from '../feedback/LoadingIndicator'
import StreamingIndicator from '../feedback/StreamingIndicator'
import ErrorMessage from '../feedback/ErrorMessage'
import RetryButton from '../feedback/RetryButton'

function MessageList() {
  const activeConversation = () =>
    chatState.conversations.find(
      (conversation) => conversation.id === chatState.activeConversationId,
    )

  // The current chatStatus only applies to the message list it started
  // from - a conversation the user has switched away from shouldn't show
  // another conversation's "thinking"/"streaming"/error affordances.
  const belongsToActiveConversation = () =>
    chatState.streamingConversationId !== null &&
    chatState.streamingConversationId === chatState.activeConversationId

  const isStreamingMessage = (messageId: string) =>
    chatState.chatStatus === 'streaming' &&
    belongsToActiveConversation() &&
    chatState.streamingMessageId === messageId

  return (
    <div class="message-list">
      <Show
        when={activeConversation()?.messages.length}
        fallback={
          <p class="message-list__empty">
            Send a message to start the conversation.
          </p>
        }
      >
        <For each={activeConversation()?.messages}>
          {(message) => (
            <div class="message" classList={{ [`message--${message.role}`]: true }}>
              <span class="message__role">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </span>
              <p class="message__content">
                {message.content}
                <Show when={isStreamingMessage(message.id)}>
                  <StreamingIndicator cursorOnly />
                </Show>
              </p>
            </div>
          )}
        </For>
      </Show>

      <Show when={belongsToActiveConversation() && chatState.chatStatus === 'thinking'}>
        <LoadingIndicator />
      </Show>

      <Show when={belongsToActiveConversation() && chatState.chatStatus === 'streaming'}>
        <StreamingIndicator />
      </Show>

      <Show when={belongsToActiveConversation() && chatState.chatStatus === 'error'}>
        <ErrorMessage
          variant="error"
          title={chatState.error?.message ?? 'Something went wrong.'}
          message={chatState.error?.detail}
        >
          <RetryButton onClick={retry} />
          <button type="button" onClick={dismissError}>
            Dismiss
          </button>
        </ErrorMessage>
      </Show>

      <Show when={belongsToActiveConversation() && chatState.chatStatus === 'cancelled'}>
        <ErrorMessage variant="cancelled" title="Generation stopped.">
          <button type="button" onClick={continueAfterCancel}>
            Continue
          </button>
        </ErrorMessage>
      </Show>
    </div>
  )
}

export default MessageList
