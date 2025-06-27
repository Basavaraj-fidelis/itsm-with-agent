
-- Optimize database for 100+ devices
-- Run these commands in your PostgreSQL database

-- Index for faster device queries
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
CREATE INDEX IF NOT EXISTS idx_devices_os_name ON devices(os_name);

-- Index for faster device reports queries
CREATE INDEX IF NOT EXISTS idx_device_reports_device_id ON device_reports(device_id);
CREATE INDEX IF NOT EXISTS idx_device_reports_created_at ON device_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_reports_cpu_usage ON device_reports(cpu_usage);
CREATE INDEX IF NOT EXISTS idx_device_reports_memory_usage ON device_reports(memory_usage);

-- Index for faster alerts queries
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_created ON alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_devices_status_os ON devices(status, os_name);
CREATE INDEX IF NOT EXISTS idx_device_reports_device_created ON device_reports(device_id, created_at DESC);
