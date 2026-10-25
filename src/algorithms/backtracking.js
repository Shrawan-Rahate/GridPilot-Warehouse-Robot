/**
 * backtracking.js — recursive backtracking path search (extension demo).
 *
 * A plain recursive DFS path search that keeps the CURRENT ROUTE on an
 * explicit path stack. Forward exploration pushes cells ("enter" steps);
 * dead ends UNMARK the cell and record a "backtrack" step, so the animation
 * can show retreat events — something neither BFS nor mainstream DFS shows.
 *
 * WORST CASE is exponential in the number of open cells: backtracking may
 * re-explore the same cell along different simple paths (no global visited
 * set). To stay safe we:
 *   1. restrict the UI mode to small grids (8 x 8), and
 *   2. enforce a hard maxNodes exploration limit.
 * When the limit stops the search, the result is explicitly marked
 * "limit reached" — we never claim an optimal or even complete path then.
 */
import { idx, neighbors4 } from './gridUtils.js'

export const BT_NAME = 'Backtracking'

export function backtracking(snapshot, options = {}) {
  const maxNodes = options.maxNodes ?? 3000
  const startedAt = performance.now()

  const { rows, cols, walls, start, target } = snapshot
  const total = rows * cols
  const startIdx = rows === 0 ? -1 : idx(snapshot, start.r, start.c)
  const targetIdx = rows === 0 ? -1 : idx(snapshot, target.r, target.c)

  const visitedOrder = [] // sequence of forward enters (also counts recordings)
  const animationSteps = [] // enter + backtrack events for the animation

  // Cells on the CURRENT path (1) vs cells not on the path (0).
  const onPath = new Uint8Array(total)
  const currentPath = []
  let found = false
  let finalPath = []
  let nodesExplored = 0
  let limitReached = false

  if (rows === 0) {
    return buildResult(false, [], visitedOrder, animationSteps, 0, startedAt, false, 'Empty grid.')
  }

  if (startIdx === targetIdx && start.r === target.r && start.c === target.c) {
    visitedOrder.push(startIdx)
    animationSteps.push({ type: 'enter', index: startIdx, structure: [startIdx] })
    return buildResult(true, [startIdx], visitedOrder, animationSteps, 1, startedAt, false)
  }

  /**
   * Attempt to extend the current path from `current` so that it reaches
   * the target. Returns true only when the target is on the path.
   */
  function solve(current) {
    if (found || limitReached) return found

    if (nodesExplored >= maxNodes) {
      limitReached = true
      return false
    }
    nodesExplored += 1

    // FORWARD STEP: mark the cell as part of the current route.
    onPath[current] = 1
    currentPath.push(current)
    visitedOrder.push(current)
    animationSteps.push({
      type: 'enter',
      index: current,
      structure: [...currentPath],
    })

    if (current === targetIdx) {
      found = true
      finalPath = [...currentPath]
      return true // keep the route — do NOT unmark on success
    }

    for (const neighbor of neighbors4(snapshot, current)) {
      if (walls[neighbor] !== 1 && !onPath[neighbor]) {
        if (solve(neighbor)) return true
        if (found || limitReached) break
      }
    }

    // BACKTRACK STEP: this branch is a dead end — unmark and retreat.
    onPath[current] = 0
    currentPath.pop()
    animationSteps.push({
      type: 'backtrack',
      index: current,
      structure: [...currentPath],
    })
    return false
  }

  solve(startIdx)

  const message = found
    ? 'Route found by recursive backtracking (optimality not guaranteed).'
    : limitReached
      ? `Search stopped at the ${maxNodes}-node exploration limit — no conclusion about a path.`
      : 'Backtracking exhausted every lawful route: no path exists.'

  return buildResult(found, finalPath, visitedOrder, animationSteps, nodesExplored, startedAt, limitReached, message)
}

function buildResult(found, path, visitedOrder, animationSteps, nodesVisited, startedAt, limitReached, message) {
  return {
    algorithmName: BT_NAME,
    found,
    path,
    visitedOrder,
    pathMoves: Math.max(0, path.length - 1),
    animationSteps,
    nodesVisited,
    elapsedTime: performance.now() - startedAt,
    limitReached,
    message,
    structureLabel: 'Current path (recursion stack)',
  }
}
