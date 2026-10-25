import { useCallback, useRef } from 'react'
import { Bot, Flag } from 'lucide-react'
/**
 * WarehouseGrid — the interactive board.
 *
 * STATE DERIVATION (kept out of the algorithm engine):
 *   wall > robot/destination > active route (amber) > current cell (bright
 *   teal) > frontier (teal) > visited (dim teal) > retracted (gray, seen
 *   only in backtracking) > plain floor.
 *
 * Editing: click or drag paints with the active tool. While a simulation is
 * RUNNING input is ignored (the user presses Pause / Clear Path first);
 * while PAUSED the first interaction cancels the run cleanly via onEdit.
 */
export default function WarehouseGrid({ world, tool, simStatus, result, cursor, onEdit }) {
  const draggingRef = useRef(false)
  const boardRef = useRef(null)

  const running = simStatus === 'running'

  /* ---- derive per-cell overlay classes from (result, cursor) ---- */
  const cellStates = deriveCellStates(result, cursor)

  function handleCellStart(r, c, e) {
    // Only the primary button / pen / finger starts an edit.
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (running) return
    // NOTE: no releasePointerCapture() call here — calling it on a pointer
    // that is not captured throws InvalidStateError in every real browser,
    // which previously aborted the handler BEFORE the edit was applied.
    // Implicit touch capture is fine: pointer events still bubble to the
    // board container's move handler below.
    draggingRef.current = true
    onEdit(tool, r, c)
  }

  const handleCellEnter = useCallback(
    (r, c) => {
      if (running || !draggingRef.current) return
      // Drag-painting only makes sense for wall/erase; robot & target are single click.
      if (tool === 'wall' || tool === 'erase') onEdit(tool, r, c)
    },
    [running, tool, onEdit]
  )

  /**
   * Touch drag support: mobile pointers never re-target pointerEnter events,
   * so we locate the cell from move coordinates instead (mouse uses the
   * cheaper per-cell enter handler above).
   */
  const handleBoardPointerMove = useCallback(
    (e) => {
      if (e.pointerType === 'mouse' || running || !draggingRef.current) return
      if (tool !== 'wall' && tool !== 'erase') return
      const rect = boardRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const col = Math.floor(((e.clientX - rect.left) / rect.width) * world.cols)
      const row = Math.floor(((e.clientY - rect.top) / rect.height) * world.rows)
      const clampedCol = Math.max(0, Math.min(world.cols - 1, col))
      const clampedRow = Math.max(0, Math.min(world.rows - 1, row))
      onEdit(tool, clampedRow, clampedCol)
    },
    [running, tool, world, onEdit]
  )

  const endDrag = useCallback(() => {
    draggingRef.current = false
  }, [])

  const isDraggingTool = tool === 'wall' || tool === 'erase'

  return (
    <section className="pane" aria-label="Warehouse grid">
      <div className="pane__header grid-toolbar">
        <h2 className="pane__title">Warehouse Grid — {world.rows} × {world.cols}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span className="grid-progress__label" aria-live="polite">
            {progressLabel(result, cursor, simStatus)}
          </span>
          <div className="grid-progress" aria-hidden="true">
            <div
              className="grid-progress__fill"
              style={{ width: `${progressPercent(result, cursor)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pane__body grid-stage">
        <div
          className="grid-frame"
          style={{ '--cols': world.cols, '--rows': world.rows }}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="grid-corner" aria-hidden="true" />
          <div className="grid-cols" aria-hidden="true">
            {Array.from({ length: world.cols }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <div className="grid-rows" aria-hidden="true">
            {Array.from({ length: world.rows }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>

          <div
            className="grid-board"
            ref={boardRef}
            data-testid="grid-board"
            role="grid"
            aria-label={`Warehouse grid ${world.rows} by ${world.cols}`}
            onPointerMove={handleBoardPointerMove}
          >
            {renderCells(world, cellStates, isDraggingTool, handleCellStart, handleCellEnter)}
          </div>
        </div>

        <Legend />
      </div>
    </section>
  )
}

/** One <div> per cell (a cell state, in deterministic order): */
function renderCells(world, cellStates, isDraggingTool, onStart, onEnter) {
  const cells = []
  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      const index = r * world.cols + c
      const isStart = world.start.r === r && world.start.c === c
      const isTarget = world.target.r === r && world.target.c === c
      const isWall = world.walls[index] === 1
      const classes = ['warehouse-cell']
      if (isDraggingTool) classes.push('warehouse-cell--dragging-tool')
      const overlay = cellStates.get(index)
      if (overlay) classes.push(`warehouse-cell--${overlay}`)
      // Painted walls come from the world model itself — without this, shelves
      // existed in data but were invisible on screen (the "no visible change" bug).
      if (isWall) classes.push('warehouse-cell--wall')
      if (isStart) classes.push('warehouse-cell--start')
      if (isTarget) classes.push('warehouse-cell--target')

      cells.push(
        <div
          key={index}
          className={classes.join(' ')}
          role="gridcell"
          aria-label={`R${r + 1}C${c + 1}${overlay ? `, ${overlay}` : ''}${isWall ? ', wall' : ''}${isStart ? ', robot' : ''}${isTarget ? ', destination' : ''}`}
          data-cell="1"
          onPointerDown={(e) => onStart(r, c, e)}
          onPointerEnter={() => onEnter(r, c)}
        >
          {isStart && <Bot aria-hidden="true" />}
          {isTarget && <Flag aria-hidden="true" />}
        </div>
      )
    }
  }
  return cells
}

/**
 * Rebuild the visible trace overlay for the current cursor in O(cursor).
 * Used by the animation engine view — no stored "hardcoded pictures".
 */
function deriveCellStates(result, cursor) {
  const map = new Map()
  if (!result) return map

  const steps = result.animationSteps
  const visible = steps.slice(0, cursor)

  for (const step of visible) {
    if (step.type === 'visit') {
      map.set(step.index, 'visited')
    } else if (step.type === 'enter') {
      map.set(step.index, 'path') // active route cell (backtracking)
    } else if (step.type === 'backtrack') {
      map.set(step.index, 'retracted') // unmarked dead end
    }
  }

  // Frontier = queued cells waiting for expansion at the latest step.
  const last = visible[visible.length - 1]
  if (last && Array.isArray(last.frontier)) {
    for (const index of last.frontier) {
      if (!map.has(index)) map.set(index, 'frontier')
    }
  }
  // Current exploration cell on top.
  if (last && (last.type === 'visit' || last.type === 'enter')) {
    map.set(last.index, 'current')
  }
  // Finished route: replace backtracking "path" markers with the real route,
  // and show the final reconstructed path for BFS/DFS once playback ends.
  if (result.found && cursor >= steps.length) {
    for (const index of result.path) map.set(index, 'path')
  }
  return map
}

function progressPercent(result, cursor) {
  if (!result || result.animationSteps.length === 0) return 0
  return Math.min(100, (cursor / result.animationSteps.length) * 100)
}

function progressLabel(result, cursor, simStatus) {
  if (!result) return 'Ready — press Start to simulate'
  const steps = result.animationSteps.length
  if (cursor >= steps && steps > 0) {
    if (result.found) {
      return result.limitReached
        ? `Route found after ${result.nodesVisited} branches (limit hit)`
        : `Route found — ${result.pathMoves} move${result.pathMoves === 1 ? '' : 's'}`
    }
    return result.limitReached ? 'Exploration limit reached' : 'No path exists'
  }
  return `Step ${cursor} / ${steps} · ${result.nodesVisited} nodes · ${simStatus}`
}

function Legend() {
  const items = [
    ['Robot (start)', 'var(--amber)'],
    ['Destination', 'var(--green)'],
    ['Shelf / obstacle', 'var(--wall)'],
    ['Visited', 'var(--teal-faint)'],
    ['Frontier', 'var(--teal-soft)'],
    ['Current cell', 'var(--teal-deep)'],
    ['Route / path', 'var(--amber-soft)'],
    ['Backtracked', 'rgba(100, 116, 139, 0.3)'],
  ]
  return (
    <div className="legend" aria-label="Cell colour legend">
      {items.map(([label, color]) => (
        <span className="legend__item" key={label}>
          <span className="legend__swatch" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}
