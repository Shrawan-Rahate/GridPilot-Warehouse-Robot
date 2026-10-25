import { Bot, RotateCcw } from 'lucide-react'

function statusPillClass(simStatus, result) {
  if (simStatus === 'running') return 'status-pill status-pill--running'
  if (simStatus === 'paused') return 'status-pill status-pill--paused'
  if (result) {
    if (result.limitReached) return 'status-pill status-pill--paused'
    if (result.found) return 'status-pill status-pill--found'
    return 'status-pill status-pill--blocked'
  }
  return 'status-pill'
}

function statusText(simStatus, result) {
  if (simStatus === 'running') return 'Simulating'
  if (simStatus === 'paused') return 'Paused'
  if (result) {
    if (result.limitReached) return 'Limit Reached'
    if (result.found) return 'Path Found'
    return 'No Path'
  }
  if (simStatus === 'done') return 'Finished'
  return 'Idle'
}

export default function Header({ algorithmName, algorithmComplexity, simStatus, result, onClearPath }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__logo" aria-hidden="true">
          <Bot size={20} strokeWidth={1.8} />
        </div>
        <div>
          <div className="topbar__name">GridPilot</div>
          <div className="topbar__sub">Warehouse Navigation Lab</div>
        </div>
      </div>

      <div className="topbar__spacer" />

      <div className="topbar__meta">
        <span className="topbar__algo">{algorithmName}</span>
        <span
          className={statusPillClass(simStatus, result)}
          role="status"
          aria-live="polite"
        >
          <span className="status-pill__dot" />
          {statusText(simStatus, result)}
        </span>
        <span style={{ color: 'var(--fg-dim)' }}>{algorithmComplexity}</span>
      </div>

      <button
        className="btn btn--ghost"
        onClick={onClearPath}
        title="Clear the exploration overlay and restart from idle"
      >
        <RotateCcw className="btn__icon" aria-hidden="true" />
        Clear Path
      </button>
    </header>
  )
}
