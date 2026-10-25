/**
 * worldOps.js — pure (immutable) editing operations on the world model.
 * Every function returns a NEW world object; the previous one is untouched,
 * which keeps React state updates predictable and undo-friendly.
 */
import { EMPTY, WALL, createWorld, idx, inBounds } from '../algorithms/gridUtils.js'

/** Copy walls + endpoints into a fresh world object. */
function cloneWorld(world) {
  return {
    rows: world.rows,
    cols: world.cols,
    walls: world.walls.slice(),
    start: { ...world.start },
    target: { ...world.target },
  }
}

export function paintWall(world, r, c) {
  if (!inBounds(world, r, c)) return world
  if ((r === world.start.r && c === world.start.c) || (r === world.target.r && c === world.target.c)) {
    return world // never bury the robot or the destination
  }
  const next = cloneWorld(world)
  next.walls[idx(world, r, c)] = WALL
  return next
}

export function eraseCell(world, r, c) {
  if (!inBounds(world, r, c)) return world
  const next = cloneWorld(world)
  next.walls[idx(world, r, c)] = EMPTY
  return next
}

/** Relocate the robot; swapping with the target keeps both endpoints valid. */
export function moveStart(world, r, c) {
  if (!inBounds(world, r, c)) return world
  const next = cloneWorld(world)
  if (r === next.target.r && c === next.target.c) next.target = { ...next.start }
  next.start = { r, c }
  // The robot always sits on free floor — clear any shelf under it.
  next.walls[idx(next, next.start.r, next.start.c)] = EMPTY
  return next
}

export function moveTarget(world, r, c) {
  if (!inBounds(world, r, c)) return world
  const next = cloneWorld(world)
  if (r === next.start.r && c === next.start.c) next.start = { ...next.target }
  next.target = { r, c }
  // The destination always sits on free floor — clear any shelf under it.
  next.walls[idx(next, next.target.r, next.target.c)] = EMPTY
  return next
}

/** Walls only: the robot / destination always sit on free floor. */
export function clearWalls(world) {
  const next = createWorld(world.rows, world.cols)
  next.start = { ...world.start }
  next.target = { ...world.target }
  return next
}

/** Random shelves (default 28% density) that respect robot and destination. */
export function randomizeWalls(world, density = 0.28) {
  const next = cloneWorld(world)
  next.walls = new Uint8Array(world.rows * world.cols)
  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      const isEndpoint = (r === world.start.r && c === world.start.c) || (r === world.target.r && c === world.target.c)
      if (!isEndpoint && Math.random() < density) next.walls[idx(world, r, c)] = WALL
    }
  }
  return next
}

/**
 * Replace the whole world while stamping preset/robot data safely.
 * `data` may contain rows, cols, walls, start, target.
 */
export function adoptWorld(data) {
  const rows = data.rows
  const cols = data.cols
  const walls = new Uint8Array(data.walls) // copy in case a preset reused its buffer
  // Ensure the endpoints are floor.
  walls[data.start.r * cols + data.start.c] = EMPTY
  walls[data.target.r * cols + data.target.c] = EMPTY
  return { rows, cols, walls, start: { ...data.start }, target: { ...data.target } }
}

/** Resize while keeping walls that still fit and clamping the endpoints. */
export function resizeWorld(world, size) {
  if (size === world.rows && size === world.cols) return world
  const next = createWorld(size, size)
  const clamp = (v) => Math.max(0, Math.min(size - 1, v))
  next.start = { r: clamp(world.start.r), c: clamp(world.start.c) }
  next.target = { r: clamp(world.target.r), c: clamp(world.target.c) }
  const limit = Math.min(size, world.rows)
  for (let r = 0; r < limit; r++) {
    for (let c = 0; c < size && c < world.cols; c++) {
      if (world.walls[r * world.cols + c] === WALL && !isEndpoint(next, r, c)) {
        next.walls[idx(next, r, c)] = WALL
      }
    }
  }
  return next
}

function isEndpoint(world, r, c) {
  return (r === world.start.r && c === world.start.c) || (r === world.target.r && c === world.target.c)
}
