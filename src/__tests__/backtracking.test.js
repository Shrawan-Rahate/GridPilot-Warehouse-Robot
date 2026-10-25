import { describe, it, expect } from 'vitest'
import { backtracking } from '../algorithms/backtracking.js'
import { snapshotWorld, idx, cropWorld } from '../algorithms/gridUtils.js'
import { makeWorld, pathIsValid, hasDuplicates } from './helpers.js'
import { bfs } from '../algorithms/bfs.js'

const start = { r: 0, c: 0 }
const target = { r: 7, c: 7 }

describe('Recursive backtracking (extension)', () => {
  it('finds a valid route on an 8x8 open grid', () => {
    const world = makeWorld(8, 8, start, target)
    const result = backtracking(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(pathIsValid(world, result.path)).toBe(true)
    expect(result.algorithmName).toBe('Backtracking')
    expect(result.limitReached).toBe(false)
  })

  it('shows backtrack (unmark) events: some steps retreat', () => {
    // Row-0 dead-end pocket forces visible retreats before the D-branch wins.
    const wallList = Array.from({ length: 6 }, (_, i) => [1, 2 + i])
    const world = makeWorld(8, 8, start, { r: 4, c: 4 }, wallList)
    const result = backtracking(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(result.animationSteps.some((s) => s.type === 'backtrack')).toBe(true)
    // The final route equals the path still on the recursion when we succeed.
    expect(result.path[0]).toBe(idx(world, start.r, start.c))
    expect(result.path[result.path.length - 1]).toBe(idx(world, world.target.r, world.target.c))
  })

  it('stops at the exploration limit and never claims a path then', () => {
    // The spiral exploration of an open 8x8 reaches corner (7,7) on its 15th
    // enter, so a limit of 12 must stop the search first, with no path claim.
    const world = makeWorld(8, 8, start, target)
    const result = backtracking(snapshotWorld(world), { maxNodes: 12 })
    expect(result.limitReached).toBe(true)
    expect(result.found).toBe(false)
    expect(result.message).toMatch(/limit/i)
  })

  it('reports no path when every route is exhausted under a high enough limit', () => {
    // A width-1 corridor (single column) has no cycles: the search exhausts
    // every route after exactly 8 enters, well under the node limit, and the
    // sealed-off destination on the far side of the shelves is unreachable.
    const wallList = Array.from({ length: 8 }, (_, r) => [r, 1])
    const world = makeWorld(8, 8, start, { r: 7, c: 7 }, wallList)
    const result = backtracking(snapshotWorld(world), { maxNodes: 64 })
    expect(result.found).toBe(false)
    expect(result.limitReached).toBe(false)
    expect(result.message).toMatch(/no path/i)
  })

  it('handles start equals destination', () => {
    const world = makeWorld(8, 8, { r: 3, c: 3 }, { r: 3, c: 3 })
    const result = backtracking(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(result.pathMoves).toBe(0)
    expect(result.animationSteps.length).toBe(1)
  })

  it('each "enter" marks exactly once per route: enter steps are unique cells in any consecutive prefix', () => {
    const world = makeWorld(8, 8, start, target, [[1, 1], [2, 2], [3, 3]])
    const result = backtracking(snapshotWorld(world))
    const enters = result.animationSteps.filter((s) => s.type === 'enter').map((s) => s.index)
    expect(hasDuplicates(enters)).toBe(false)
  })

  it('found route is genuinely the route left on the path (mark/unmark correctness)', () => {
    const world = makeWorld(8, 8, start, target)
    const result = backtracking(snapshotWorld(world))
    // The structured "structure" of the final step is exactly the found path.
    const lastStep = result.animationSteps[result.animationSteps.length - 1]
    expect(lastStep.type).toBe('enter')
    expect(lastStep.structure).toEqual(result.path)
  })

  it('matches BFS validity on the same small maze (different optimality claims allowed)', () => {
    const world = makeWorld(8, 8, start, target, [[0, 6], [0, 7], [1, 7], [2, 7]])
    const bt = backtracking(snapshotWorld(world))
    const bfsResult = bfs(snapshotWorld(world))
    expect(bt.found).toBe(true)
    expect(pathIsValid(world, bt.path)).toBe(true)
    expect(pathIsValid(world, bfsResult.path)).toBe(true)
    // Only the BFS side may claim shortest-route behavior.
    expect(bt.pathMoves).toBeGreaterThanOrEqual(bfsResult.pathMoves)
  })

  it('never mutates the snapshot', () => {
    const world = makeWorld(8, 8, start, target, [[2, 2]])
    const before = snapshotWorld(world)
    const wallsBefore = Array.from(before.walls)
    backtracking(before, { maxNodes: 100 })
    expect(JSON.stringify(wallsBefore)).toBe(JSON.stringify(Array.from(before.walls)))
  })
})
