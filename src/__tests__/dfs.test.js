import { describe, it, expect } from 'vitest'
import { dfs } from '../algorithms/dfs.js'
import { bfs } from '../algorithms/bfs.js'
import { snapshotWorld, idx } from '../algorithms/gridUtils.js'
import { makeWorld, pathIsValid, hasDuplicates } from './helpers.js'

const start = { r: 0, c: 0 }
const target = { r: 4, c: 4 }

describe('DFS (iterative, explicit stack)', () => {
  it('finds a valid path on an open grid (validity, not optimality)', () => {
    const world = makeWorld(5, 5, start, target)
    const result = dfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(pathIsValid(world, result.path)).toBe(true)
    expect(result.algorithmName).toBe('DFS')
  })

  it('reports no path when the target is unreachable', () => {
    const wallList = Array.from({ length: 5 }, (_, r) => [r, 3])
    const world = makeWorld(5, 5, { r: 0, c: 0 }, { r: 2, c: 4 }, wallList)
    const result = dfs(snapshotWorld(world))
    expect(result.found).toBe(false)
    expect(result.path).toEqual([])
    expect(result.message).toMatch(/stack emptied|No path/i)
  })

  it('respects obstacles: route cells are always free floor', () => {
    // Vertical shelf wall with the only gap at row 0.
    const wallList = [[1, 2], [2, 2], [3, 2], [4, 2]]
    const world = makeWorld(5, 5, { r: 0, c: 0 }, { r: 4, c: 4 }, wallList)
    const result = dfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(pathIsValid(world, result.path)).toBe(true)
  })

  it('handles start equal to destination', () => {
    const world = makeWorld(4, 4, { r: 1, c: 1 }, { r: 1, c: 1 })
    const result = dfs(snapshotWorld(world))
    expect(result.found).toBe(true)
    expect(result.pathMoves).toBe(0)
    expect(result.path).toEqual([idx(world, 1, 1)])
  })

  it('never terminates its trace with duplicates (visited discipline)', () => {
    const world = makeWorld(6, 6, start, target, [[2, 3], [3, 3]])
    const result = dfs(snapshotWorld(world))
    expect(hasDuplicates(result.visitedOrder)).toBe(false)
    expect(result.visitedOrder.length).toBe(result.nodesVisited)
  })

  it('undervalued neighbors are still all reachable: stack drains without loops on small grids', () => {
    const world = makeWorld(4, 4, { r: 0, c: 0 }, { r: 3, c: 3 })
    const result = dfs(snapshotWorld(world))
    // Terminates with a bounded trace; stack pushes are capped by 4*V.
    expect(result.animationSteps.length).toBeLessThanOrEqual(16)
    expect(result.found).toBe(true)
  })

  it('may return a longer route than BFS (documented, honest difference)', () => {
    // Open 6x6 grid, corner-to-centre. Our deterministic LIFO order (Up/Right/
    // Down/Left priority) spirals outward, so DFS reaches the target with a
    // wandering route while BFS takes the direct Manhattan route.
    const world = makeWorld(6, 6, { r: 0, c: 0 }, { r: 3, c: 3 })
    const bfsResult = bfs(snapshotWorld(world))
    const dfsResult = dfs(snapshotWorld(world))
    expect(bfsResult.found).toBe(true)
    expect(dfsResult.found).toBe(true)
    expect(pathIsValid(world, dfsResult.path)).toBe(true)
    // Manhattan distance for the shortest route:
    expect(bfsResult.pathMoves).toBe(6)
    // Parity sanity: every 4-move changes checker colour, (0,0) and (3,3) share it.
    expect(dfsResult.pathMoves % 2).toBe(0)
    expect(dfsResult.pathMoves).toBeGreaterThan(bfsResult.pathMoves)
  })

  it('parent-based reconstruction yields the same number of moves as trace length implies', () => {
    const world = makeWorld(5, 5, start, target)
    const result = dfs(snapshotWorld(world))
    expect(result.path.length - 1).toBe(result.pathMoves)
  })

  it('never mutates the snapshot (walls and endpoints unchanged)', () => {
    const world = makeWorld(6, 6, start, target, [[1, 2], [4, 4]], )
    const before = snapshotWorld(world)
    const wallsBefore = Array.from(before.walls)
    dfs(before)
    expect(Object.isFrozen(before)).toBe(true)
    expect(Array.from(before.walls)).toEqual(wallsBefore)
    expect(before.start.r).toBe(start.r)
    expect(before.target.c).toBe(target.c)
  })
})
