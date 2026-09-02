import type { JSX } from 'solid-js'

interface ErrorMessageProps {
  /** Visual tone - 'error' (red) for failures, 'cancelled' (neutral) for a stopped generation. */
  variant?: 'error' | 'cancelled'
  title: string
  message?: string
  /** Action buttons, e.g. <RetryButton /> + a Dismiss button, or a Continue button. */
  children?: JSX.Element
}

function ErrorMessage(props: ErrorMessageProps) {
  const variant = () => props.variant ?? 'error'

  return (
    <div
      class="error-message"
      classList={{ [`error-message--${variant()}`]: true }}
      role={variant() === 'error' ? 'alert' : 'status'}
    >
      <div class="error-message__body">
        <p class="error-message__title">{props.title}</p>
        {props.message && <p class="error-message__detail">{props.message}</p>}
      </div>
      {props.children && <div class="error-message__actions">{props.children}</div>}
    </div>
  )
}

export default ErrorMessage
