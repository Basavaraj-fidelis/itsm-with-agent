import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from '../../../client/src/pages/settings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: vi.fn(),
});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings page with header', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure system preferences and monitoring settings')).toBeInTheDocument();
  });

  it('displays all settings sections', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Monitoring Settings')).toBeInTheDocument();
    expect(screen.getByText('Alert Settings')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('displays system name input', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByLabelText('System Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ACME ITSM System')).toBeInTheDocument();
  });

  it('displays monitoring interval setting', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('Monitoring Interval')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5 minutes')).toBeInTheDocument();
  });

  it('displays data retention setting', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('Data Retention')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90 days')).toBeInTheDocument();
  });

  it('displays email notifications toggle', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    const emailToggle = screen.getByRole('switch');
    expect(emailToggle).toBeInTheDocument();
    expect(emailToggle).toBeChecked();
  });

  it('displays alert thresholds', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('CPU Threshold')).toBeInTheDocument();
    expect(screen.getByText('Memory Threshold')).toBeInTheDocument();
    expect(screen.getByText('Disk Threshold')).toBeInTheDocument();

    expect(screen.getByDisplayValue('80')).toBeInTheDocument(); // CPU threshold
    expect(screen.getByDisplayValue('85')).toBeInTheDocument(); // Memory threshold
    expect(screen.getByDisplayValue('90')).toBeInTheDocument(); // Disk threshold
  });

  it('updates system name when changed', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const systemNameInput = screen.getByLabelText('System Name');
    fireEvent.change(systemNameInput, { target: { value: 'Updated ITSM System' } });

    expect(systemNameInput).toHaveValue('Updated ITSM System');
  });

  it('updates monitoring interval when changed', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const intervalSelect = screen.getByDisplayValue('5 minutes');
    fireEvent.click(intervalSelect);

    const tenMinutesOption = screen.getByText('10 minutes');
    fireEvent.click(tenMinutesOption);

    await waitFor(() => {
      expect(screen.getByDisplayValue('10 minutes')).toBeInTheDocument();
    });
  });

  it('updates data retention when changed', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const retentionSelect = screen.getByDisplayValue('90 days');
    fireEvent.click(retentionSelect);

    const sixMonthsOption = screen.getByText('6 months');
    fireEvent.click(sixMonthsOption);

    await waitFor(() => {
      expect(screen.getByDisplayValue('6 months')).toBeInTheDocument();
    });
  });

  it('toggles email notifications', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const emailToggle = screen.getByRole('switch');
    expect(emailToggle).toBeChecked();

    fireEvent.click(emailToggle);

    await waitFor(() => {
      expect(emailToggle).not.toBeChecked();
    });
  });

  it('updates CPU threshold', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const cpuThresholdInput = screen.getByDisplayValue('80');
    fireEvent.change(cpuThresholdInput, { target: { value: '75' } });

    expect(cpuThresholdInput).toHaveValue('75');
  });

  it('updates memory threshold', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const memoryThresholdInput = screen.getByDisplayValue('85');
    fireEvent.change(memoryThresholdInput, { target: { value: '80' } });

    expect(memoryThresholdInput).toHaveValue('80');
  });

  it('updates disk threshold', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const diskThresholdInput = screen.getByDisplayValue('90');
    fireEvent.change(diskThresholdInput, { target: { value: '85' } });

    expect(diskThresholdInput).toHaveValue('85');
  });

  it('saves settings when save button is clicked', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Settings saved successfully!');
    });
  });

  it('displays backup and restore section', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create backup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore from backup/i })).toBeInTheDocument();
  });

  it('creates backup when button is clicked', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    const backupButton = screen.getByRole('button', { name: /create backup/i });
    fireEvent.click(backupButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Backup created successfully!');
    });
  });

  it('displays automatic backup toggle', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('Automatic Backups')).toBeInTheDocument();
    const autoBackupToggle = screen.getAllByRole('switch').find(toggle => 
      toggle.closest('div')?.textContent?.includes('Automatic Backups')
    );
    expect(autoBackupToggle).toBeInTheDocument();
  });

  it('displays maintenance mode toggle', () => {
    render(<Settings />, { wrapper: createWrapper() });

    expect(screen.getByText('Maintenance Mode')).toBeInTheDocument();
    const maintenanceToggle = screen.getAllByRole('switch').find(toggle => 
      toggle.closest('div')?.textContent?.includes('Maintenance Mode')
    );
    expect(maintenanceToggle).toBeInTheDocument();
  });
});