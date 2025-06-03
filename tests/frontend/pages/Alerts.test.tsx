
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import Alerts from '@/pages/alerts'

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

describe('Alerts', () => {
  const user = userEvent.setup()

  it('renders alerts list correctly', async () => {
    renderWithQueryClient(<Alerts />)
    
    expect(screen.getByText('Alerts')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('high_cpu')).toBeInTheDocument()
      expect(screen.getByText('warning')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('filters alerts by severity', async () => {
    renderWithQueryClient(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('high_cpu')).toBeInTheDocument()
    })

    const severityFilter = screen.getByRole('combobox', { name: /severity/i })
    await user.click(severityFilter)
    await user.click(screen.getByText('Warning'))

    expect(screen.getByText('high_cpu')).toBeInTheDocument()
  })

  it('filters alerts by status', async () => {
    renderWithQueryClient(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('high_cpu')).toBeInTheDocument()
    })

    const statusFilter = screen.getByRole('combobox', { name: /status/i })
    await user.click(statusFilter)
    await user.click(screen.getByText('Active'))

    expect(screen.getByText('high_cpu')).toBeInTheDocument()
  })

  it('acknowledges an alert', async () => {
    renderWithQueryClient(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('high_cpu')).toBeInTheDocument()
    })

    const acknowledgeButton = screen.getByRole('button', { name: /acknowledge/i })
    await user.click(acknowledgeButton)

    // Should show confirmation and update alert status
    expect(screen.getByText(/acknowledged/i)).toBeInTheDocument()
  })

  it('resolves an alert', async () => {
    renderWithQueryClient(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('high_cpu')).toBeInTheDocument()
    })

    const resolveButton = screen.getByRole('button', { name: /resolve/i })
    await user.click(resolveButton)

    // Should show confirmation dialog
    expect(screen.getByText(/resolve alert/i)).toBeInTheDocument()
  })
})
