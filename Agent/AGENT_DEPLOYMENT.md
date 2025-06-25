# ITSM Agent Deployment Guide

## Overview

The ITSM Agent is a lightweight, non-intrusive endpoint monitoring and management tool that integrates with your existing ITSM platform. It provides intelligent system monitoring, command execution, and reporting capabilities while respecting running operations and system resources.

## Core Features

- **Non-Intrusive Operation**: Monitors system load and defers operations during high activity
- **Smart Command Scheduling**: Queue-based execution with priority handling
- **Cross-Platform Support**: Windows, Linux, and macOS compatibility
- **Secure Communication**: HTTPS/TLS with token-based authentication
- **Operation Safety**: Conflict detection and prevention mechanisms
- **Comprehensive Monitoring**: System metrics, process tracking, and health reporting

## System Requirements

### Windows
- Windows 10/11, Windows Server 2016 or later
- Python 3.8 or higher
- Administrator privileges for installation
- Minimum 512MB RAM, 100MB disk space
- Network connectivity to ITSM server

### Linux
- Ubuntu 18.04+, CentOS 7+, RHEL 7+, Debian 9+, or compatible
- Python 3.8 or higher
- Root privileges for installation
- systemd support
- Minimum 512MB RAM, 100MB disk space
- Network connectivity to ITSM server

## Installation

### Windows Installation

1. **Prepare Installation Files**
   ```cmd
   # Extract agent files to C:\ITSM-Agent
   # Files should include:
   # - itsm_agent.py
   # - system_collector.py
   # - api_client.py
   # - command_scheduler.py
   # - operation_monitor.py
   # - smart_queue.py
   # - service_wrapper.py
   # - install_windows.py
   # - config.ini
   ```

2. **Run Installation Script (as Administrator)**
   ```cmd
   cd C:\ITSM-Agent
   python install_windows.py
   ```

3. **Installation Process**
   - Checks Python version compatibility
   - Installs required dependencies (psutil, requests, pywin32)
   - Downloads NSSM (Non-Sucking Service Manager)
   - Creates installation directory: `C:\Program Files\ITSM Agent`
   - Copies agent files and configuration
   - Installs Windows service
   - Creates desktop management shortcuts
   - Configures Windows Firewall rules

4. **Configuration**
   ```cmd
   # Edit configuration file
   notepad "C:\Program Files\ITSM Agent\config.ini"
   ```

5. **Start Service**
   ```cmd
   # Start the service
   sc start ITSMAgent
   
   # Check service status
   sc query ITSMAgent
   ```

### Linux Installation

1. **Prepare Installation Files**
   ```bash
   # Extract agent files to /tmp/itsm-agent
   # Make install script executable
   chmod +x install_linux.sh
   ```

2. **Run Installation Script (as root)**
   ```bash
   sudo ./install_linux.sh
   ```

3. **Installation Process**
   - Detects Linux distribution
   - Checks Python version compatibility
   - Installs system dependencies
   - Creates service user (`itsm`)
   - Creates directories:
     - Installation: `/opt/itsm-agent`
     - Configuration: `/etc/itsm-agent`
     - Logs: `/var/log/itsm-agent`
     - Data: `/var/lib/itsm-agent`
   - Installs Python dependencies in virtual environment
   - Creates systemd service
   - Sets up log rotation
   - Creates management scripts

4. **Configuration**
   ```bash
   # Edit configuration file
   sudo nano /etc/itsm-agent/config.ini
   ```

5. **Start Service**
   ```bash
   # Start the service
   sudo systemctl start itsm-agent
   
   # Enable auto-start
   sudo systemctl enable itsm-agent
   
   # Check status
   sudo systemctl status itsm-agent
   ```

## Configuration

### Main Configuration File (config.ini)

```ini
[agent]
# Collection interval in seconds (600 = 10 minutes)
collection_interval = 600

# Heartbeat interval in seconds (60 = 1 minute) 
heartbeat_interval = 60

# Logging configuration
log_level = INFO
log_max_size = 10485760
log_backup_count = 5

[api]
# ITSM API configuration - UPDATE THESE VALUES
base_url = https://your-itsm-server.com/api
auth_token = your-api-token-here

# Request configuration
timeout = 30
retry_attempts = 3
retry_delay = 5

[monitoring]
# System monitoring thresholds
cpu_threshold = 80
memory_threshold = 80
disk_threshold = 90
load_check_interval = 30

[scheduling]
# Command scheduling configuration
max_concurrent_commands = 2
defer_threshold_cpu = 75
defer_threshold_memory = 75

# Maintenance window (24-hour format)
maintenance_window_start = 02:00
maintenance_window_end = 04:00

[security]
# Security configuration
verify_ssl = true
```

### Required Configuration Changes

1. **API Endpoint**: Update `base_url` with your ITSM server URL
2. **Authentication**: Set `auth_token` with valid API token
3. **SSL Certificate**: Set `verify_ssl = false` for self-signed certificates (not recommended for production)

## Service Management

### Windows
```cmd
# Start service
sc start ITSMAgent

# Stop service
sc stop ITSMAgent

# Restart service
sc stop ITSMAgent && sc start ITSMAgent

# Check status
sc query ITSMAgent

# View logs
# Check: C:\Program Files\ITSM Agent\logs\
```

### Linux
```bash
# Start service
sudo systemctl start itsm-agent

# Stop service
sudo systemctl stop itsm-agent

# Restart service
sudo systemctl restart itsm-agent

# Check status
sudo systemctl status itsm-agent

# View logs
sudo journalctl -u itsm-agent -f

# Management shortcuts
itsm-start    # Start service
itsm-stop     # Stop service
itsm-status   # Show status
itsm-logs     # View logs
itsm-logs -f  # Follow logs
```

## API Integration

### Authentication
The agent uses token-based authentication. Your ITSM system should provide:
- API endpoint URL
- Authentication token
- Supported API methods

### API Endpoints Expected by Agent

```
POST /api/agents/register     # Agent registration
POST /api/agents/heartbeat    # Regular heartbeat
POST /api/system/report       # System information
GET  /api/commands/pending    # Get pending commands
POST /api/commands/status     # Update command status
POST /api/metrics/report      # Report system metrics
POST /api/locks/create        # Create operation lock
DELETE /api/locks/{id}        # Remove operation lock
```

### Data Formats

**System Information Report:**
```json
{
  "hostname": "SERVER-01",
  "platform": "Windows 10",
  "cpu_info": "Intel Core i7-8700K",
  "memory_total": 16777216,
  "disk_info": [...],
  "network_info": [...],
  "installed_software": [...],
  "running_processes": [...],
  "system_metrics": {
    "cpu_usage": 15.2,
    "memory_usage": 45.8,
    "disk_usage": 67.3
  }
}
```

**Command Structure:**
```json
{
  "id": 123,
  "type": "script",
  "command": "Get-Service | Where-Object {$_.Status -eq 'Running'}",
  "parameters": {},
  "priority": 3,
  "scheduled_for": "2024-01-15T02:30:00Z"
}
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check Python installation and version
   - Verify configuration file syntax
   - Check network connectivity to ITSM server
   - Review service logs for detailed error messages

2. **Authentication Failures**
   - Verify API token is correct and active
   - Check base_url configuration
   - Ensure SSL certificate validation settings

3. **High Resource Usage**
   - Adjust collection_interval to reduce frequency
   - Check for system conflicts in operation_monitor logs
   - Review command execution logs

4. **Commands Not Executing**
   - Check system load thresholds in configuration
   - Verify no operation locks are preventing execution
   - Review command queue and priority settings

### Log Locations

**Windows:**
- Service logs: `C:\Program Files\ITSM Agent\logs\`
- Windows Event Log: Look for "ITSM Agent" entries

**Linux:**
- Service logs: `/var/log/itsm-agent/`
- System logs: `journalctl -u itsm-agent`

### Debug Mode

Enable debug logging by setting `log_level = DEBUG` in config.ini and restarting the service.

## Security Considerations

1. **Network Security**
   - Use HTTPS for all API communication
   - Implement proper firewall rules
   - Consider VPN for sensitive environments

2. **Authentication**
   - Use strong, unique API tokens
   - Rotate tokens regularly
   - Monitor for unauthorized access attempts

3. **System Access**
   - Agent runs with limited privileges where possible
   - Commands are validated before execution
   - Operation locks prevent conflicting changes

4. **Data Protection**
   - System information is transmitted encrypted
   - Sensitive data can be filtered from reports
   - Logs are rotated and can be encrypted

## Uninstallation

### Windows
```cmd
# Stop and remove service
sc stop ITSMAgent
sc delete ITSMAgent

# Remove installation directory
rmdir /s "C:\Program Files\ITSM Agent"

# Remove desktop shortcuts (if created)
```

### Linux
```bash
# Stop and disable service
sudo systemctl stop itsm-agent
sudo systemctl disable itsm-agent

# Remove service file
sudo rm /etc/systemd/system/itsm-agent.service
sudo systemctl daemon-reload

# Remove installation directories
sudo rm -rf /opt/itsm-agent
sudo rm -rf /etc/itsm-agent
sudo rm -rf /var/log/itsm-agent
sudo rm -rf /var/lib/itsm-agent

# Remove service user
sudo userdel itsm

# Remove management scripts
sudo rm /usr/local/bin/itsm-*
```

## Support

For technical support or integration questions:
1. Check service logs for detailed error messages
2. Review configuration settings
3. Verify network connectivity and API endpoints
4. Contact your ITSM administrator for API token issues

## Agent Files Structure

```
itsm-agent/
├── itsm_agent.py              # Main agent orchestrator
├── system_collector.py        # System information collection
├── api_client.py             # ITSM API communication
├── command_scheduler.py       # Command execution engine
├── operation_monitor.py       # System state monitoring
├── smart_queue.py            # Priority-based command queue
├── service_wrapper.py        # Cross-platform service management
├── config.ini               # Configuration file
├── install_windows.py       # Windows installer
├── install_linux.sh         # Linux installer
├── fix_windows_service.py   # Windows service repair utility
└── AGENT_DEPLOYMENT.md      # This deployment guide
```