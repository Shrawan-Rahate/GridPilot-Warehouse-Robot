import { Footprints, Radar, Route, Timer } from 'lucide-react'
import { coordLabel } from '../algorithms/gridUtils.js'

/**
 * InsightsPanel — live algorithm telemetry + narration + structure state.
 * All numbers come straight from the engine result; nothing is faked.
 */
export default function InsightsPanel({
  algorithm,
  world,
  result,
  simStatus,
  cursor,
}) {
  const hasResult = Boolean(result)
  const steps = result ? result.animationSteps : []

  return (
    <section className="pane pane--scroll" aria-label="Algorithm insights">
      <div className="pane__header">
        <h2 className="pane__title">Algorithm Insights</h2>
      </div>

      <div className="pane__body">
        {/* Header info */}
        <div>
          <p style={{ margin: '0 0 2px', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal)', fontWeight: 600 }}>
            {algorithm.name}
          </p>
          <p className="hint" style={{ margin: 0 }}>
            {algorithm.timeComplexity} time · {algorithm.spaceComplexity} space
          </p>
        </div>

        {/* Status strip */}
        {hasResult && (
          <StatusStrip result={result} simStatus={simStatus} />
        )}

        {/* Statistics */}
        <div className="stat-grid">
          <StatCard icon={Radar} label="Nodes visited" value={hasResult ? result.nodesVisited : '—'} />
          <StatCard
            icon={Route}
            label="Path length"
            value={hasResult ? (result.found ? `${result.pathMoves} moves` : '—') : '—'}
            em={hasResult && result.found}
          />
          <StatCard
            icon={Footprints}
            label="Trace steps"
            value={hasResult ? steps.length : '—'}
          />
          <StatCard
            icon={Timer}
            label="Compute time"
            value={hasResult ? `${result.elapsedTime.toFixed(2)} ms` : '—'}
          />
        </div>

        {/* Complexity chips */}
        <div className="complexity">
          <span>
            Time
            <b>{algorithm.timeComplexity}</b>
          </span>
          <span>
            Space
            <b>{algorithm.spaceComplexity}</b>
          </span>
        </div>

        {/* Live narration */}
        <div>
          <p className="group-title" style={{ margin: '0 0 6px' }}>
            What is happening
          </p>
          <div className="narration" aria-live="polite">
            <Narration algorithm={algorithm} world={world} result={result} simStatus={simStatus} cursor={cursor} />
          </div>
        </div>

        {/* Structure visualisation (queue / stack / recursion path) */}
        <StructureVis result={result} world={world} cursor={cursor} hasResult={hasResult} steps={steps} />

        {/* Honest note about optimality claims */}
        <p className="compare-note">
          {result && result.found && !result.limitReached
            ? algorithm.key === 'bfs'
              ? 'BFS guarantees this is a shortest path in moves on an unweighted grid.'
              : 'This route is valid. For BFS and DFS, compute time varies run to run and machine to machine — treat timings as indicative, not as proof one algorithm is faster.'
            : 'Timings are measured in the browser and can vary between runs and machines. They are not a benchmark.'}
          {result && result.limitReached &&
            ' This backtracking run stopped at its exploration limit — no completeness or optimality claim is made.'}
        </p>
      </div>
    </section>
  )
}

function StatCard({ icon: Icon, label, value, em = false }) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">
        <Icon size={10} style={{ verticalAlign: -1, marginRight: 4 }} aria-hidden="true" />
        {label}
      </p>
      <p className={`stat-card__value ${em ? 'stat-card__value--em' : ''}`}>{value}</p>
    </div>
  )
}

function StatusStrip({ result, simStatus }) {
  let cls = 'message-strip message-strip--warn'
  let text = result.message ?? ''
  if (result.limitReached) {
    cls = 'message-strip message-strip--warn'
    text = 'Limit Reached — search stopped early'
  } else if (result.found) {
    cls = 'message-strip message-strip--ok'
    if (result.pathMoves === 0) text = 'Path Found — the robot is already at the destination'
  } else {
    cls = 'message-strip message-strip--bad'
    text = 'No Path — destination is unreachable'
  }
  return (
    <div className={cls} role="status">
      {text} {simStatus === 'paused' ? '· paused' : ''}
    </div>
  )
}

/** Live narration derived from the current trace position. */
function Narration({ algorithm, world, result, simStatus, cursor }) {
  const startMessage = (
    <>Draw shelves with the tools on the left, choose {algorithm.name} in the algorithm list, then press <b>Start</b> to watch the search expand from the robot to the destination.</>
  )

  if (!result || result.animationSteps.length === 0) {
    return startMessage
  }
  const steps = result.animationSteps

  // Cursor 0 (trace computed, playback not yet advanced) is a legal state —
  // a previous version read steps[-1] here and crashed, blanking the app.
  if (cursor <= 0) {
    return startMessage
  }
  if (cursor >= steps.length) {
    const where = result.found ? 'reaches the destination' : 'drains its structure without reaching the destination'
    return (
      <>{result.nodesVisited} cell(s) visited. The search {where}. The route (if any) is reconstructed by walking the <b>parent links</b> from the destination back to the robot.</>
    )
  }
  const step = steps[cursor - 1]
  if (!step) return startMessage
  const label = coordLabel(world, step.index)
  if (step.type === 'backtrack') {
    return (
      <>Dead end at <b>{label}</b> — removing it from the current path and retreating to try the next option (unmark cell).</>
    )
  }
  if (result.structureLabel.includes('Queue')) {
    return (
      <>Dequeued <b>{label}</b> (front of the queue) and discovered {step.frontier?.length ?? 0} new neighbour(s). Cells waiting: {step.structure?.length ?? 0}.</>
    )
  }
  if (result.structureLabel.includes('Stack')) {
    return (
      <>Popped <b>{label}</b> (top of the stack) and pushed its unvisited neighbours. The stack dives deeper before widening.</>
    )
  }
  return (
    <>Extending the current route into <b>{label}</b> (depth {step.structure?.length ?? 0}).</>
  )
}

/** Queue / stack / recursion-path chips for the current trace position. */
function StructureVis({ result, world, cursor, hasResult, steps }) {
  if (!hasResult) {
    return (
      <div className="structure-viz">
        <p className="group-title" style={{ margin: 0 }}>Data-structure state</p>
        <p className="hint" style={{ margin: 0 }}>
          Runs show the live queue (BFS) or stack (DFS) contents here, step by step.
        </p>
      </div>
    )
  }

  const visible = steps.slice(0, Math.min(cursor, steps.length))
  const step = visible[visible.length - 1]
  const structure = step && Array.isArray(step.structure) ? step.structure : []

  return (
    <div className="structure-viz">
      <p className="group-title" style={{ margin: 0 }}>{result.structureLabel}</p>
      <div className="structure-track" aria-label="Current data-structure contents">
        {structure.length === 0 && <span className="hint">(empty)</span>}
        {structure.slice(0, 12).map((index, i) => (
          <span key={`${index}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {i > 0 && <span className="structure-arrow">←</span>}
            <span
              className={`structure-chip ${i === 0 && result.algorithmName === 'DFS' ? 'structure-chip--head' : ''}`}
            >
              {coordLabel(world, index)}
            </span>
          </span>
        ))}
        {structure.length > 12 && (
          <span className="structure-meta">+{structure.length - 12} more</span>
        )}
      </div>
      <p className="structure-meta">
        {result.algorithmName === 'BFS' && 'Front of the queue is highlighted — FIFO order.'}
        {result.algorithmName === 'DFS' && 'Top of the stack is highlighted — LIFO order.'}
        {result.algorithmName !== 'BFS' && result.algorithmName !== 'DFS' && 'Cells on the recursion path, in order.'}
      </p>
    </div>
  )
}
