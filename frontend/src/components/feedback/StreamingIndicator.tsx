interface StreamingIndicatorProps {
  /** Render only the blinking cursor, for appending inline after streamed text. */
  cursorOnly?: boolean
}

function StreamingIndicator(props: StreamingIndicatorProps) {
  if (props.cursorOnly) {
    return (
      <span class="streaming-cursor" aria-hidden="true">
        ▍
      </span>
    )
  }

  return (
    <div class="streaming-indicator" role="status" aria-live="polite">
      <span class="streaming-indicator__label">Generating...</span>
      <span class="streaming-cursor" aria-hidden="true">
        ▍
      </span>
    </div>
  )
}

export default StreamingIndicator
