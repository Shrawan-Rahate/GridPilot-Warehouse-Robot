import {
  Brush,
  Cpu,
  Eraser,
  Flag,
  Layers,
  Play,
  Pause,
  Footprints,
  Shuffle,
  Trash2,
} from 'lucide-react'
import { ALGORITHMS, ALGORITHM_KEYS } from '../algorithms/index.js'
import { PRESETS, GRID_SIZE_OPTIONS } from '../scenarios/presets.js'
import { SPEED_STEPS, SIM_STATUS } from '../animation/useSimulation.js'

const TOOLS = [
  { key: 'wall', label: 'Shelves', icon: Brush },
  { key: 'erase', label: 'Erase', icon: Eraser },
  { key: 'robot', label: 'Robot', icon: Cpu },
  { key: 'target', label: 'Destination', icon: Flag },
]

/**
 * Left sidebar — simulation controls. Every control either edits the world or
 * drives the playback controller passed down from App.
 */
export default function Sidebar({
  algorithmKey,
  onAlgorithmChange,
  algorithm,
  tool,
  onToolChange,
  speedIndex,
  onSpeedIndexChange,
  simStatus,
  gridSize,
  onGridSizeChange,
  onStart,
  onPause,
  onResume,
  onStep,
  onClearWalls,
  onResetGrid,
  onRandomize,
  onApplyPreset,
}) {
  const editing = simStatus === SIM_STATUS.RUNNING || simStatus === SIM_STATUS.PAUSED

  function presetClicked(key) {
    onApplyPreset(key)
  }

  return (
    <aside className="pane pane--scroll" aria-label="Simulation controls">
      <div className="pane__header">
        <h2 className="pane__title">Simulation Controls</h2>
      </div>

      <div className="pane__body">
        {/* --- Algorithm selection --- */}
        <section className="control-group" aria-label="Algorithm">
          <p className="group-title">Search Algorithm</p>
          {ALGORITHM_KEYS.map((key) => {
            const algo = ALGORITHMS[key]
            const active = key === algorithmKey
            return (
              <button
                key={key}
                className={`tool-btn ${active ? 'tool-btn--active' : ''}`}
                onClick={() => onAlgorithmChange(key)}
                aria-pressed={active}
                title={algo.tagline}
              >
                <Layers className="tool-btn__icon" aria-hidden="true" />
                {algo.name}
              </button>
            )
          })}
          <p className="hint">{algorithm.tagline}</p>
        </section>

        {/* --- Grid editing tools --- */}
        <section className="control-group" aria-label="Grid editing tools">
          <p className="group-title">Edit Warehouse</p>
          <div className="tool-grid">
            {TOOLS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`tool-btn ${tool === key ? 'tool-btn--active' : ''}`}
                onClick={() => onToolChange(key)}
                aria-pressed={tool === key}
              >
                <Icon className="tool-btn__icon" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <p className="hint">
            {editing
              ? 'Simulation active — editing will clear the current run.'
              : 'Click or drag on the grid to edit. Robot and destination are never buried.'}
          </p>
        </section>

        {/* --- Playback --- */}
        <section className="control-group" aria-label="Playback controls">
          <p className="group-title">Playback</p>
          <div className="btn-row--three" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              className="btn btn--primary"
              onClick={onStart}
              disabled={simStatus === SIM_STATUS.RUNNING}
              title="Run the algorithm and animate the search"
            >
              <Play className="btn__icon" aria-hidden="true" />
              Start
            </button>
            <button
              className="btn"
              onClick={onPause}
              disabled={simStatus !== SIM_STATUS.RUNNING}
            >
              <Pause className="btn__icon" aria-hidden="true" />
              Pause
            </button>
            <button
              className="btn"
              onClick={onResume}
              disabled={simStatus !== SIM_STATUS.PAUSED}
            >
              <Play className="btn__icon" aria-hidden="true" />
              Resume
            </button>
          </div>
          <div className="btn-row">
            <button
              className="btn"
              onClick={onStep}
              disabled={simStatus === SIM_STATUS.RUNNING}
              title="Advance the search by exactly one step"
            >
              <Footprints className="btn__icon" aria-hidden="true" />
              Step
            </button>
            <button className="btn btn--ghost" onClick={onResetGrid} title="Remove all shelves and reset">
              <Trash2 className="btn__icon" aria-hidden="true" />
              Reset Grid
            </button>
          </div>
        </section>

        {/* --- Speed --- */}
        <section className="control-group" aria-label="Animation speed">
          <p className="group-title">Animation Speed</p>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max={SPEED_STEPS.length - 1}
              value={speedIndex}
              onChange={(e) => onSpeedIndexChange(Number(e.target.value))}
              aria-label="Animation speed, slow to fast"
            />
            <output>{speedLabel(speedIndex)}</output>
          </div>
        </section>

        {/* --- Grid size --- */}
        <section className="control-group" aria-label="Grid size">
          <p className="group-title">Grid Size</p>
          <div className="field">
            <select
              className="select"
              value={gridSize}
              onChange={(e) => onGridSizeChange(Number(e.target.value))}
              disabled={algorithmKey === 'backtracking'}
              aria-label="Square grid size in cells"
            >
              {GRID_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} × {size}
                </option>
              ))}
            </select>
          </div>
          {algorithmKey === 'backtracking' && (
            <p className="note">
              Backtracking is restricted to 8 × 8 grids to avoid exponential blow-up.
            </p>
          )}
        </section>

        {/* --- Obstacles --- */}
        <section className="control-group" aria-label="Obstacle tools">
          <p className="group-title">Obstacles</p>
          <div className="btn-row">
            <button className="btn" onClick={onRandomize} title="Scatter random shelves (~28% density)">
              <Shuffle className="btn__icon" aria-hidden="true" />
              Randomize
            </button>
            <button className="btn" onClick={onClearWalls} title="Clear all shelves, keep robot and destination">
              <Eraser className="btn__icon" aria-hidden="true" />
              Clear Shelves
            </button>
          </div>
        </section>

        {/* --- Presets --- */}
        <section className="control-group" aria-label="Sample scenarios">
          <p className="group-title">Sample Scenarios</p>
          <div className="preset-list">
            {Object.values(PRESETS).map((preset) => (
              <button key={preset.key} className="preset-btn" onClick={() => presetClicked(preset.key)}>
                {preset.name}
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}

function speedLabel(speedIndex) {
  const delay = SPEED_STEPS[speedIndex] ?? SPEED_STEPS[5]
  return delay >= SPEED_STEPS[4] ? `${delay}ms/step` : `${delay}ms`
}
