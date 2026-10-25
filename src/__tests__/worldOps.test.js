import { describe, it, expect } from 'vitest'
import {
  paintWall,
  eraseCell,
  moveStart,
  moveTarget,
  clearWalls,
  randomizeWalls,
  resizeWorld,
  adoptWorld,
} from '../utils/worldOps.js'
import { createWorld, idx } from '../algorithms/gridUtils.js'
import { bfs } from '../algorithms/bfs.js'

describe('world editing operations', () => {
  it('never places a shelf on the robot or the destination', () => {
    const world = createWorld(5, 5)
    const walled = paintWall(world, world.start.r, world.start.c)
    expect(walled.walls[idx(world, world.start.r, world.start.c)]).toBe(0)
    const walled2 = paintWall(walled, world.target.r, world.target.c)
    expect(walled2.walls[idx(world, world.target.r, world.target.c)]).toBe(0)
  })

  it('moving the robot onto a shelf clears the shelf (floor stays traversable)', () => {
    let world = createWorld(5, 5)
    world = paintWall(world, 2, 0)
    const moved = moveStart(world, 2, 0)
    expect(moved.start).toEqual({ r: 2, c: 0 })
    expect(moved.walls[idx(world, 2, 0)]).toBe(0)
  })

  it('moving the destination onto a shelf clears the shelf and keeps it reachable', () => {
    let world = createWorld(5, 5)
    world = paintWall(world, 2, 0)
    const moved = moveTarget(world, 2, 0)
    expect(moved.target).toEqual({ r: 2, c: 0 })
    expect(moved.walls[idx(world, 2, 0)]).toBe(0)
    // Regression guard: a wall UNDER the target must never block entering it.
    expect(bfs({ ...moved, walls: moved.walls.slice() }).found).toBe(true)
  })

  it('robot and destination swap instead of co-locating', () => {
    let world = createWorld(5, 5)
    const oldStart = { ...world.start }
    const moved = moveStart(world, world.target.r, world.target.c)
    expect(moved.start).toEqual(world.target)
    expect(moved.target).toEqual(oldStart)
  })

  it('original world is untouched by every operation (immutability)', () => {
    const world = createWorld(6, 6)
    const wallsSnapshot = Array.from(world.walls)
    paintWall(world, 1, 1)
    eraseCell(world, 0, 0)
    moveStart(world, 2, 2)
    moveTarget(world, 3, 3)
    clearWalls(world)
    randomizeWalls(world)
    resizeWorld(world, 8)
    expect(Array.from(world.walls)).toEqual(wallsSnapshot)
    expect(world.start.r).toBe(3)
  })

  it('resize keeps fitting walls and reduces the grid honestly', () => {
    let world = createWorld(15, 15)
    world = paintWall(world, 4, 4)
    const small = resizeWorld(world, 8)
    expect(small.rows).toBe(8)
    expect(small.walls[idx(small, 4, 4)]).toBe(1)
    const emptyGrid = createWorld(2, 2) // not part of options; sanity only
    expect(emptyGrid.rows).toBe(2)
  })

  it('adoptWorld copies preset data and stamps endpoints free', () => {
    const data = {
      rows: 4,
      cols: 4,
      walls: Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      start: { r: 0, c: 0 },
      target: { r: 3, c: 3 },
    }
    const adopted = adoptWorld(data)
    expect(adopted.walls[idx(adopted, 0, 0)]).toBe(0)
  })
})
