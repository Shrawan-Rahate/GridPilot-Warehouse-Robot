/**
 * presets.js — sample warehouse layouts used in demos.
 * Every preset is authored as a 15x15 grid. `r1..r3` style comments map to
 * row numbers (1-based) matching the row indicators shown on the UI grid.
 */

export const GRID_SIZE_OPTIONS = [8, 10, 12, 15, 20]

/** Coerce any custom feature list into safe bounds of the current grid. */
function stampWalls(rows, cols, wallList) {
  const walls = new Uint8Array(rows * cols)
  for (const [r, c] of wallList) {
    if (r >= 0 && c >= 0 && r < rows && c < cols) walls[r * cols + c] = 1
  }
  return walls
}

function build(rows, cols, start, target, wallList) {
  const walls = stampWalls(rows, cols, wallList)
  walls[start.r * cols + start.c] = 0
  walls[target.r * cols + target.c] = 0
  return { rows, cols, walls, start, target }
}

export const PRESETS = {
  easy: {
    key: 'easy',
    name: 'Easy Warehouse',
    description: 'A few shelf blocks. BFS and DFS both find short routes — a good first demo.',
    make() {
      const rows = 15
      const cols = 15
      return build(rows, cols, { r: 7, c: 1 }, { r: 7, c: 13 }, [
        // Two short shelf rows with wide gaps — a friendly maze.
        ...rect(4, 4, 7, 4),
        ...rect(4, 10, 7, 10),
        ...rect(1, 6, 4, 6),
        ...rect(10, 12, 4, 12),
      ])
    },
  },
  complex: {
    key: 'complex',
    name: 'Complex Warehouse',
    description: 'Dense shelving aisles. DFS visibly fails to travel the straight corridor — a great contrast demo.',
    make() {
      const rows = 15
      const cols = 15
      const wallList = []
      // Alternating vertical shelf walls with a serpentine corridor.
      for (let r = 0; r < 9; r++) wallList.push([r, 3])
      for (let r = 3; r < 15; r++) wallList.push([r, 5])
      for (let r = 2; r < 10; r++) wallList.push([r, 7])
      for (let r = 6; r < 13; r++) wallList.push([r, 9])
      for (let r = 0; r < 6; r++) wallList.push([r, 11])
      for (let r = 10; r < 15; r++) wallList.push([r, 13])
      // Isolated shelf clusters.
      wallList.push([1, 1], [1, 2], [12, 1], [13, 2], [3, 14], [10, 1])
      return build(rows, cols, { r: 0, c: 0 }, { r: 14, c: 14 }, wallList)
    },
  },
  blocked: {
    key: 'blocked',
    name: 'Blocked Destination',
    description: 'The target is sealed inside a shelf ring. Both algorithms must report "No path" cleanly.',
    make() {
      const rows = 15
      const cols = 15
      const wallList = []
      // A thick ring of shelves around the destination with NO gap.
      wallList.push([9, 12], [9, 13], [9, 14])
      wallList.push([11, 12], [11, 13], [11, 14])
      // Seal the ring: target sits at (10,14) on the last column, so the
      // left side (10,11), the gap column (10,13) must all be shelves.
      wallList.push([10, 11], [10, 13])
      // A short top divider and a long left divider for visual context.
      wallList.push([0, 6], [1, 6], [2, 6], [3, 6])
      wallList.push([6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5])
      return build(rows, cols, { r: 2, c: 2 }, { r: 10, c: 14 }, wallList)
    },
  },
}

/** Utility: produce [r, cTop..cBottom] pairs in a column segment. */
function rect(rTop, rBottom, cLeft, cRight) {
  const out = []
  for (let r = rTop; r <= rBottom; r++) {
    for (let c = cLeft; c <= cRight; c++) out.push([r, c])
  }
  return out
}
