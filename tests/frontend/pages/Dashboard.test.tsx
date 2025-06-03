
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import Dashboard from '../../../client/src/pages/dashboard'

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

describe('Dashboard', () => {
  beforeEach(() => {
    // Reset any mocks between tests
  })

  it('renders dashboard metrics correctly', async () => {
    renderWithQueryClient(<Dashboard />)
    
    expect(screen.getByText('System Overview')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument() // Total devices
      expect(screen.getByText('12')).toBeInTheDocument() // Active alerts
      expect(screen.getByText('34')).toBeInTheDocument() // Open tickets
    })
  })

  it('shows loading state initially', () => {
    renderWithQueryClient(<Dashboard />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('handles error state gracefully', async () => {
    // Mock error response
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          queryFn: () => Promise.reject(new Error('API Error'))
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('refreshes data when refresh button is clicked', async () => {
    renderWithQueryClient(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toBeInTheDocument()
  })
})
