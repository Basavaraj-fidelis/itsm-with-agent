
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import KnowledgeBase from '../../../client/src/pages/knowledge-base'

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

describe('KnowledgeBase', () => {
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

    renderWithQueryClient(<KnowledgeBase />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders knowledge base articles when data is loaded', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    const mockArticles = [
      {
        id: 'KB-001',
        title: 'How to reset password',
        summary: 'Step by step guide to reset user password',
        category: 'User Management',
        created_at: new Date().toISOString(),
        author: 'Admin'
      },
      {
        id: 'KB-002',
        title: 'Network troubleshooting',
        summary: 'Common network issues and solutions',
        category: 'Network',
        created_at: new Date().toISOString(),
        author: 'Tech Support'
      }
    ]
    
    useQuery.mockReturnValue({
      data: mockArticles,
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<KnowledgeBase />)
    
    await waitFor(() => {
      expect(screen.getByText('How to reset password')).toBeInTheDocument()
      expect(screen.getByText('Network troubleshooting')).toBeInTheDocument()
    })
  })

  it('handles empty articles list', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })

    renderWithQueryClient(<KnowledgeBase />)
    
    await waitFor(() => {
      expect(screen.getByText('No articles found')).toBeInTheDocument()
    })
  })

  it('filters articles by search term', async () => {
    const { useQuery } = require('@tanstack/react-query')
    
    const mockArticles = [
      {
        id: 'KB-001',
        title: 'How to reset password',
        summary: 'Step by step guide to reset user password',
        category: 'User Management',
        created_at: new Date().toISOString(),
        author: 'Admin'
      }
    ]
    
    useQuery.mockReturnValue({
      data: mockArticles,
      isLoading: false,
      error: null
    })

    const user = userEvent.setup()
    renderWithQueryClient(<KnowledgeBase />)
    
    const searchInput = screen.getByPlaceholderText('Search articles...')
    await user.type(searchInput, 'password')
    
    await waitFor(() => {
      expect(screen.getByText('How to reset password')).toBeInTheDocument()
    })
  })
})
