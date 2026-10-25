/**
 * bfs.js — Breadth-First Search on the warehouse grid.
 *
 * Data structure: explicit FIFO Queue (head-index based, see structure/Queue.js).
 * Guarantee: on an unweighted graph like this grid, BFS discovers cells in
 * non-decreasing distance order, so the first time the target is dequeued
 * the recorded path is a SHORTEST path (minimum number of moves).
 *
 * Complexity: Time O(V + E), Space O(V). On a grid, E ≤ 4V so this is O(V).
 *
 * Contract:
 *  - Input: an immutable snapshot from algorithms.snapshotWorld().
 *  - Output: a structured result with trace data for the animation engine.
 *  - The snapshot is NEVER mutated (verified by tests).
 */
import { Queue } from './structure/Queue.js'
import { idx, neighbors4 } from './gridUtils.js'

export const BFS_NAME = 'BFS'

export function bfs(snapshot) {
  const startedAt = performance.now()

  const { rows, cols, walls, start, target } = snapshot
  const total = rows * cols
  const startIdx = rows === 0 ? -1 : idx(snapshot, start.r, start.c)
  const targetIdx = rows === 0 ? -1 : idx(snapshot, target.r, target.c)

  // visited[i] = 1 once the cell has been discovered (enqueued) once.
  // Marking on enqueue (not dequeue) keeps the queue free of duplicates.
  const visited = new Uint8Array(total)
  // parent[i] stores the predecessor of cell i in the BFS tree;
  // used later to reconstruct the path back to the start.
  const parent = new Int32Array(total).fill(-1)

  const visitedOrder = [] // final visit order (animation trace)
  const animationSteps = [] // one entry per dequeued cell

  // Node count for the results panel (visited cells in final traversal).
  let nodesVisited = 0

  const path = reconstructTrivialPath(startIdx, targetIdx, start, target)
  if (path) {
    // Edge case handled: start position IS the destination → 0 moves.
    visited[startIdx] = 1
    visitedOrder.push(startIdx)
    nodesVisited = 1
    animationSteps.push({
      type: 'visit',
      index: startIdx,
      frontier: [],
      structure: [],
    })
    return buildResult(true, path, visitedOrder, animationSteps, nodesVisited, startedAt)
  }

  const queue = new Queue()
  queue.enqueue(startIdx)
  visited[startIdx] = 1

  while (!queue.isEmpty()) {
    const current = queue.dequeue()

    visitedOrder.push(current)
    nodesVisited += 1
    const frontier = queueSnapshot(queue)
    animationSteps.push({
      type: 'visit',
      index: current,
      frontier, // cells discovered but not yet expanded
      structure: frontier, // live queue contents for the structure panel
    })

    if (current === targetIdx) {
      // BFS dequeues in distance order → first dequeue of target is optimal.
      return buildResult(
        true,
        reconstructPath(parent, startIdx, targetIdx),
        visitedOrder,
        animationSteps,
        nodesVisited,
        startedAt
      )
    }

    // Expand neighbors in deterministic Up/Right/Down/Left order.
    for (const neighbor of neighbors4(snapshot, current)) {
      if (!visited[neighbor] && walls[neighbor] !== 1) {
        visited[neighbor] = 1
        parent[neighbor] = current
        queue.enqueue(neighbor)
      }
    }
  }

  // Queue drained without meeting the target → destination unreachable.
  return buildResult(
    false,
    [],
    visitedOrder,
    animationSteps,
    nodesVisited,
    startedAt,
    'No path: the queue emptied while the target was never visited.'
  )
}

function reconstructTrivialPath(startIdx, targetIdx, start, target) {
  if (startIdx !== -1 && startIdx === targetIdx && start.r === target.r && start.c === target.c) {
    return [startIdx]
  }
  return null
}

/** Snapshot of queued cell indices, front → back. */
function queueSnapshot(queue) {
  // Queue compaction keeps head near zero, so a plain slice is cheap on small grids.
  const items = queue._items
  const head = queue._head
  const out = new Array(items.length - head)
  for (let i = head; i < items.length; i++) out[i - head] = items[i]
  return out
}

/** Walk parent links from target back to start, then reverse. */
export function reconstructPath(parent, startIdx, targetIdx) {
  const path = []
  let node = targetIdx
  // Guard ensures termination even if the parent array were inconsistent.
  for (let guard = 0; guard < parent.length && node !== -1; guard++) {
    path.push(node)
    if (node === startIdx) break
    node = parent[node]
  }
  if (path[path.length - 1] !== startIdx) return [] // cannot happen post-validation
  return path.reverse()
}

function buildResult(found, path, visitedOrder, animationSteps, nodesVisited, startedAt, message) {
  return {
    algorithmName: BFS_NAME,
    found,
    path, // array of cell indices from start to target (inclusive)
    visitedOrder, // cells in the order they were dequeued
    // Number of MOVES in the final route (path cells - 1). 0 when start == target.
    pathMoves: Math.max(0, path.length - 1),
    animationSteps,
    nodesVisited,
    elapsedTime: performance.now() - startedAt,
    limitReached: false,
    message:
      message ??
      (found
        ? 'Shortest path found — BFS explores in expanding rings of distance.'
        : undefined),
    structureLabel: 'Queue (FIFO)',
  }
}
