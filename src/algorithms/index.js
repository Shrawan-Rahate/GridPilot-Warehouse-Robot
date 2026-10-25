/**
 * Registry of selectable search algorithms.
 * Order shown in the sidebar selector.
 */
import { BFS_NAME, bfs } from './bfs.js'
import { DFS_NAME, dfs } from './dfs.js'
import { BT_NAME, backtracking } from './backtracking.js'

export const ALGORITHMS = {
  bfs: {
    key: 'bfs',
    name: BFS_NAME,
    run: bfs,
    tagline: 'Queue-driven, guarantees the shortest route in moves',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    fullExplanation:
      'BFS expands outward from the robot in "rings": first all cells 1 move away, then 2 moves away, and so on. It keeps the waiting cells in a FIFO queue, so the first time the destination is dequeued the recorded route is guaranteed to have the minimum number of moves on this unweighted grid.',
  },
  dfs: {
    key: 'dfs',
    name: DFS_NAME,
    run: dfs,
    tagline: 'Stack-driven, dives deep and accepts the first valid route',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    fullExplanation:
      'DFS commits to one branch until it hits a dead end, then retreats by unwinding the stack. It is NOT guaranteed to find the shortest path — it shows clearly how structure order changes the route found.',
  },
  backtracking: {
    key: 'backtracking',
    name: BT_NAME,
    run: (snapshot, options) => backtracking(snapshot, options),
    tagline: 'Recursive search with mark/unmark retreat (8×8 max)',
    timeComplexity: 'Exponential worst case O(4^V)',
    spaceComplexity: 'O(V) recursion depth',
    fullExplanation:
      'Backtracking walks a route forward cell by cell, marking cells as part of the current route. At a dead end it UNMARKS the last cell (a visible backtrack event) and tries the next option. If the node limit is hit, no optimality claim is ever made.',
  },
}

export const ALGORITHM_KEYS = Object.keys(ALGORITHMS)

export function getAlgorithm(key) {
  return ALGORITHMS[key] ?? ALGORITHMS.bfs
}

export function runAlgorithm(key, snapshot, options) {
  const algo = getAlgorithm(key)
  const result = algo.run(snapshot, options)
  if (!result) {
    // Defensive: every algorithm must return a well-formed result object.
    return {
      algorithmName: algo.name,
      found: false,
      path: [],
      visitedOrder: [],
      pathMoves: 0,
      animationSteps: [],
      nodesVisited: 0,
      elapsedTime: 0,
      limitReached: false,
      message: 'Algorithm returned no result.',
      structureLabel: '',
    }
  }
  return result
}
