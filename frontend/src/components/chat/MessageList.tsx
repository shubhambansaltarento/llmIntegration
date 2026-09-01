import { Show, For } from 'solid-js'
import { chatState } from '../../stores/chat.store'

function MessageList() {
  const activeConversation = () =>
    chatState.conversations.find(
      (conversation) => conversation.id === chatState.activeConversationId,
    )

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
              <p class="message__content">{message.content}</p>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

export default MessageList
