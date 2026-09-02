interface LoadingIndicatorProps {
  label?: string
}

function LoadingIndicator(props: LoadingIndicatorProps) {
  return (
    <div class="loading-indicator" role="status" aria-live="polite">
      <span class="loading-indicator__dots">
        <span />
        <span />
        <span />
      </span>
      <span class="loading-indicator__label">{props.label ?? 'AI is thinking...'}</span>
    </div>
  )
}

export default LoadingIndicator
