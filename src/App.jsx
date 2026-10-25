import { useCallback, useState } from 'react'
import { X } from 'lucide-react'

import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import WarehouseGrid from './components/WarehouseGrid.jsx'
import InsightsPanel from './components/InsightsPanel.jsx'
import ComparisonPanel from './components/ComparisonPanel.jsx'

import { getAlgorithm } from './algorithms/index.js'
import { createWorld, cropWorld } from './algorithms/gridUtils.js'
import { useSimulation, SIM_STATUS } from './animation/useSimulation.js'
import {
  paintWall,
  eraseCell,
  moveStart,
  moveTarget,
  clearWalls,
  randomizeWalls,
  adoptWorld,
  resizeWorld,
} from './utils/worldOps.js'
import { PRESETS } from './scenarios/presets.js'

// Engine safety net for the recursive backtracking demo (exponential worst case).
const BACKTRACK_NODE_LIMIT = 3000
const BT_MAX_SIZE = 8

export default function App() {
  const [world, setWorld] = useState(() => createWorld(15, 15))
  const [algorithmKey, setAlgorithmKey] = useState('bfs')
  const [tool, setTool] = useState('wall')
  const [notice, setNotice] = useState(null)

  const algorithm = getAlgorithm(algorithmKey)
  const sim = useSimulation(world, algorithmKey, {
    maxNodes: algorithmKey === 'backtracking' ? BACKTRACK_NODE_LIMIT : undefined,
  })

  /**
   * Grid editing: any edit cancels an active run first (clean pause), then
   * applies the tool. Robot/destination tools swap positions rather than
   * leaving the grid with two robots.
   */
  const handleEdit = useCallback(
    (toolKey, r, c) => {
      if (sim.status === SIM_STATUS.RUNNING) return // deliberately ignored while animating
      setNotice(null)
      sim.invalidate() // clear overlay; the run is over from the user's view
      setWorld((prev) => {
        if (toolKey === 'wall') return paintWall(prev, r, c)
        if (toolKey === 'erase') return eraseCell(prev, r, c)
        if (toolKey === 'robot') return moveStart(prev, r, c)
        if (toolKey === 'target') return moveTarget(prev, r, c)
        return prev
      })
    },
    [sim]
  )

  const handleAlgorithmChange = useCallback(
    (key) => {
      setNotice(null)
      if (key !== algorithmKey) {
        sim.invalidate()
        setAlgorithmKey(key)
      }
      if (key === 'backtracking') {
        // Pure decision outside the state updater — updateUpdaters must stay
        // side-effect free (StrictMode double-invokes them in dev).
        if (world.rows > BT_MAX_SIZE || world.cols > BT_MAX_SIZE) {
          setNotice('Grid trimmed to 8 × 8 — backtracking is restricted to small grids (exponential worst case).')
          setWorld(cropWorld(world, BT_MAX_SIZE))
        }
      }
    },
    [algorithmKey, sim, world]
  )

  const handleGridSizeChange = useCallback(
    (size) => {
      setNotice(null)
      if (algorithmKey === 'backtracking' && size > BT_MAX_SIZE) {
        // Leaving the safe zone disables the extension: switch to BFS (honest notice).
        setAlgorithmKey('bfs')
        setNotice(`Backtracking is limited to 8 × 8 — switched to BFS so the grid can grow to ${size} × ${size}.`)
      }
      sim.invalidate()
      setWorld((prev) => resizeWorld(prev, size))
    },
    [algorithmKey, sim]
  )

  const handleApplyPreset = useCallback(
    (presetKey) => {
      const preset = PRESETS[presetKey]
      if (!preset) return
      setNotice(null)
      sim.invalidate()
      setWorld(adoptWorld(preset.make()))
      if (algorithmKey === 'backtracking') {
        // Presets are 15×15 teaching layouts; keep the extension's 8×8 promise.
        setAlgorithmKey('bfs')
        setNotice('Sample scenarios are 15 × 15 — backtracking switched to BFS (it is restricted to 8 × 8).')
      }
    },
    [algorithmKey, sim]
  )

  const handleClearWallsOnly = useCallback(() => {
    setNotice(null)
    sim.invalidate()
    setWorld((prev) => clearWalls(prev))
  }, [sim])

  const handleResetGrid = useCallback(() => {
    setNotice(null)
    sim.invalidate()
    if (algorithmKey === 'backtracking') {
      setWorld(clearWalls(createWorld(BT_MAX_SIZE, BT_MAX_SIZE)))
    } else {
      setWorld(createWorld(world.rows, world.cols))
    }
  }, [sim, algorithmKey, world.rows, world.cols])

  const handleRandomize = useCallback(() => {
    setNotice(null)
    sim.invalidate()
    setWorld((prev) => randomizeWalls(prev, 0.28))
  }, [sim])

  const editingHint = sim.result ? 'Editing clears the current run.' : undefined

  return (
    <div className="app">
      <Header
        algorithmName={algorithm.name}
        algorithmComplexity={`${algorithm.timeComplexity} / ${algorithm.spaceComplexity}`}
        simStatus={sim.status}
        result={sim.result}
        onClearPath={() => {
          setNotice(null)
          sim.reset()
        }}
      />

      <div className="app-main">
        <Sidebar
          algorithmKey={algorithmKey}
          algorithm={algorithm}
          onAlgorithmChange={handleAlgorithmChange}
          tool={tool}
          onToolChange={(t) => {
            setNotice(null)
            setTool(t)
          }}
          speedIndex={sim.speedIndex}
          onSpeedIndexChange={sim.setSpeedIndex}
          simStatus={sim.status}
          gridSize={world.rows}
          onGridSizeChange={handleGridSizeChange}
          onStart={() => {
            setNotice(null)
            sim.start()
          }}
          onPause={sim.pause}
          onResume={sim.resume}
          onStep={sim.stepOnce}
          onClearWalls={handleClearWallsOnly}
          onResetGrid={handleResetGrid}
          onRandomize={handleRandomize}
          onApplyPreset={handleApplyPreset}
        />

        <main className="grid-stage" style={{ gap: 12 }}>
          {notice && (
            <div className="note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>{notice}</span>
              <button
                className="btn btn--ghost"
                style={{ padding: '2px 8px', minHeight: 24 }}
                onClick={() => setNotice(null)}
                aria-label="Dismiss notice"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          )}
          <WarehouseGrid
            world={world}
            tool={tool}
            simStatus={sim.status}
            result={sim.result}
            cursor={sim.cursor}
            onEdit={handleEdit}
          />
        </main>

        <div className="right-col">
          <InsightsPanel
            algorithm={algorithm}
            world={world}
            result={sim.result}
            simStatus={sim.status}
            cursor={sim.cursor}
          />

          <section className="pane" aria-label="Algorithm comparison">
            <div className="pane__header">
              <h2 className="pane__title">Algorithm Comparison</h2>
            </div>
            <div className="pane__body">
              <ComparisonPanel world={world} />
              {editingHint && <p className="hint">{editingHint}</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
