
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Reports from '../../../client/src/pages/reports'

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

describe('Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders reports page', () => {
    const { useQuery } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Reports />)
    
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('System analytics and insights')).toBeInTheDocument()
  })

  it('renders available report types', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<Reports />)
    
    await waitFor(() => {
      expect(screen.getByText('Ticket Analytics')).toBeInTheDocument()
      expect(screen.getByText('Agent Performance')).toBeInTheDocument()
      expect(screen.getByText('System Health')).toBeInTheDocument()
      expect(screen.getByText('User Activity')).toBeInTheDocument()
    })
  })

  it('handles date range selection', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    })

    const user = userEvent.setup()
    renderWithQueryClient(<Reports />)
    
    const dateRangeButton = screen.getByRole('button', { name: /date range/i })
    await user.click(dateRangeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Last 7 days')).toBeInTheDocument()
      expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    })
  })
})
