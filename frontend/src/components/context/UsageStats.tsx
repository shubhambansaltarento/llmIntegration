import { contextState } from '../../stores/context.store'

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

function UsageStats() {
  const totalTokens = () => contextState.usage.inputTokens + contextState.usage.outputTokens

  return (
    <section class="usage-stats">
      <h3 class="usage-stats__heading">Usage</h3>

      <dl class="usage-stats__list">
        <div class="usage-stats__row">
          <dt>Input tokens</dt>
          <dd>{contextState.usage.inputTokens.toLocaleString()}</dd>
        </div>
        <div class="usage-stats__row">
          <dt>Output tokens</dt>
          <dd>{contextState.usage.outputTokens.toLocaleString()}</dd>
        </div>
        <div class="usage-stats__row">
          <dt>Total tokens</dt>
          <dd>{totalTokens().toLocaleString()}</dd>
        </div>
        <div class="usage-stats__row">
          <dt>Estimated cost</dt>
          <dd>{formatCost(contextState.usage.estimatedCostUsd)}</dd>
        </div>
      </dl>
    </section>
  )
}

export default UsageStats
