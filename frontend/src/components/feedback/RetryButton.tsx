interface RetryButtonProps {
  onClick: () => void
  label?: string
  pending?: boolean
}

function RetryButton(props: RetryButtonProps) {
  return (
    <button
      type="button"
      class="retry-button"
      onClick={props.onClick}
      disabled={props.pending}
    >
      {props.pending ? 'Retrying...' : (props.label ?? 'Retry')}
    </button>
  )
}

export default RetryButton
