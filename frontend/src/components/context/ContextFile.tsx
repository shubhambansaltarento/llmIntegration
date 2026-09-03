import type { ContextFile as ContextFileEntry } from '../../types/context'
import { removeContextFile } from '../../stores/context.store'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

interface ContextFileProps {
  file: ContextFileEntry
}

function ContextFile(props: ContextFileProps) {
  return (
    <li class="context-file">
      <div class="context-file__info">
        <span class="context-file__name">{props.file.name}</span>
        <span class="context-file__meta">
          {props.file.type} · {formatFileSize(props.file.size)}
        </span>
      </div>
      <button
        class="context-file__remove"
        type="button"
        aria-label={`Remove ${props.file.name}`}
        onClick={() => removeContextFile(props.file.id)}
      >
        ×
      </button>
    </li>
  )
}

export default ContextFile
