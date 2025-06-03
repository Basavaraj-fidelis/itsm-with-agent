
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Alerts from '../../../client/src/pages/alerts'

// Mock the hooks
vi.mock('../../../client/src/hooks/use-alerts', () => ({
  useAlerts: vi.fn(),
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('Alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    const { useAlerts } = require('../../../client/src/hooks/use-alerts')
    
    useAlerts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    })

    renderWithQueryClient(<Alerts />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders alerts list when data is loaded', async () => {
    const { useAlerts } = require('../../../client/src/hooks/use-alerts')
    
    const mockAlerts = [
      {
        id: 'ALT-001',
        message: 'High CPU usage detected',
        severity: 'warning',
        device_hostname: 'server-01',
        triggered_at: new Date().toISOString(),
        status: 'active'
      },
      {
        id: 'ALT-002',
        message: 'Disk space low',
        severity: 'critical',
        device_hostname: 'server-02',
        triggered_at: new Date().toISOString(),
        status: 'active'
      }
    ]
    
    useAlerts.mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High CPU usage detected')).toBeInTheDocument()
      expect(screen.getByText('Disk space low')).toBeInTheDocument()
    })
  })

  it('handles empty alerts list', async () => {
    const { useAlerts } = require('../../../client/src/hooks/use-alerts')
    
    useAlerts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('No alerts found')).toBeInTheDocument()
    })
  })

  it('filters alerts by severity', async () => {
    const { useAlerts } = require('../../../client/src/hooks/use-alerts')
    
    const mockAlerts = [
      {
        id: 'ALT-001',
        message: 'High CPU usage detected',
        severity: 'warning',
        device_hostname: 'server-01',
        triggered_at: new Date().toISOString(),
        status: 'active'
      }
    ]
    
    useAlerts.mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null
    })

    const user = userEvent.setup()
    renderWithQueryClient(<Alerts />)
    
    const severityFilter = screen.getByRole('button', { name: /severity/i })
    await user.click(severityFilter)
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /warning/i })).toBeInTheDocument()
    })
  })
})
