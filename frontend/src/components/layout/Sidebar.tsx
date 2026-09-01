import { createSignal, Show, For } from 'solid-js'
import {
  chatState,
  createConversation,
  selectConversation,
} from '../../stores/chat.store'

function Sidebar() {
  const [collapsed, setCollapsed] = createSignal(false)
  const [search, setSearch] = createSignal('')

  const filteredConversations = () =>
    chatState.conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(search().toLowerCase()),
    )

  return (
    <aside class="sidebar" classList={{ 'sidebar--collapsed': collapsed() }}>
      <div class="sidebar__top">
        <Show when={!collapsed()}>
          <h1 class="sidebar__title">AI Workspace</h1>
        </Show>
        <button
          class="sidebar__toggle"
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed() ? '»' : '«'}
        </button>
      </div>

      <Show when={!collapsed()}>
        <button
          class="sidebar__new-chat"
          type="button"
          onClick={() => createConversation()}
        >
          + New Chat
        </button>

        <input
          class="sidebar__search"
          type="text"
          placeholder="Search conversations"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />

        <ul class="sidebar__conversations">
          <For
            each={filteredConversations()}
            fallback={<li class="sidebar__empty">No conversations found</li>}
          >
            {(conversation) => (
              <li
                class="sidebar__conversation"
                classList={{
                  'sidebar__conversation--active':
                    conversation.id === chatState.activeConversationId,
                }}
                onClick={() => selectConversation(conversation.id)}
              >
                {conversation.title}
              </li>
            )}
          </For>
        </ul>

        <button class="sidebar__settings" type="button">
          Settings
        </button>
      </Show>
    </aside>
  )
}

export default Sidebar
