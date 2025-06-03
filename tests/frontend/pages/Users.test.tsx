
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import Users from '../../../client/src/pages/users'

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

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    })
    
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })

    renderWithQueryClient(<Users />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders users list when data is loaded', async () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'admin',
        department: 'IT',
        phone: '+1234567890',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'user',
        department: 'HR',
        phone: '+1234567891',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ]
    
    useQuery.mockReturnValue({
      data: mockUsers,
      isLoading: false,
      error: null
    })
    
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })

    renderWithQueryClient(<Users />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
    })
  })

  it('handles empty users list', async () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })
    
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })

    renderWithQueryClient(<Users />)
    
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument()
    })
  })

  it('filters users by search term', async () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'admin',
        department: 'IT',
        phone: '+1234567890',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ]
    
    useQuery.mockReturnValue({
      data: mockUsers,
      isLoading: false,
      error: null
    })
    
    useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false
    })

    const user = userEvent.setup()
    renderWithQueryClient(<Users />)
    
    const searchInput = screen.getByPlaceholderText('Search users...')
    await user.type(searchInput, 'John')
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })
})
