import { describe, it, expect } from 'vitest'
import {
  createWorld,
  snapshotWorld,
  neighbors4,
  cropWorld,
  idx,
} from '../algorithms/gridUtils.js'
import { Queue } from '../algorithms/structure/Queue.js'
import { Stack } from '../algorithms/structure/Stack.js'
import { PRESETS } from '../scenarios/presets.js'
import { bfs } from '../algorithms/bfs.js'
import { dfs } from '../algorithms/dfs.js'

describe('grid utilities', () => {
  it('neighbors4 returns indices in Up / Right / Down / Left order', () => {
    const world = createWorld(5, 5)
    const center = idx(world, 2, 2)
    expect(neighbors4(world, center)).toEqual([
      idx(world, 1, 2), // up
      idx(world, 2, 3), // right
      idx(world, 3, 2), // down
      idx(world, 2, 1), // left
    ])
  })

  it('neighbors4 truncates gracefully at grid borders', () => {
    const world = createWorld(4, 4)
    const corner = idx(world, 0, 0)
    expect(neighbors4(world, corner)).toEqual([idx(world, 0, 1), idx(world, 1, 0)])
  })

  it('snapshotWorld deep-freezes so engines cannot mutate shared state', () => {
    const world = createWorld(5, 5)
    const snapshot = snapshotWorld(world)
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.start)).toBe(true)
  })

  it('cropWorld keeps walls and clamps endpoints into the smaller window', () => {
    const world = createWorld(15, 15)
    world.walls[idx(world, 3, 3)] = 1
    world.start = { r: 14, c: 14 }
    world.target = { r: 2, c: 2 }
    const cropped = cropWorld(world, 8)
    expect(cropped.rows).toBe(8)
    expect(cropped.walls[idx(cropped, 3, 3)]).toBe(1)
    expect(cropped.start).toEqual({ r: 7, c: 7 })
    expect(cropped.target).toEqual({ r: 2, c: 2 })
    // Clamped start that landed on a wall cell was cleared.
    expect(cropped.walls[idx(cropped, cropped.start.r, cropped.start.c)]).toBe(0)
  })
})

describe('Queue (FIFO, head-index)', () => {
  it('dequeues in arrival order and reports correct size', () => {
    const q = new Queue()
    q.enqueue('a')
    q.enqueue('b')
    q.enqueue('c')
    expect(q.size()).toBe(3)
    expect(q.dequeue()).toBe('a')
    expect(q.peek()).toBe('b')
    q.dequeue()
    q.enqueue('d')
    q.dequeue()
    expect(q.dequeue()).toBe('d')
    expect(q.isEmpty()).toBe(true)
  })

  it('survives heavy interleaving without losing items (head compaction)', () => {
    const q = new Queue()
    for (let i = 0; i < 200; i++) {
      q.enqueue(i)
      if (i % 3 === 0) q.dequeue()
    }
    expect(q.size()).toBe(200 - Math.ceil(200 / 3))
  })
})

describe('Stack (LIFO)', () => {
  it('pops the most recently pushed item', () => {
    const s = new Stack()
    s.push(1)
    s.push(2)
    expect(s.pop()).toBe(2)
    expect(s.pop()).toBe(1)
    expect(s.isEmpty()).toBe(true)
  })
})

describe('sample presets', () => {
  it('Easy and Complex presets have a reachable destination for BFS and DFS', () => {
    for (const key of ['easy', 'complex']) {
      const world = PRESETS[key].make()
      const snapshot = snapshotWorld(world)
      expect(bfs(snapshot).found).toBe(true)
      expect(dfs(snapshot).found).toBe(true)
    }
  })

  it('Complex preset: DFS route is never shorter than the BFS route', () => {
    const world = snapshotWorld(PRESETS.complex.make())
    const b = bfs(world)
    const d = dfs(world)
    expect(b.found).toBe(true)
    expect(d.found).toBe(true)
    expect(d.pathMoves).toBeGreaterThanOrEqual(b.pathMoves)
  })

  it('Blocked preset is genuinely unreachable (clean No-Path demo)', () => {
    const world = snapshotWorld(PRESETS.blocked.make())
    expect(bfs(world).found).toBe(false)
    expect(dfs(world).found).toBe(false)
  })

  it('presets keep robot and destination on free floor', () => {
    for (const preset of Object.values(PRESETS)) {
      const world = preset.make()
      expect(world.walls[idx(world, world.start.r, world.start.c)]).toBe(0)
      expect(world.walls[idx(world, world.target.r, world.target.c)]).toBe(0)
    }
  })
})
