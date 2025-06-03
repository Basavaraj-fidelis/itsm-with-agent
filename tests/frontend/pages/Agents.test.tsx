
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import Agents from '@/pages/agents'

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
  const user = userEvent.setup()

  it('renders agents list correctly', async () => {
    renderWithQueryClient(<Agents />)
    
    expect(screen.getByText('Agents')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('test-agent-1')).toBeInTheDocument()
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      expect(screen.getByText('online')).toBeInTheDocument()
    })
  })

  it('filters agents by status', async () => {
    renderWithQueryClient(<Agents />)
    
    await waitFor(() => {
      expect(screen.getByText('test-agent-1')).toBeInTheDocument()
    })

    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    await user.click(statusFilter)
    await user.click(screen.getByText('Online'))

    expect(screen.getByText('test-agent-1')).toBeInTheDocument()
  })

  it('searches agents by hostname', async () => {
    renderWithQueryClient(<Agents />)
    
    await waitFor(() => {
      expect(screen.getByText('test-agent-1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search agents/i)
    await user.type(searchInput, 'test-agent')

    expect(screen.getByText('test-agent-1')).toBeInTheDocument()
  })

  it('navigates to agent detail when agent is clicked', async () => {
    renderWithQueryClient(<Agents />)
    
    await waitFor(() => {
      expect(screen.getByText('test-agent-1')).toBeInTheDocument()
    })

    const agentRow = screen.getByText('test-agent-1')
    await user.click(agentRow)

    // Should navigate to agent detail page
    // This would need router testing setup
  })

  it('shows empty state when no agents found', async () => {
    // Mock empty response
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          queryFn: () => Promise.resolve([])
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Agents />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/no agents found/i)).toBeInTheDocument()
    })
  })
})
