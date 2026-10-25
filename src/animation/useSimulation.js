/**
 * useSimulation.js — animation controller hook.
 *
 * Separation of concerns (kept simple on purpose):
 *   1. algorithms/*   → pure computation, produces a trace (animationSteps)
 *   2. this controller → owns the playback cursor, timers and playback state
 *   3. components      → render the state derived from (result + cursor)
 *
 * Timer safety: exactly one setTimeout per effect run, cleared on cleanup;
 * a `runId` guard makes stale callbacks harmless when the user resets,
 * switches algorithm or edits the grid mid-animation.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runAlgorithm } from '../algorithms/index.js'
import { snapshotWorld } from '../algorithms/gridUtils.js'

export const SIM_STATUS = {
  IDLE: 'idle', // no result yet
  RUNNING: 'running', // animating stepped content
  PAUSED: 'paused',
  DONE: 'done', // animation finished (path may have been found or not)
}

// ms-per-step table for the speed slider (index 0 = slowest … 9 = fastest).
export const SPEED_STEPS = [720, 520, 380, 280, 200, 140, 90, 55, 32, 16]
export const DEFAULT_SPEED_INDEX = 5

/**
 * @param {object} world   current edit-stage world (NOT the snapshot)
 * @param {string} algorithmKey
 * @param {object} options extra engine options, e.g. { maxNodes } for backtracking
 */
export function useSimulation(world, algorithmKey, options = {}) {
  const [status, setStatus] = useState(SIM_STATUS.IDLE)
  const [result, setResult] = useState(null)
  const [cursor, setCursor] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX)

  // Only the playback cursor + animation flags live here; computation is pure.
  const runIdRef = useRef(0)
  const delay = SPEED_STEPS[speedIndex] ?? SPEED_STEPS[DEFAULT_SPEED_INDEX]

  const totalSteps = result ? result.animationSteps.length : 0

  /**
   * Run the selected algorithm on a fresh snapshot, then animate.
   * Any previous timer/race is invalidated by the runId guard.
   */
  const start = useCallback(() => {
    const runId = ++runIdRef.current
    const snapshot = snapshotWorld(world) // engine reads a frozen copy
    const computed = runAlgorithm(algorithmKey, snapshot, {
      maxNodes: options.maxNodes ?? 3000,
    })
    if (runId !== runIdRef.current) return // stale (user already changed state)
    setResult(computed)
    setCursor(0)
    setStatus(SIM_STATUS.RUNNING)
    return computed
  }, [world, algorithmKey, options.maxNodes])

  /** Clear visuals but keep the drawn obstacles (map stays intact). */
  const reset = useCallback(() => {
    runIdRef.current += 1
    setResult(null)
    setCursor(0)
    setStatus(SIM_STATUS.IDLE)
  }, [])

  const pause = useCallback(() => {
    setStatus((prev) => (prev === SIM_STATUS.RUNNING ? SIM_STATUS.PAUSED : prev))
  }, [])

  const resume = useCallback(() => {
    setStatus((prev) => (prev === SIM_STATUS.PAUSED ? SIM_STATUS.RUNNING : prev))
  }, [])

  /**
   * Advance one trace step manually (works from idle or paused).
   * If the trace has not been computed yet, run the algorithm first.
   */
  const stepOnce = useCallback(() => {
    runIdRef.current += 1 // invalidate any in-flight animation timer
    if (!result) {
      const snapshot = snapshotWorld(world)
      const computed = runAlgorithm(algorithmKey, snapshot, {
        maxNodes: options.maxNodes ?? 3000,
      })
      setResult(computed)
      setCursor(Math.min(1, computed.animationSteps.length))
      setStatus(SIM_STATUS.PAUSED)
      return
    }
    setCursor((prev) => Math.min(result.animationSteps.length, prev + 1))
    setStatus((prev) => (prev === SIM_STATUS.RUNNING ? SIM_STATUS.PAUSED : prev))
  }, [result, world, algorithmKey, options.maxNodes])

  // The single animation clock — driven by (status, cursor, speed).
  useEffect(() => {
    if (status !== SIM_STATUS.RUNNING) return
    if (cursor >= totalSteps) {
      setStatus(SIM_STATUS.DONE)
      return
    }
    const timer = setTimeout(() => setCursor((c) => c + 1), delay)
    return () => clearTimeout(timer)
  }, [status, cursor, totalSteps, delay])

  /** Any world/algorithm change invalidates the visible result teachers see. */
  const invalidate = reset

  const progress = useMemo(() => {
    if (!result || totalSteps === 0) return 0
    return Math.min(1, cursor / totalSteps)
  }, [cursor, result, totalSteps])

  return {
    status,
    result,
    cursor,
    totalSteps,
    progress,
    speedIndex,
    delay,
    start,
    pause,
    resume,
    stepOnce,
    reset,
    invalidate,
    setSpeedIndex,
  }
}
