/**
 * dfs.js — iterative Depth-First Search on the warehouse grid.
 *
 * Data structure: explicit LIFO Stack (see structure/Stack.js).
 * DFS dives along one branch as deep as possible, then backtracks implicitly
 * when the stack unwinds. Cycles are prevented with a visited array; cells
 * that sit on the stack but are already visited are skipped when popped.
 *
 * IMPORTANT (and stated honestly in the UI): DFS does NOT guarantee a
 * shortest path. It returns a VALID path if the target is reachable.
 *
 * Complexity: Time O(V + E), Space O(V).
 */
import { Stack } from './structure/Stack.js'
import { idx, neighbors4 } from './gridUtils.js'

export const DFS_NAME = 'DFS'

export function dfs(snapshot) {
  const startedAt = performance.now()

  const { rows, cols, walls, start, target } = snapshot
  const total = rows * cols
  const startIdx = rows === 0 ? -1 : idx(snapshot, start.r, start.c)
  const targetIdx = rows === 0 ? -1 : idx(snapshot, target.r, target.c)

  if (rows === 0) {
    return buildResult(false, [], [], [], 0, startedAt, 'Empty grid.')
  }

  if (startIdx === targetIdx && start.r === target.r && start.c === target.c) {
    // Edge case: start equals destination → trivial 0-move path.
    const steps = [
      { type: 'visit', index: startIdx, frontier: [], structure: [] },
    ]
    return buildResult(true, [startIdx], [startIdx], steps, 1, startedAt)
  }

  const visited = new Uint8Array(total)
  // Node counts for the results panel.
  const parent = new Int32Array(total).fill(-1)

  const stack = new Stack()
  stack.push(startIdx)

  const visitedOrder = []
  const animationSteps = []
  let nodesVisited = 0

  while (!stack.isEmpty()) {
    const current = stack.pop()

    // The same cell may be pushed several times; only the first pop expands it.
    if (visited[current]) continue
    visited[current] = 1
    visitedOrder.push(current)
    nodesVisited += 1

    // Cells still waiting on the stack = the DFS "frontier future".
    const structure = stackSnapshot(stack)
    animationSteps.push({
      type: 'visit',
      index: current,
      frontier: structure,
      structure,
    })

    if (current === targetIdx) {
      return buildResult(
        true,
        reconstructPath(parent, startIdx, targetIdx),
        visitedOrder,
        animationSteps,
        nodesVisited,
        startedAt
      )
    }

    // New neighbors are explored Up/Right/Down/Left priority-first, so they get
    // pushed in REVERSE order. This makes stack exploration deterministic.
    const neighbors = neighbors4(snapshot, current)
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i]
      if (!visited[neighbor] && walls[neighbor] !== 1) {
        // Parent recorded at push time → every popped cell knows its "discoverer".
        parent[neighbor] = current
        stack.push(neighbor)
      }
    }
  }

  return buildResult(
    false,
    [],
    visitedOrder,
    animationSteps,
    nodesVisited,
    startedAt,
    'No path: the stack emptied while the target was never visited.'
  )
}

/** Reused BFS logic conceptually — shared copy kept module-local for clarity. */
function reconstructPath(parent, startIdx, targetIdx) {
  const path = []
  let node = targetIdx
  for (let guard = 0; guard < parent.length && node !== -1; guard++) {
    path.push(node)
    if (node === startIdx) break
    node = parent[node]
  }
  if (path[path.length - 1] !== startIdx) return []
  return path.reverse()
}

/** Copy of stack contents, top first (top of stack is the next push target). */
function stackSnapshot(stack) {
  const items = stack._items
  const out = new Array(items.length)
  for (let i = 0; i < items.length; i++) out[i] = items[items.length - 1 - i]
  return out
}

function buildResult(found, path, visitedOrder, animationSteps, nodesVisited, startedAt, message) {
  return {
    algorithmName: DFS_NAME,
    found,
    path,
    visitedOrder,
    // DFS paths can be longer than the optimal route; never claim optimality.
    pathMoves: Math.max(0, path.length - 1),
    animationSteps,
    nodesVisited,
    elapsedTime: performance.now() - startedAt,
    limitReached: false,
    message:
      message ??
      (found
        ? 'Valid path found (not necessarily shortest) — DFS dives deep before trying alternatives.'
        : undefined),
    structureLabel: 'Stack (LIFO)',
  }
}
