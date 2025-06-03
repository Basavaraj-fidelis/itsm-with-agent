
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import Settings from '@/pages/settings'

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
  const user = userEvent.setup()

  it('renders settings page correctly', async () => {
    renderWithQueryClient(<Settings />)
    
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('General Settings')).toBeInTheDocument()
    expect(screen.getByText('Notification Settings')).toBeInTheDocument()
  })

  it('updates general settings', async () => {
    renderWithQueryClient(<Settings />)
    
    const organizationInput = screen.getByLabelText(/organization name/i)
    await user.clear(organizationInput)
    await user.type(organizationInput, 'New Organization')

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument()
    })
  })

  it('toggles notification settings', async () => {
    renderWithQueryClient(<Settings />)
    
    const emailNotifications = screen.getByRole('checkbox', { name: /email notifications/i })
    await user.click(emailNotifications)

    expect(emailNotifications).toBeChecked()

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument()
    })
  })

  it('configures alert thresholds', async () => {
    renderWithQueryClient(<Settings />)
    
    const cpuThresholdInput = screen.getByLabelText(/cpu threshold/i)
    await user.clear(cpuThresholdInput)
    await user.type(cpuThresholdInput, '85')

    const memoryThresholdInput = screen.getByLabelText(/memory threshold/i)
    await user.clear(memoryThresholdInput)
    await user.type(memoryThresholdInput, '90')

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument()
    })
  })

  it('resets settings to default', async () => {
    renderWithQueryClient(<Settings />)
    
    const resetButton = screen.getByRole('button', { name: /reset to default/i })
    await user.click(resetButton)

    // Should show confirmation dialog
    expect(screen.getByText(/reset settings/i)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText(/settings reset/i)).toBeInTheDocument()
    })
  })
})
