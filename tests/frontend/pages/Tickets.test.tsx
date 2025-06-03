
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import Tickets from '../../../client/src/pages/tickets'

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
  const user = userEvent.setup()

  it('renders tickets list correctly', async () => {
    renderWithQueryClient(<Tickets />)
    
    expect(screen.getByText('Tickets')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Test Ticket')).toBeInTheDocument()
      expect(screen.getByText('open')).toBeInTheDocument()
      expect(screen.getByText('medium')).toBeInTheDocument()
    })
  })

  it('opens create ticket modal', async () => {
    renderWithQueryClient(<Tickets />)
    
    const createButton = screen.getByRole('button', { name: /create ticket/i })
    await user.click(createButton)

    expect(screen.getByText('Create New Ticket')).toBeInTheDocument()
  })

  it('filters tickets by status', async () => {
    renderWithQueryClient(<Tickets />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Ticket')).toBeInTheDocument()
    })

    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    await user.click(statusFilter)
    await user.click(screen.getByText('Open'))

    expect(screen.getByText('Test Ticket')).toBeInTheDocument()
  })

  it('filters tickets by priority', async () => {
    renderWithQueryClient(<Tickets />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Ticket')).toBeInTheDocument()
    })

    const priorityFilter = screen.getByRole('combobox', { name: /priority/i })
    await user.click(priorityFilter)
    await user.click(screen.getByText('Medium'))

    expect(screen.getByText('Test Ticket')).toBeInTheDocument()
  })

  it('creates a new ticket successfully', async () => {
    renderWithQueryClient(<Tickets />)
    
    const createButton = screen.getByRole('button', { name: /create ticket/i })
    await user.click(createButton)

    await user.type(screen.getByLabelText(/title/i), 'New Test Ticket')
    await user.type(screen.getByLabelText(/description/i), 'Test description')
    
    const prioritySelect = screen.getByRole('combobox', { name: /priority/i })
    await user.click(prioritySelect)
    await user.click(screen.getByText('High'))

    const submitButton = screen.getByRole('button', { name: /create/i })
    await user.click(submitButton)

    // Should close modal and refresh list
    await waitFor(() => {
      expect(screen.queryByText('Create New Ticket')).not.toBeInTheDocument()
    })
  })
})
