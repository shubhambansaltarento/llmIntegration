import { Show } from 'solid-js'
import { chatState, setInput, sendMessage, cancelGeneration } from '../../stores/chat.store'

function ChatInput() {
  const isBusy = () =>
    chatState.chatStatus.kind === 'thinking' || chatState.chatStatus.kind === 'streaming'

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    sendMessage(chatState.input)
  }

  return (
    <form class="chat-input" onSubmit={handleSubmit}>
      <input
        class="chat-input__field"
        type="text"
        placeholder="Message AI Workspace..."
        value={chatState.input}
        onInput={(event) => setInput(event.currentTarget.value)}
        disabled={isBusy()}
      />
      <Show
        when={isBusy()}
        fallback={
          <button class="chat-input__send" type="submit" disabled={!chatState.input.trim()}>
            Send tst
          </button>
        }
      >
        <button class="chat-input__stop" type="button" onClick={cancelGeneration}>
          Stop
        </button>
      </Show>
    </form>
  )
}

export default ChatInput
