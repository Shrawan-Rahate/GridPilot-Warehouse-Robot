/** Shared test helpers for building small grid worlds. */
import { EMPTY, idx, createWorld } from '../algorithms/gridUtils.js'

export function makeWorld(rows, cols, start, target, wallList = []) {
  const world = createWorld(rows, cols)
  for (const [r, c] of wallList) world.walls[idx(world, r, c)] = 1
  world.start = { ...start }
  world.target = { ...target }
  world.walls[idx(world, start.r, start.c)] = EMPTY
  world.walls[idx(world, target.r, target.c)] = EMPTY
  return world
}

export function pathIsValid(world, path) {
  if (!Array.isArray(path) || path.length === 0) return false
  const startKey = idx(world, world.start.r, world.start.c)
  const targetKey = idx(world, world.target.r, world.target.c)
  if (path[0] !== startKey || path[path.length - 1] !== targetKey) return false
  const { cols } = world
  for (let i = 1; i < path.length; i++) {
    const [r1, c1] = [Math.floor(path[i - 1] / cols), path[i - 1] % cols]
    const [r2, c2] = [Math.floor(path[i] / cols), path[i] % cols]
    const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2)
    if (dist !== 1) return false // must move exactly one 4-direction step
    if (world.walls[path[i]] === 1 && path[i] !== targetKey) return false
  }
  for (let i = 1; i < path.length; i++) {
    if (world.walls[path[i]] === 1) return false
  }
  return true
}

export function hasDuplicates(list) {
  return new Set(list).size !== list.length
}
