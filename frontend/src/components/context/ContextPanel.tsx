import { createSignal, Show } from 'solid-js'
import ContextFileList from './ContextFileList'
import UsageStats from './UsageStats'

function ContextPanel() {
  const [collapsed, setCollapsed] = createSignal(false)

  return (
    <aside class="context-panel" classList={{ 'context-panel--collapsed': collapsed() }}>
      <div class="context-panel__top">
        <Show when={!collapsed()}>
          <h2 class="context-panel__title">Context</h2>
        </Show>
        <button
          class="context-panel__toggle"
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed() ? '«' : '»'}
        </button>
      </div>

      <Show when={!collapsed()}>
        <ContextFileList />
        <UsageStats />
      </Show>
    </aside>
  )
}

export default ContextPanel
