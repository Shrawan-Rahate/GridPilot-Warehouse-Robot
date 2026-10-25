/**
 * gridUtils.js — shared helpers for the warehouse grid "world".
 *
 * The world is a 2D grid represented implicitly as a graph:
 *   - every free cell is a vertex
 *   - four-directional adjacency (up / right / down / left) is the edge set
 *
 * Algorithms receive an immutable SNAPSHOT and must never mutate it.
 * Cell indexing is flattened to a single integer: index = row * cols + col,
 * which keeps the parent/visited arrays fast and viva-friendly.
 */

export const EMPTY = 0 // traversable floor
export const WALL = 1 // shelf / obstacle

// Movement is restricted to 4 directions, applied in a deterministic
// order (Up, Right, Down, Left) so DFS exploration is reproducible.
const NEIGHBOR_OFFSETS = [
  { dr: -1, dc: 0, name: 'up' },
  { dr: 0, dc: 1, name: 'right' },
  { dr: 1, dc: 0, name: 'down' },
  { dr: 0, dc: -1, name: 'left' },
]

export function createWorld(rows, cols) {
  return {
    rows,
    cols,
    walls: new Uint8Array(rows * cols), // all free by default
    start: { r: Math.floor(rows / 2), c: 1 },
    target: { r: Math.floor(rows / 2), c: cols - 2 },
  }
}

export function indexToRC(world, index) {
  return { r: Math.floor(index / world.cols), c: index % world.cols }
}

/** Flat index for a (row, col) position. */
export function idx(world, r, c) {
  return r * world.cols + c
}

/** True when the position lies inside the grid boundaries. */
export function inBounds(world, r, c) {
  return r >= 0 && c >= 0 && r < world.rows && c < world.cols
}

/** Up to 4 in-bounds neighbor indices in deterministic U/R/D/L order. */
export function neighbors4(world, index) {
  const { r, c } = indexToRC(world, index)
  const result = []
  for (const { dr, dc } of NEIGHBOR_OFFSETS) {
    const nr = r + dr
    const nc = c + dc
    if (inBounds(world, nr, nc)) {
      result.push(idx(world, nr, nc))
    }
  }
  return result
}

/**
 * Build a deep, frozen snapshot of the world for the algorithm engine.
 * Algorithms read this and must not mutate it (tested in the test suite).
 */
export function snapshotWorld(world) {
  const snapshot = {
    rows: world.rows,
    cols: world.cols,
    walls: world.walls.slice(),
    start: { ...world.start },
    target: { ...world.target },
  }
  deepFreeze(snapshot)
  return snapshot
}

function deepFreeze(obj) {
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    // Typed array views (Uint8Array etc.) cannot be frozen per spec —
    // the immutable-snapshot contract covers them via .slice() copies.
    if (value && typeof value === 'object' && !ArrayBuffer.isView(value)) deepFreeze(value)
  }
  return Object.freeze(obj)
}

/** Human readable (row, col) label used in panels and logs. */
export function coordLabel(world, index) {
  const { r, c } = indexToRC(world, index)
  return `R${r + 1}C${c + 1}`
}

/**
 * Crop the world to (size x size) keeping the top-left region. Used when
 * the backtracking mode restricts the grid to at most 8 x 8 cells.
 */
export function cropWorld(world, size) {
  if (world.rows <= size && world.cols <= size) return world
  const walls = new Uint8Array(size * size)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      walls[r * size + c] = world.walls[r * world.cols + c]
    }
  }
  const clamp = (v) => Math.max(0, Math.min(size - 1, v))
  const start = { r: clamp(world.start.r), c: clamp(world.start.c) }
  const target = { r: clamp(world.target.r), c: clamp(world.target.c) }
  // A clamped endpoint may land on a wall — clear it so the world stays valid.
  walls[idx({ rows: size, cols: size }, start.r, start.c)] = EMPTY
  walls[idx({ rows: size, cols: size }, target.r, target.c)] = EMPTY
  return { rows: size, cols: size, walls, start, target }
}
