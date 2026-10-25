import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import App from '../App.jsx'

/**
 * Render smoke test: mounts the whole dashboard server-side. Any crash in
 * component logic, prop wiring or static markup shows up here without
 * needing a browser.
 */
describe('App (render smoke test)', () => {
  it('renders the dashboard with header, controls, grid and panels', () => {
    const html = renderToStaticMarkup(React.createElement(App))
    expect(html).toContain('GridPilot')
    expect(html).toContain('Warehouse Navigation Lab')
    expect(html).toContain('Simulation Controls')
    expect(html).toContain('Warehouse Grid')
    expect(html).toContain('Algorithm Insights')
    expect(html).toContain('BFS vs DFS Comparison')
    // All three algorithms are selectable
    expect(html).toContain('Backtracking')
    // The three preset buttons exist
    expect(html).toContain('Easy Warehouse')
    expect(html).toContain('Complex Warehouse')
    expect(html).toContain('Blocked Destination')
    // Legend chips are present
    expect(html).toContain('Robot (start)')
  })
})
