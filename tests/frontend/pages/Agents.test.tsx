
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Agents from '../../../client/src/pages/agents'

// Mock the hooks
vi.mock('../../../client/src/hooks/use-agents', () => ({
  useAgents: vi.fn(),
}))

// Mock the queryClient
vi.mock('../../../client/src/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
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

describe('Agents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    const { useAgents } = require('../../../client/src/hooks/use-agents')
    
    useAgents.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn()
    })

    renderWithQueryClient(<Agents />)
    
    expect(screen.getByText('Agent Management')).toBeInTheDocument()
    expect(screen.getByText('Monitor and manage all registered agents')).toBeInTheDocument()
  })

  it('renders agents list when data is loaded', async () => {
    const { useAgents } = require('../../../client/src/hooks/use-agents')
    
    const mockAgents = [
      {
        id: '1',
        hostname: 'server-01',
        ip_address: '192.168.1.100',
        status: 'online',
        os_type: 'Ubuntu 22.04',
        last_seen: new Date().toISOString(),
        assigned_user: 'admin'
      },
      {
        id: '2',
        hostname: 'workstation-02',
        ip_address: '192.168.1.101',
        status: 'offline',
        os_type: 'Windows 11',
        last_seen: new Date().toISOString(),
        assigned_user: 'user1'
      }
    ]
    
    useAgents.mockReturnValue({
      data: mockAgents,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    renderWithQueryClient(<Agents />)
    
    await waitFor(() => {
      expect(screen.getByText('server-01')).toBeInTheDocument()
      expect(screen.getByText('workstation-02')).toBeInTheDocument()
    })
  })

  it('filters agents by search term', async () => {
    const { useAgents } = require('../../../client/src/hooks/use-agents')
    
    const mockAgents = [
      {
        id: '1',
        hostname: 'server-01',
        ip_address: '192.168.1.100',
        status: 'online',
        os_type: 'Ubuntu 22.04',
        last_seen: new Date().toISOString(),
        assigned_user: 'admin'
      },
      {
        id: '2',
        hostname: 'workstation-02',
        ip_address: '192.168.1.101',
        status: 'offline',
        os_type: 'Windows 11',
        last_seen: new Date().toISOString(),
        assigned_user: 'user1'
      }
    ]
    
    useAgents.mockReturnValue({
      data: mockAgents,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    const user = userEvent.setup()
    renderWithQueryClient(<Agents />)
    
    const searchInput = screen.getByPlaceholderText('Search agents...')
    await user.type(searchInput, 'server')
    
    await waitFor(() => {
      expect(screen.getByText('server-01')).toBeInTheDocument()
    })
  })
})
