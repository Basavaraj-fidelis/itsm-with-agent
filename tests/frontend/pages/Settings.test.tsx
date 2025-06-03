
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Settings from '../../../client/src/pages/settings'

// Mock useQuery
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
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

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders settings page', () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    })
    
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })

    renderWithQueryClient(<Settings />)
    
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('System configuration and preferences')).toBeInTheDocument()
  })

  it('renders settings tabs', async () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    })
    
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })

    renderWithQueryClient(<Settings />)
    
    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument()
      expect(screen.getByText('Agent')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Security')).toBeInTheDocument()
    })
  })

  it('handles tab switching', async () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null
    })
    
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })

    const user = userEvent.setup()
    renderWithQueryClient(<Settings />)
    
    const agentTab = screen.getByText('Agent')
    await user.click(agentTab)
    
    await waitFor(() => {
      expect(screen.getByText('Agent Configuration')).toBeInTheDocument()
    })
  })
})
