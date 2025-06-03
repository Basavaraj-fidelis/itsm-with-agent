
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Dashboard from '../../../client/src/pages/dashboard'

// Mock the hooks
vi.mock('../../../client/src/hooks/use-dashboard', () => ({
  useDashboardSummary: vi.fn(),
  useAlerts: vi.fn(),
}))

vi.mock('../../../client/src/hooks/use-agents', () => ({
  useAgents: vi.fn(),
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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    const { useDashboardSummary, useAlerts } = require('../../../client/src/hooks/use-dashboard')
    const { useAgents } = require('../../../client/src/hooks/use-agents')
    
    useDashboardSummary.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })
    
    useAlerts.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })
    
    useAgents.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })

    renderWithQueryClient(<Dashboard />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('System overview and monitoring')).toBeInTheDocument()
  })

  it('renders dashboard metrics when data is loaded', async () => {
    const { useDashboardSummary, useAlerts } = require('../../../client/src/hooks/use-dashboard')
    const { useAgents } = require('../../../client/src/hooks/use-agents')
    
    const mockSummary = {
      total_devices: 150,
      online_devices: 140,
      offline_devices: 10,
      active_alerts: 5
    }
    
    const mockAlerts = [
      {
        id: '1',
        message: 'High CPU usage',
        severity: 'warning',
        device_hostname: 'server-01',
        triggered_at: new Date().toISOString()
      }
    ]
    
    useDashboardSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      error: null
    })
    
    useAlerts.mockReturnValue({
      data: mockAlerts,
      isLoading: false,
      error: null
    })
    
    useAgents.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('140')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })

  it('renders error state when data fails to load', async () => {
    const { useDashboardSummary, useAlerts } = require('../../../client/src/hooks/use-dashboard')
    const { useAgents } = require('../../../client/src/hooks/use-agents')
    
    useDashboardSummary.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch summary')
    })
    
    useAlerts.mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    })
    
    useAgents.mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument()
    })
  })
})
