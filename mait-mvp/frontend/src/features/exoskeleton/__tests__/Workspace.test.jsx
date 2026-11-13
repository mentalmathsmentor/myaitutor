import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Workspace from '../Workspace'
import { useExoskeletonStore } from '@/stores/useExoskeletonStore'

vi.mock('../StartupWizard', () => ({ default: () => <div>New cohort setup</div> }))
vi.mock('../CadenceRenderer', () => ({ default: () => <div>Generated message</div> }))

describe('teacher workspace initial class load', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useExoskeletonStore.setState({
      cohorts: [], activeClass: null, activeThread: null,
      messagesByThread: {}, topicCache: {}, isWizardOpen: false,
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('shows retry rather than setup when classes fail to load, then recovers', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ classes: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<Workspace />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your teaching workspace')
    expect(screen.queryByText('New cohort setup')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('New cohort setup')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the load error when classes load but their threads fail', async () => {
    const cohort = { id: 'c1', name: 'Synthetic Maths', year_level: 9, subject: 'Stage 5 Mathematics' }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ classes: [cohort] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<Workspace />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your teaching workspace')
  })

  it('preserves an existing cohort on a failed refresh', async () => {
    const existing = { id: 'existing', name: 'Synthetic Maths', year_level: 9, subject: 'Stage 5 Mathematics' }
    useExoskeletonStore.setState({ cohorts: [existing], activeClass: existing })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    render(<Workspace />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(useExoskeletonStore.getState().cohorts).toEqual([existing])
    expect(useExoskeletonStore.getState().activeClass).toEqual(existing)
    expect(screen.queryByText('New cohort setup')).not.toBeInTheDocument()
  })

  it('does not treat a malformed response as a new teacher', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'missing classes' }) }))

    render(<Workspace />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your teaching workspace')
    expect(screen.queryByText('New cohort setup')).not.toBeInTheDocument()
  })
})
