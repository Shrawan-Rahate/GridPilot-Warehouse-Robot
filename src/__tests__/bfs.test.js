import { describe, it, expect } from 'vitest'
import { bfs } from '../algorithms/bfs.js'
import { snapshotWorld, idx } from '../algorithms/gridUtils.js'
import { makeWorld, pathIsValid, hasDuplicates } from './helpers.js'

const start = { r: 0, c: 0 }
const target = { r: 4, c: 4 }

describe('BFS', () => {
  it('finds the shortest path on an open grid (Manhattan distance = moves)', () => {
    const world = makeWorld(5, 5, start, target)
    const result = bfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(result.pathMoves).toBe(8) // (4-0) + (4-0)
    expect(pathIsValid(world, result.path)).toBe(true)
    expect(result.algorithmName).toBe('BFS')
  })

  it('handles start equal to destination with a 0-move path', () => {
    const world = makeWorld(5, 5, { r: 2, c: 2 }, { r: 2, c: 2 })
    const result = bfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(result.pathMoves).toBe(0)
    expect(result.path).toEqual([idx(world, 2, 2)])
    expect(result.animationSteps.length).toBe(1)
  })

  it('handles directly adjacent start and destination', () => {
    const world = makeWorld(3, 3, { r: 1, c: 1 }, { r: 1, c: 2 })
    const result = bfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(result.pathMoves).toBe(1)
  })

  it('respects obstacles so the path never crosses a shelf', () => {
    // Vertical wall with a single gap at row 0 — the path must route through it.
    const wallList = []
    for (let r = 1; r < 5; r++) wallList.push([r, 2])
    const world = makeWorld(5, 5, { r: 0, c: 0 }, { r: 4, c: 4 }, wallList)
    const result = bfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(pathIsValid(world, result.path)).toBe(true)
  })

  it('reports no path when the destination is sealed off', () => {
    // Left of (2,2) walled by full barrier.
    const wallList = Array.from({ length: 5 }, (_, r) => [r, 3])
    const world = makeWorld(5, 5, { r: 0, c: 0 }, { r: 2, c: 4 }, wallList)
    const result = bfs(snapshotWorld(world))
    expect(result.found).toBe(false)
    expect(result.path).toEqual([])
    expect(result.pathMoves).toBe(0)
    expect(typeof result.message).toBe('string')
  })

  it('never visits a cell twice (visited-marking discipline)', () => {
    const world = makeWorld(6, 6, start, target)
    const result = bfs(snapshotWorld(world))
    expect(hasDuplicates(result.visitedOrder)).toBe(false)
    expect(result.nodesVisited).toBe(result.visitedOrder.length)
    // The trace mirrors the visit order exactly, starting at the robot.
    expect(result.animationSteps.map((s) => s.index)).toEqual(result.visitedOrder)
    expect(result.visitedOrder[0]).toBe(idx(world, start.r, start.c))
    expect(result.visitedOrder[result.visitedOrder.length - 1]).toBe(idx(world, target.r, target.c))
    // Cells may still wait in the queue when the target is dequeued; none repeat.
    expect(result.visitedOrder.length).toBeLessThanOrEqual(36)
  })

  it('records animation steps mirroring the visited order', () => {
    const world = makeWorld(5, 5, start, target)
    const result = bfs(snapshotWorld(world))
    expect(result.animationSteps.length).toBe(result.visitedOrder.length)
    expect(result.animationSteps[0].index).toBe(result.visitedOrder[0])
    // Every step carries its queue frontier snapshot.
    for (const step of result.animationSteps.slice(0, -1)) {
      expect(Array.isArray(step.frontier)).toBe(true)
      expect(step.structure).toBe(step.frontier)
    }
  })

  it('works on a completely empty smallest grid (8x8 corner to corner)', () => {
    const world = makeWorld(8, 8, { r: 0, c: 0 }, { r: 7, c: 7 })
    const result = bfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(result.pathMoves).toBe(14)
    expect(pathIsValid(world, result.path)).toBe(true)
  })

  it('is provably shortest by checking no shorter valid route exists', () => {
    // U-shaped detour: BFS must take the 10-move detour, not claim 8.
    const wallList = [
      [1, 1], [2, 1], [3, 1],
      [3, 2], [3, 3],
    ]
    const world = makeWorld(5, 5, { r: 0, c: 0 }, { r: 2, c: 3 }, wallList)
    const result = bfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    // Manual check: straight along row 0 then down column 3 — 5 moves,
    // equal to the Manhattan distance (no shorter route can exist).
    expect(result.pathMoves).toBe(5)
    expect(pathIsValid(world, result.path)).toBe(true)
  })

  it('never mutates the input snapshot', () => {
    const world = makeWorld(6, 6, start, target, [[1, 1], [2, 3]])
    const before = snapshotWorld(world)
    const wallsBefore = Array.from(before.walls)
    bfs(before)
    expect(Object.isFrozen(before)).toBe(true)
    expect(Array.from(before.walls)).toEqual(wallsBefore)
    expect(before.start).toEqual(start)
    expect(before.target).toEqual(target)
  })
})
