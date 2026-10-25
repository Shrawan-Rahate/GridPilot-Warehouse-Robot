// @vitest-environment jsdom
/**
 * ErrorBoundary regression: a runtime exception inside the app must surface
 * a visible, actionable error screen (with the real message) — NEVER a blank
 * page or a swallowed error.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

function Boom({ on }) {
  if (on) throw new Error('synthetic grid render failure')
  return <div>GridPilot content</div>
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders children normally when nothing throws', () => {
    const { container } = render(
      <ErrorBoundary>
        <Boom on={false} />
      </ErrorBoundary>
    )
    expect(container.textContent).toContain('GridPilot content')
  })

  it('shows the real error message instead of going blank', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom on />
      </ErrorBoundary>
    )
    // Alert screen with the REAL failure text is visible…
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/synthetic grid render failure/)).toBeTruthy()
    // …and recovery actions are offered.
    expect(screen.getByRole('button', { name: /Reload application/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Try to recover/ })).toBeTruthy()
    // The error was reported to the console, not swallowed.
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('[GridPilot] runtime error'))).toBe(true)
    errorSpy.mockRestore()
  })
})
