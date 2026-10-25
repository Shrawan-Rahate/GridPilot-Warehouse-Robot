import { useMemo, useState } from 'react'
import { GitCompareArrows, Play } from 'lucide-react'
import { bfs } from '../algorithms/bfs.js'
import { dfs } from '../algorithms/dfs.js'
import { snapshotWorld } from '../algorithms/gridUtils.js'

/**
 * ComparisonPanel — BFS vs DFS head-to-head on the CURRENT frozen layout.
 * Both engines run synchronously on exactly the same immutable snapshot,
 * so any difference comes from the algorithm, not from different maps.
 *
 * Timing honesty: wall-clock times in a browser vary between runs and
 * machines; they are shown raw but never used to claim a winner. Explored
 * nodes is the deterministic metric and drives the bar visual.
 */
export default function ComparisonPanel({ world }) {
  const [comparison, setComparison] = useState(null)

  function runComparison() {
    const snapshot = snapshotWorld(world) // identical input for both engines
    const bfsResult = bfs(snapshot)
    const dfsResult = dfs(snapshot)
    setComparison({ bfsResult, dfsResult })
  }

  const maxExplored = useMemo(() => {
    if (!comparison) return 0
    return Math.max(1, comparison.bfsResult.nodesVisited, comparison.dfsResult.nodesVisited)
  }, [comparison])

  return (
    <section className="control-group" aria-label="BFS vs DFS comparison">
      <p className="group-title">
        <GitCompareArrows size={11} style={{ verticalAlign: -1 }} aria-hidden="true" /> BFS vs DFS Comparison
      </p>

      <div className="compare-btn-row">
        <button className="btn btn--primary" onClick={runComparison}>
          <Play className="btn__icon" aria-hidden="true" />
          Compare on this layout
        </button>
      </div>

      {!comparison && (
        <p className="compare-note">
          Runs both engines instantly (without animation) on the exact same grid snapshot.
        </p>
      )}

      {comparison && (
        <>
          <div className="compare-cols">
            <CompareCol
              name="BFS"
              cls="bfs"
              result={comparison.bfsResult}
              maxExplored={maxExplored}
              optimality="Shortest-path guaranteed (unweighted)"
            />
            <CompareCol
              name="DFS"
              cls="dfs"
              result={comparison.dfsResult}
              maxExplored={maxExplored}
              optimality="Valid path, length not optimal"
            />
          </div>

          <p className="compare-note">
            <b>Why?</b> BFS's FIFO queue drains cells in non-decreasing distance order, so the target
            is first reached via the fewest moves. DFS's LIFO stack follows one deep branch and
            accepts the first route it stumbles upon. Same O(V + E) complexity — different routes and
            explored counts. Wall-clock timings vary between runs: treat them as indicative only.
          </p>
        </>
      )}
    </section>
  )
}

function CompareCol({ name, cls, result, maxExplored, optimality }) {
  const pct = maxExplored ? (result.nodesVisited / maxExplored) * 100 : 0
  return (
    <div className="compare-col">
      <p className={`compare-col__title compare-col__title--${cls}`}>{name}</p>
      <div>
        <CompareMetric label="Path found" value={result.found ? (result.pathMoves === 0 ? 'Yes (already there)' : `Yes · ${result.pathMoves} moves`) : 'No'} />
        <CompareMetric label="Path length" value={result.found ? `${result.pathMoves}` : '—'} />
        <CompareMetric label="Explored nodes" value={String(result.nodesVisited)} />
        <div className="compare-bar" aria-hidden="true">
          <div className={`compare-bar__fill compare-bar__fill--${cls}`} style={{ width: `${pct}%` }} />
        </div>
        <CompareMetric label="Compute time" value={`${result.elapsedTime.toFixed(2)} ms`} />
        <CompareMetric label="Time / space" value="O(V+E) / O(V)" />
      </div>
      <p className="compare-note" style={{ marginTop: 0 }}>{optimality}</p>
    </div>
  )
}

function CompareMetric({ label, value }) {
  return (
    <p className="compare-metric">
      <span>{label}</span>
      <b>{value}</b>
    </p>
  )
}
