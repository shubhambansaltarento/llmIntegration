import { For } from 'solid-js'
import { createStore, produce } from 'solid-js/store'

export type ToastVariant = 'info' | 'error' | 'warning'

interface ToastEntry {
  id: string
  message: string
  variant: ToastVariant
}

const AUTO_DISMISS_MS = 4000

const [toasts, setToasts] = createStore<ToastEntry[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Ambient, self-dismissing notification - decoupled from the chat message
 * flow. Used for events worth surfacing immediately (connection dropped,
 * generation stopped, rate limited) alongside the persistent, actionable
 * <ErrorMessage /> banner in the conversation itself.
 */
export function showToast(message: string, variant: ToastVariant = 'info') {
  const id = crypto.randomUUID()

  setToasts(produce((current) => {
    current.push({ id, message, variant })
  }))

  const timer = setTimeout(() => dismissToast(id), AUTO_DISMISS_MS)
  timers.set(id, timer)
}

export function dismissToast(id: string) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }

  setToasts((current) => current.filter((toast) => toast.id !== id))
}

export function ToastViewport() {
  return (
    <div class="toast-viewport" aria-live="polite">
      <For each={toasts}>
        {(toast) => (
          <div
            class="toast"
            classList={{ [`toast--${toast.variant}`]: true }}
            onClick={() => dismissToast(toast.id)}
          >
            {toast.message}
          </div>
        )}
      </For>
    </div>
  )
}
