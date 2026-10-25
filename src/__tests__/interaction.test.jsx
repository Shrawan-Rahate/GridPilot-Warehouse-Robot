// @vitest-environment jsdom
/**
 * Interaction regression suite — drive REAL DOM events (pointerdown,
 * pointerenter, clicks, select changes) through the full <App/> and assert
 * resulting UI STATE (cell classes, status strips, step counters), not just
 * markup existence.
 *
 * Concurrency: component tests run under jsdom; algorithm suites stay on node.
 *
 * NOTE: jsdom does not implement pointer capture spec behavior, so we polyfill
 * releasePointerCapture to match what real browsers (incl. Safari) do: THROW
 * when the element is not captured. This reproduces the original editing
 * failure at the real crash site.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from '../App.jsx'
import { SPEED_STEPS, DEFAULT_SPEED_INDEX } from '../animation/useSimulation.js'

// ---- Spec-conformant pointer-capture polyfill (browsers throw like this) ----
const originalRelease = Element.prototype.releasePointerCapture
Element.prototype.releasePointerCapture = function (pointerId) {
  throw new DOMException(
    'releasePointerCapture: InvalidStateError — SpecifiedPointerId / not captured',
    'InvalidStateError'
  )
}

const DEFAULT_DELAY = SPEED_STEPS[DEFAULT_SPEED_INDEX] // 140ms per step

beforeEach(() => {
  // Only fake the animation-loop APIs. Faking queueMicrotask / scheduler
  // internals (vitest's full default set) breaks React 18's act() flushing,
  // which silently swallows every state update the tests dispatch.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ---- helpers ---------------------------------------------------------------
/** Query a grid cell by the exact row/col digits of its aria-label ("R2C2", "R2C2, wall"…). */
function cellAt(r, c) {
  const prefix = `R${r + 1}C${c + 1}`
  const cells = screen.getAllByLabelText(
    (content) => typeof content === 'string' && (content === prefix || content.startsWith(`${prefix}, `))
  )
  expect(cells.length).toBe(1)
  return cells[0]
}

function classList(el) {
  return new Set(el.className.split(' '))
}

function countClasses(selector) {
  return document.querySelectorAll(selector).length
}

function visitedCount() {
  return countClasses('.warehouse-cell--visited')
}

function wallCount() {
  return countClasses('.warehouse-cell--wall')
}

function pathCount() {
  return countClasses('.warehouse-cell--path')
}

/** Find the live "Step n / m" label. */
function stepLabel() {
  const el = document.querySelector('.grid-progress__label')
  return el ? el.textContent : 'none'
}

function parseCursor(label) {
  const m = /Step (\d+) \/ (\d+)/.exec(label)
  return m ? Number(m[1]) : 0
}

/** Advance the playback clock inside act() so effects flush.
 * Chunked ≤100ms: long batched sinon advances interact badly with React's
 * effect cleanup/re-scheduling inside act (harness quirk); browsers use real
 * timers, so chunking here models the real pacing contract faithfully. */
function advance(ms) {
  let remaining = ms
  while (remaining > 0) {
    const chunk = Math.min(50, remaining)
    act(() => {
      vi.advanceTimersByTime(chunk)
    })
    remaining -= chunk
  }
}

/** Push the animation forward in exact timer ticks (avoids the batched
 * advance + act re-scheduling quirk; browsers behave like n real timers). */
function advanceTicks(n) {
  for (let i = 0; i < n; i++) {
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DELAY)
    })
  }
}

/** Drive the animation to (or beyond) its end. */
function runToCompletion(maxSteps = 260) {
  advanceTicks(maxSteps)
}

/** Every test ends by asserting the app is still mounted (never blank). */
function expectAppAlive() {
  expect(screen.getByText('GridPilot')).toBeTruthy()
  expect(screen.getByTestId('grid-board')).toBeTruthy()
}

// ---- static ids on the board for the blank check ---------------------------
// (added by the fix; see WarehouseGrid)
const appRender = () => render(React.createElement(App))

describe('grid editing interactions', () => {
  it('places a shelf when an empty cell is clicked in Shelves mode', () => {
    appRender()
    const cell = cellAt(1, 1) // R2C2, empty floor
    fireEvent.pointerDown(cell)
    expect(classList(cellAt(1, 1))).toContain('warehouse-cell--wall')
    expect(cellAt(1, 1).getAttribute('aria-label')).toContain('wall')
    expectAppAlive()
  })

  it('drag-paints multiple shelves across cells', () => {
    appRender()
    fireEvent.pointerDown(cellAt(1, 1))
    fireEvent.pointerEnter(cellAt(1, 2))
    fireEvent.pointerEnter(cellAt(2, 2))
    expect(classList(cellAt(1, 1))).toContain('warehouse-cell--wall')
    expect(classList(cellAt(1, 2))).toContain('warehouse-cell--wall')
    expect(classList(cellAt(2, 2))).toContain('warehouse-cell--wall')
    expect(wallCount()).toBeGreaterThanOrEqual(3)
    expectAppAlive()
  })

  it('erase mode removes a shelf', () => {
    appRender()
    fireEvent.pointerDown(cellAt(1, 1))
    expect(classList(cellAt(1, 1))).toContain('warehouse-cell--wall')

    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    fireEvent.pointerDown(cellAt(1, 1))
    expect(classList(cellAt(1, 1))).not.toContain('warehouse-cell--wall')
    expectAppAlive()
  })

  it('drag-erase removes shelves swept over', () => {
    appRender()
    fireEvent.pointerDown(cellAt(1, 1))
    fireEvent.pointerEnter(cellAt(1, 2))
    expect(wallCount()).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    fireEvent.pointerDown(cellAt(1, 1))
    fireEvent.pointerEnter(cellAt(1, 2))
    expect(wallCount()).toBe(0)
    expectAppAlive()
  })

  it('moves the robot; moving onto the destination swaps the two endpoints', () => {
    appRender()
    const oldStartCell = cellAt(7, 1) // default robot cell (zero-based) = label R8C2
    const oldTargetCell = cellAt(7, 13) // default destination = label R8C14

    fireEvent.click(screen.getByRole('button', { name: 'Robot' }))
    fireEvent.pointerDown(oldTargetCell) // robot onto destination → swap
    expect(classList(cellAt(7, 13))).toContain('warehouse-cell--start')
    expect(classList(cellAt(7, 13))).not.toContain('warehouse-cell--target')
    expect(classList(cellAt(7, 1))).toContain('warehouse-cell--target')
    expect(classList(oldStartCell)).not.toContain('warehouse-cell--start')
    expectAppAlive()
  })

  it('moves the destination to a free cell (valid placement)', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Robot' }))
    fireEvent.pointerDown(cellAt(2, 2))
    fireEvent.click(screen.getByRole('button', { name: 'Destination' }))
    fireEvent.pointerDown(cellAt(9, 9))
    expect(classList(cellAt(2, 2))).toContain('warehouse-cell--start')
    expect(classList(cellAt(9, 9))).toContain('warehouse-cell--target')
    expect(classList(cellAt(7, 13))).not.toContain('warehouse-cell--target')
    expectAppAlive()
  })
})

describe('simulation playback', () => {
  it('pressing Start never blanks the app and animates BFS to a displayed path', () => {
    appRender()

    let thrown = null
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeNull() // pre-fix: render crash escaped Start click
    expect(screen.getByText('Simulating')).toBeTruthy() // live running status
    expect(screen.getByText('GridPilot')).toBeTruthy() // pre-fix: tree unmounted
    expect(screen.getByTestId('grid-board')).toBeTruthy()

    // Visited cells appear during playback…
    advanceTicks(3)
    expect(visitedCount()).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('GridPilot')).toBeTruthy()

    // …and the amber shortest route shows once playback completes.
    runToCompletion()
    expect(pathCount()).toBe(13) // 0-move offset: 12 moves + both endpoints
    expect(screen.getAllByText(/Path Found/).length).toBeGreaterThanOrEqual(1)
    expectAppAlive()
  })

  it('DFS runs and displays a valid route', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'DFS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    runToCompletion()
    expect(screen.getAllByText(/Path Found/).length).toBeGreaterThanOrEqual(1)
    expect(pathCount()).toBeGreaterThan(0)
    expectAppAlive()
  })

  it('backtracking runs on 8x8 grids only and displays a route or an explicit limit', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Backtracking' }))
    expect(screen.getByText(/Grid trimmed to 8 × 8/)).toBeTruthy()
    // Grid-size control must be locked while backtracking is selected.
    expect(screen.getByLabelText(/Square grid size/).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    // The active exploration step renders with the glowing "current" cell
    advanceTicks(1)
    expect(document.querySelector('.warehouse-cell--current')).toBeTruthy()

    runToCompletion(80)
    const gotPath = screen.queryAllByText(/Path Found/).length > 0
    const gotLimit = screen.queryAllByText(/Limit Reached/).length > 0
    expect(gotPath || gotLimit).toBe(true) // never a silent/fake outcome
    expect(screen.getByText('GridPilot')).toBeTruthy()
  })

  it('pause holds the animation, resume continues, from any speed', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    advanceTicks(3)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByText('Paused')).toBeTruthy()

    const frozen = visitedCount()
    advanceTicks(6)
    expect(visitedCount()).toBe(frozen)

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    advanceTicks(2)
    expect(visitedCount()).toBeGreaterThan(frozen)
    expectAppAlive()
  })

  it('Step advances exactly one trace step per click (from idle)', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Step' }))
    // The first dequeued cell renders as the glowing "current" cell…
    expect(document.querySelector('.warehouse-cell--current')).toBeTruthy()
    expect(visitedCount()).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Step' }))
    // …and scrolls into the visited layer once the search moves on.
    expect(visitedCount()).toBe(1)
    expectAppAlive()
  })

  it('Clear Path removes the whole overlay and returns to idle', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    advance(DEFAULT_DELAY * 5)
    expect(visitedCount()).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Clear Path' }))
    expect(visitedCount()).toBe(0)
    expect(pathCount()).toBe(0)
    expectAppAlive()
  })

  it('speed slider affects playback pace (slower ⇒ fewer steps in same wall time)', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    advance(DEFAULT_DELAY * 2)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    const before = parseCursor(stepLabel())

    // Slider range input: 0 = 720ms/step (slowest)
    fireEvent.change(screen.getByLabelText('Animation speed, slow to fast'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    advance(200) // less than one slow step (720ms)
    expect(parseCursor(stepLabel())).toBe(before)
    advance(530) // crosses the 720ms boundary → exactly one more step
    expect(parseCursor(stepLabel())).toBe(before + 1)
    expectAppAlive()
  })

  it('idle narration shows guidance instead of crashing (cursor-0 regression)', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    // cursor = 0, trace not yet stepped: "what is happening" must render.
    expect(document.body.textContent.length).toBeGreaterThan(100)
    expectAppAlive()
  })
})

describe('obstacle generation & lifecycle controls', () => {
  it('Complex Warehouse loads and both the serpentine UI run and comparison work', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: /Complex Warehouse/ }))
    expect(wallCount()).toBeGreaterThan(10)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    runToCompletion()
    expect(screen.queryAllByText(/Path Found/).length).toBeGreaterThanOrEqual(1)

    // Compare runs on the same Complex preset layout: BFS shortest vs DFS valid.
    fireEvent.click(screen.getByRole('button', { name: 'Compare on this layout' }))
    expect(screen.getByText(/Shortest-path guaranteed \(unweighted\)/)).toBeTruthy()
    expectAppAlive()
  })

  it('grid editing is ignored while a simulation is RUNNING (accidental-edit guard)', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.pointerDown(cellAt(2, 2)) // should be ignored mid-run
    expect(wallCount()).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.pointerDown(cellAt(2, 2)) // paused ⇒ edit allowed, run cancelled...
    expect(wallCount()).toBe(1)
    // ...and the previous exploration overlay was cleared on cancel.
    expect(visitedCount()).toBe(0)
    expectAppAlive()
  })

  it('rapid control churn (preset → start → pause → resume → edit) never leaves the app blank', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: /Easy Warehouse/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    fireEvent.click(screen.getByRole('button', { name: 'Robot' }))
    fireEvent.pointerDown(cellAt(3, 3))
    fireEvent.click(screen.getByRole('button', { name: 'Clear Shelves' }))
    expect(screen.getByText('GridPilot')).toBeTruthy()
    expect(screen.getByTestId('grid-board')).toBeTruthy()
  })

  it('Randomize scatters shelves; Clear Shelves removes them all', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    expect(wallCount()).toBeGreaterThan(0)
    expect(classList(cellAt(7, 1))).toContain('warehouse-cell--start')

    fireEvent.click(screen.getByRole('button', { name: 'Clear Shelves' }))
    expect(wallCount()).toBe(0)
    expect(classList(cellAt(7, 1))).toContain('warehouse-cell--start')
    expect(classList(cellAt(7, 13))).toContain('warehouse-cell--target')
    expectAppAlive()
  })

  it('Reset Grid clears shelves and the overlay', () => {
    appRender()
    fireEvent.pointerDown(cellAt(1, 1))
    fireEvent.pointerDown(cellAt(3, 3))
    expect(wallCount()).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: 'Reset Grid' }))
    expect(wallCount()).toBe(0)
    expectAppAlive()
  })

  it('grid size select changes the dimensions live', () => {
    appRender()
    fireEvent.change(screen.getByLabelText(/Square grid size/), { target: { value: '10' } })
    expect(screen.getByText(/Warehouse Grid — 10 × 10/)).toBeTruthy()
    expect(screen.getAllByRole('gridcell').length).toBe(100)
    expectAppAlive()
  })

  it('sample scenarios load: Easy Warehouse has shelves and is solvable', () => {
    appRender()
    fireEvent.click(screen.getByRole("button", { name: /Easy Warehouse/ }))
    expect(wallCount()).toBeGreaterThan(10)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    runToCompletion()
    expect(screen.getAllByText(/Path Found/).length).toBeGreaterThanOrEqual(1)
    expect(pathCount()).toBeGreaterThan(0)
    expectAppAlive()
  })

  it('Blocked Destination produces an explicit No Path result (and never a fake route)', () => {
    appRender()
    fireEvent.click(screen.getByRole("button", { name: /Blocked Destination/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    runToCompletion()
    expect(screen.getAllByText(/No Path/).length).toBeGreaterThanOrEqual(1)
    expect(pathCount()).toBe(0)
    expect(screen.getByText(/destination is unreachable/i)).toBeTruthy()
    expectAppAlive()
  })
})

describe('analysis panel', () => {
  it('Compare on this layout reports real BFS/DFS numbers from the same snapshot', () => {
    appRender()
    fireEvent.click(screen.getByRole('button', { name: 'Compare on this layout' }))
    // Both cards are populated — open default grid is solvable for both.
    expect(screen.getByText(/Shortest-path guaranteed \(unweighted\)/)).toBeTruthy()
    expect(screen.getByText(/Valid path, length not optimal/)).toBeTruthy()
    const movesCells = screen.getAllByText(/moves/).filter(
      (el) => /Yes · \d+ moves/.test(el.textContent)
    )
    expect(movesCells.length).toBeGreaterThanOrEqual(1)
    expectAppAlive()
  })
})
