
-- Enhanced Patch Compliance Database Schema

-- Patch definitions table
CREATE TABLE IF NOT EXISTS patch_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patch_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL, -- critical, important, moderate, low
    category VARCHAR(100), -- security, feature, bugfix, driver
    vendor VARCHAR(100),
    product VARCHAR(100),
    kb_article VARCHAR(50),
    release_date TIMESTAMP,
    superseded_by VARCHAR(255),
    is_superseded BOOLEAN DEFAULT FALSE,
    requires_reboot BOOLEAN DEFAULT FALSE,
    download_url TEXT,
    file_size BIGINT,
    checksum VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Device patch status tracking
CREATE TABLE IF NOT EXISTS device_patch_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    patch_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- not_applicable, missing, installed, failed, pending
    install_date TIMESTAMP,
    last_scan_date TIMESTAMP DEFAULT NOW(),
    error_message TEXT,
    installation_source VARCHAR(100), -- windows_update, wsus, manual, automated
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_id, patch_id)
);

-- Patch groups for management
CREATE TABLE IF NOT EXISTS patch_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    auto_approve BOOLEAN DEFAULT FALSE,
    auto_install BOOLEAN DEFAULT FALSE,
    maintenance_window VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Device assignment to patch groups
CREATE TABLE IF NOT EXISTS device_patch_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    patch_group_id UUID NOT NULL REFERENCES patch_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(device_id, patch_group_id)
);

-- Patch deployment campaigns
CREATE TABLE IF NOT EXISTS patch_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_patches TEXT[], -- Array of patch IDs
    target_devices UUID[], -- Array of device IDs or use device groups
    schedule_type VARCHAR(50), -- immediate, scheduled, maintenance_window
    scheduled_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed, cancelled
    progress_percentage INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deployment results tracking
CREATE TABLE IF NOT EXISTS patch_deployment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES patch_deployments(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    patch_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- success, failed, pending, skipped
    error_message TEXT,
    install_duration_seconds INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance policies
CREATE TABLE IF NOT EXISTS compliance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(50), -- security_updates, all_updates, critical_only
    max_days_missing INTEGER DEFAULT 30, -- Max days a patch can be missing
    severity_levels TEXT[], -- Array of required severity levels
    auto_remediate BOOLEAN DEFAULT FALSE,
    notification_threshold INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_patch_status_device_id ON device_patch_status(device_id);
CREATE INDEX IF NOT EXISTS idx_device_patch_status_patch_id ON device_patch_status(patch_id);
CREATE INDEX IF NOT EXISTS idx_device_patch_status_status ON device_patch_status(status);
CREATE INDEX IF NOT EXISTS idx_patch_definitions_severity ON patch_definitions(severity);
CREATE INDEX IF NOT EXISTS idx_patch_definitions_category ON patch_definitions(category);
CREATE INDEX IF NOT EXISTS idx_patch_deployments_status ON patch_deployments(status);
