
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import KnowledgeBase from '@/pages/knowledge-base'

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

describe('Knowledge Base', () => {
  const user = userEvent.setup()

  it('renders knowledge base articles correctly', async () => {
    renderWithQueryClient(<KnowledgeBase />)
    
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
      expect(screen.getByText('General')).toBeInTheDocument()
    })
  })

  it('searches articles by title', async () => {
    renderWithQueryClient(<KnowledgeBase />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search articles/i)
    await user.type(searchInput, 'Test')

    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('filters articles by category', async () => {
    renderWithQueryClient(<KnowledgeBase />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
    })

    const categoryFilter = screen.getByRole('combobox', { name: /category/i })
    await user.click(categoryFilter)
    await user.click(screen.getByText('General'))

    expect(screen.getByText('Test Article')).toBeInTheDocument()
  })

  it('opens article creation modal', async () => {
    renderWithQueryClient(<KnowledgeBase />)
    
    const createButton = screen.getByRole('button', { name: /create article/i })
    await user.click(createButton)

    expect(screen.getByText('Create New Article')).toBeInTheDocument()
  })

  it('creates a new article successfully', async () => {
    renderWithQueryClient(<KnowledgeBase />)
    
    const createButton = screen.getByRole('button', { name: /create article/i })
    await user.click(createButton)

    await user.type(screen.getByLabelText(/title/i), 'New Test Article')
    await user.type(screen.getByLabelText(/content/i), 'Test content')
    
    const categorySelect = screen.getByRole('combobox', { name: /category/i })
    await user.click(categorySelect)
    await user.click(screen.getByText('Troubleshooting'))

    const submitButton = screen.getByRole('button', { name: /create/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText('Create New Article')).not.toBeInTheDocument()
    })
  })
})
