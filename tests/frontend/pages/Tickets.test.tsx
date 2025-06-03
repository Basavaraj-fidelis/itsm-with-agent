
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Tickets from '../../../client/src/pages/tickets'

// Mock useQuery
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(),
  }
})

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

describe('Tickets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    const { useQuery } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    })

    renderWithQueryClient(<Tickets />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders tickets list when data is loaded', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    const mockTickets = [
      {
        id: 'INC-001',
        title: 'Network connectivity issue',
        status: 'open',
        priority: 'high',
        type: 'incident',
        created_at: new Date().toISOString(),
        requester_email: 'user@example.com'
      },
      {
        id: 'REQ-001',
        title: 'Software installation request',
        status: 'pending',
        priority: 'medium',
        type: 'request',
        created_at: new Date().toISOString(),
        requester_email: 'user2@example.com'
      }
    ]
    
    useQuery.mockReturnValue({
      data: mockTickets,
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Tickets />)
    
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
      expect(screen.getByText('REQ-001')).toBeInTheDocument()
      expect(screen.getByText('Network connectivity issue')).toBeInTheDocument()
      expect(screen.getByText('Software installation request')).toBeInTheDocument()
    })
  })

  it('handles empty tickets list', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Tickets />)
    
    await waitFor(() => {
      expect(screen.getByText('No tickets found')).toBeInTheDocument()
    })
  })

  it('filters tickets by status', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    const mockTickets = [
      {
        id: 'INC-001',
        title: 'Network connectivity issue',
        status: 'open',
        priority: 'high',
        type: 'incident',
        created_at: new Date().toISOString(),
        requester_email: 'user@example.com'
      }
    ]
    
    useQuery.mockReturnValue({
      data: mockTickets,
      isLoading: false,
      error: null
    })

    const user = userEvent.setup()
    renderWithQueryClient(<Tickets />)
    
    const statusFilter = screen.getByRole('button', { name: /status/i })
    await user.click(statusFilter)
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /open/i })).toBeInTheDocument()
    })
  })
})
