import { For } from 'solid-js'
import { contextState, addMockContextFile } from '../../stores/context.store'
import ContextFile from './ContextFile'

function ContextFileList() {
  return (
    <section class="context-file-list">
      <h3 class="context-file-list__heading">Context Files</h3>

      <ul class="context-file-list__items">
        <For
          each={contextState.files}
          fallback={<li class="context-file-list__empty">No context files</li>}
        >
          {(file) => <ContextFile file={file} />}
        </For>
      </ul>

      <button class="context-file-list__add" type="button" onClick={addMockContextFile}>
        + Add Context
      </button>
    </section>
  )
}

export default ContextFileList
