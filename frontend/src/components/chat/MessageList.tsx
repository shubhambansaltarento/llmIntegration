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
    chatState.chatStatus.kind === 'streaming' &&
    belongsToActiveConversation() &&
    chatState.streamingMessageId === messageId

  // Narrows chatStatus down to just the 'error' variant (or undefined) so
  // the callback-children Show below gets a value whose `.error` is
  // statically known to exist - not a chatStatus.kind check followed by a
  // separately-typed `chatState.error` that TypeScript can't prove is set.
  const activeError = () => {
    if (!belongsToActiveConversation() || chatState.chatStatus.kind !== 'error') {
      return undefined
    }
    return chatState.chatStatus
  }

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

      <Show when={belongsToActiveConversation() && chatState.chatStatus.kind === 'thinking'}>
        <LoadingIndicator />
      </Show>

      <Show when={belongsToActiveConversation() && chatState.chatStatus.kind === 'streaming'}>
        <StreamingIndicator />
      </Show>

      <Show when={activeError()}>
        {(status) => (
          <ErrorMessage
            variant="error"
            title={status().error.message}
            message={status().error.detail}
          >
            <RetryButton onClick={retry} />
            <button type="button" onClick={dismissError}>
              Dismiss
            </button>
          </ErrorMessage>
        )}
      </Show>

      <Show when={belongsToActiveConversation() && chatState.chatStatus.kind === 'cancelled'}>
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
