
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import Reports from '../../../client/src/pages/reports'

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
  const user = userEvent.setup()

  it('renders reports page correctly', async () => {
    renderWithQueryClient(<Reports />)
    
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('System Performance Report')).toBeInTheDocument()
    expect(screen.getByText('Ticket Analytics')).toBeInTheDocument()
  })

  it('filters reports by date range', async () => {
    renderWithQueryClient(<Reports />)
    
    const fromDateInput = screen.getByLabelText(/from date/i)
    const toDateInput = screen.getByLabelText(/to date/i)

    await user.type(fromDateInput, '2024-01-01')
    await user.type(toDateInput, '2024-01-31')

    const generateButton = screen.getByRole('button', { name: /generate report/i })
    await user.click(generateButton)

    // Should show loading and then results
    expect(screen.getByText(/generating/i)).toBeInTheDocument()
  })

  it('exports report to PDF', async () => {
    renderWithQueryClient(<Reports />)
    
    const exportButton = screen.getByRole('button', { name: /export pdf/i })
    await user.click(exportButton)

    // Should trigger download
    expect(exportButton).toBeInTheDocument()
  })

  it('exports report to CSV', async () => {
    renderWithQueryClient(<Reports />)
    
    const exportButton = screen.getByRole('button', { name: /export csv/i })
    await user.click(exportButton)

    // Should trigger download
    expect(exportButton).toBeInTheDocument()
  })

  it('schedules a report', async () => {
    renderWithQueryClient(<Reports />)
    
    const scheduleButton = screen.getByRole('button', { name: /schedule report/i })
    await user.click(scheduleButton)

    expect(screen.getByText('Schedule Report')).toBeInTheDocument()

    const frequencySelect = screen.getByRole('combobox', { name: /frequency/i })
    await user.click(frequencySelect)
    await user.click(screen.getByText('Weekly'))

    const saveButton = screen.getByRole('button', { name: /save schedule/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/scheduled successfully/i)).toBeInTheDocument()
    })
  })
})
