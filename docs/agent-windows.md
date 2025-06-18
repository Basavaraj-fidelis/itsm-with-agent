
# Windows Agent Documentation

## Overview

The ITSM Windows Agent is a lightweight service that runs on Windows systems to collect system information, monitor performance metrics, and provide remote management capabilities. It communicates securely with the central ITSM server and provides real-time visibility into Windows workstations and servers.

## Features

### System Monitoring
- **Performance Metrics**: CPU, memory, disk, and network utilization
- **Hardware Inventory**: Complete hardware component detection
- **Software Inventory**: Installed applications and license tracking
- **Process Monitoring**: Running processes and resource consumption
- **Service Status**: Windows services monitoring and control

### Security Monitoring
- **USB Device Tracking**: USB insertion/removal detection
- **Event Log Analysis**: Windows event log parsing and alerting
- **Security Policy Compliance**: Windows security settings validation
- **User Activity**: Login sessions and user behavior tracking
- **Network Security**: Active network connections and ports

### Remote Management
- **Remote Desktop**: RDP access configuration
- **PowerShell Execution**: Remote script and command execution
- **File Transfer**: Secure file upload/download capabilities
- **Service Control**: Start, stop, and restart Windows services
- **Registry Management**: Registry key monitoring and modification

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10 (1909 or later), Windows 11, Windows Server 2016+
- **Memory**: 128 MB RAM available
- **Disk Space**: 50 MB free disk space
- **Network**: TCP/IP connectivity to ITSM server
- **Privileges**: Administrator rights for installation

### Recommended Requirements
- **Memory**: 256 MB RAM available
- **Disk Space**: 200 MB free disk space for logs and temporary files
- **Network**: Reliable internet connection (minimum 1 Mbps)
- **PowerShell**: PowerShell 5.1 or later

### Dependencies
- **Python 3.7+**: Required for agent execution
- **WMI**: Windows Management Instrumentation
- **Windows Services**: Ability to create and run Windows services

## Installation

### Download Agent Package
Download the Windows agent package from the admin panel:

```http
GET /api/download/agent/windows
Authorization: Bearer <admin-token>
```

This downloads a ZIP file containing:
- `itsm_agent.py` - Main agent script
- `system_collector.py` - System information collector
- `api_client.py` - API communication client
- `service_wrapper.py` - Windows service wrapper
- `config.ini` - Configuration file
- `install_windows.py` - Installation script
- `fix_windows_service.py` - Service troubleshooting script

### Automated Installation

1. **Extract the agent package** to a temporary directory (e.g., `C:\temp\itsm-agent`)

2. **Run PowerShell as Administrator**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

3. **Execute the installation script**:
```powershell
cd C:\temp\itsm-agent
python install_windows.py
```

The installation script will:
- Create the installation directory: `C:\Program Files\ITSM Agent`
- Copy all agent files to the installation directory
- Create the Windows service
- Configure firewall rules if needed
- Start the agent service

### Manual Installation

1. **Create installation directory**:
```powershell
New-Item -ItemType Directory -Path "C:\Program Files\ITSM Agent" -Force
```

2. **Copy agent files**:
```powershell
Copy-Item "C:\temp\itsm-agent\*" -Destination "C:\Program Files\ITSM Agent\" -Recurse
```

3. **Configure the agent** by editing `C:\Program Files\ITSM Agent\config.ini`:
```ini
[api]
base_url = http://your-itsm-server:5000
auth_token = your-authentication-token

[agent]
collection_interval = 60
max_retry_attempts = 3
log_level = INFO

[monitoring]
cpu_threshold = 80
memory_threshold = 85
disk_threshold = 90
enable_usb_monitoring = true
enable_process_monitoring = true
```

4. **Install the Windows service**:
```powershell
cd "C:\Program Files\ITSM Agent"
python itsm_agent.py install
```

5. **Start the service**:
```powershell
python itsm_agent.py start
```

## Configuration

### Configuration File (config.ini)

```ini
[api]
# ITSM Server Configuration
base_url = http://0.0.0.0:5000
auth_token = your-secure-token-here
timeout = 30
retry_attempts = 3
retry_delay = 5

[agent]
# Agent Behavior Settings
collection_interval = 60
hostname_override = 
log_level = INFO
log_file = logs/agent.log
max_log_size = 10485760
log_backup_count = 5

[monitoring]
# Performance Monitoring Thresholds
cpu_threshold = 80
memory_threshold = 85
disk_threshold = 90
network_threshold = 80

# Feature Toggles
enable_usb_monitoring = true
enable_process_monitoring = true
enable_service_monitoring = true
enable_event_log_monitoring = true
enable_registry_monitoring = false

[security]
# Security Settings
ssl_verify = true
certificate_path = 
encryption_enabled = true
audit_logging = true

[performance]
# Performance Tuning
max_processes_reported = 50
exclude_system_processes = true
compress_data = true
batch_size = 100
```

### Environment Variables
Alternative configuration via environment variables:

```powershell
# Set environment variables
[Environment]::SetEnvironmentVariable("ITSM_API_URL", "http://0.0.0.0:5000", "Machine")
[Environment]::SetEnvironmentVariable("ITSM_AUTH_TOKEN", "your-token", "Machine")
[Environment]::SetEnvironmentVariable("ITSM_COLLECTION_INTERVAL", "300", "Machine")
```

## Data Collection

### System Information Collected

The agent collects comprehensive system information:

```json
{
  "hostname": "WORKSTATION-01",
  "os_info": {
    "name": "Microsoft Windows 11 Pro",
    "version": "10.0.22621",
    "build": "22621",
    "architecture": "AMD64",
    "install_date": "2024-01-01T10:00:00Z",
    "last_boot_time": "2024-01-15T08:30:00Z",
    "uptime_seconds": 7200
  },
  "hardware": {
    "cpu": {
      "name": "Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz",
      "cores": 8,
      "threads": 16,
      "architecture": "x64",
      "max_speed": 3800
    },
    "memory": {
      "total_gb": 16,
      "available_gb": 8.5,
      "modules": [
        {
          "size_gb": 8,
          "speed": 3200,
          "manufacturer": "Corsair"
        }
      ]
    },
    "storage": [
      {
        "drive": "C:",
        "type": "SSD",
        "size_gb": 512,
        "free_gb": 256,
        "file_system": "NTFS"
      }
    ],
    "network": [
      {
        "name": "Ethernet",
        "mac_address": "00:1A:2B:3C:4D:5E",
        "ip_address": "192.168.1.100",
        "speed_mbps": 1000
      }
    ]
  },
  "system_health": {
    "cpu_percent": 25.5,
    "memory_percent": 68.2,
    "disk_usage": {
      "C:": 45.8
    },
    "network_io": {
      "bytes_sent": 1048576,
      "bytes_received": 2097152
    },
    "temperature": {
      "cpu": 65,
      "gpu": 58
    }
  }
}
```

### Process Information
```json
{
  "processes": [
    {
      "name": "chrome.exe",
      "pid": 1234,
      "cpu_percent": 5.2,
      "memory_mb": 256,
      "username": "DOMAIN\\john.doe",
      "command_line": "\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\"",
      "start_time": "2024-01-15T09:00:00Z"
    }
  ]
}
```

### Windows Services
```json
{
  "services": [
    {
      "name": "Spooler",
      "display_name": "Print Spooler",
      "status": "Running",
      "start_type": "Automatic",
      "account": "LocalSystem"
    }
  ]
}
```

### USB Device Detection
```json
{
  "usb_devices": [
    {
      "device_id": "USB\\VID_0781&PID_5567",
      "description": "SanDisk USB Flash Drive",
      "manufacturer": "SanDisk",
      "serial_number": "AA12345678",
      "connected_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Service Management

### Windows Service Commands

**Check service status**:
```powershell
Get-Service -Name "ITSMAgent"
```

**Start the service**:
```powershell
Start-Service -Name "ITSMAgent"
```

**Stop the service**:
```powershell
Stop-Service -Name "ITSMAgent"
```

**Restart the service**:
```powershell
Restart-Service -Name "ITSMAgent"
```

**Service configuration**:
```powershell
sc.exe config ITSMAgent start= auto
sc.exe config ITSMAgent depend= Tcpip/Dhcp
```

### Service Recovery Options
Configure automatic service recovery:

```powershell
sc.exe failure ITSMAgent reset= 86400 actions= restart/5000/restart/5000/restart/5000
```

## Remote Management

### Remote Desktop Configuration
The agent can configure Windows for remote desktop access:

```powershell
# Enable Remote Desktop
Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -Value 0

# Enable Remote Desktop through Windows Firewall
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
```

### PowerShell Remoting
Enable PowerShell remoting for management:

```powershell
# Enable PowerShell Remoting
Enable-PSRemoting -Force

# Configure trusted hosts (if needed)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "itsm-server.company.com"
```

### WinRM Configuration
```powershell
# Configure WinRM for HTTPS
winrm quickconfig -transport:https

# Set WinRM service to automatic startup
Set-Service -Name WinRM -StartupType Automatic
```

## Security Configuration

### Firewall Rules
The agent requires specific firewall rules:

```powershell
# Allow ITSM agent communication
New-NetFirewallRule -DisplayName "ITSM Agent" -Direction Outbound -Protocol TCP -RemotePort 5000 -Action Allow

# Allow Remote Desktop (if needed)
New-NetFirewallRule -DisplayName "Remote Desktop" -Direction Inbound -Protocol TCP -LocalPort 3389 -Action Allow
```

### Certificate Management
For secure communication with SSL certificates:

```powershell
# Import certificate
Import-Certificate -FilePath "C:\temp\itsm-ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

### User Account Control (UAC)
The agent service runs with appropriate privileges:

```ini
[security]
# Run with limited privileges when possible
run_as_service = true
elevated_privileges = false
uac_bypass = false
```

## Troubleshooting

### Common Issues

**Service won't start**:
```powershell
# Check event logs
Get-EventLog -LogName Application -Source "ITSM Agent" -Newest 10

# Check service dependencies
sc.exe qc ITSMAgent

# Verify Python installation
python --version
```

**Agent not reporting data**:
```powershell
# Test network connectivity
Test-NetConnection -ComputerName "itsm-server.company.com" -Port 5000

# Check agent logs
Get-Content "C:\Program Files\ITSM Agent\logs\agent.log" -Tail 50

# Verify configuration
Get-Content "C:\Program Files\ITSM Agent\config.ini"
```

**High CPU usage**:
```ini
# Adjust collection interval
[agent]
collection_interval = 300

# Disable intensive monitoring
[monitoring]
enable_process_monitoring = false
enable_registry_monitoring = false
```

**Permission errors**:
```powershell
# Check service account permissions
sc.exe qc ITSMAgent

# Run as Local System (if needed)
sc.exe config ITSMAgent obj= LocalSystem
```

### Diagnostic Tools

**Agent health check**:
```powershell
cd "C:\Program Files\ITSM Agent"
python itsm_agent.py --check-health
```

**Test API connectivity**:
```powershell
python -c "
import requests
import configparser
config = configparser.ConfigParser()
config.read('config.ini')
url = config['api']['base_url'] + '/api/health'
response = requests.get(url)
print(f'Status: {response.status_code}')
print(f'Response: {response.text}')
"
```

**View detailed logs**:
```powershell
# Enable debug logging
[agent]
log_level = DEBUG

# View real-time logs
Get-Content "C:\Program Files\ITSM Agent\logs\agent.log" -Wait
```

## Performance Optimization

### Resource Usage Optimization

**Memory optimization**:
```ini
[performance]
max_processes_reported = 25
exclude_system_processes = true
compress_data = true
```

**CPU optimization**:
```ini
[agent]
collection_interval = 300
thread_pool_size = 2
```

**Network optimization**:
```ini
[api]
timeout = 15
batch_requests = true
compression = true
```

### Monitoring Exclusions

**Exclude processes**:
```ini
[monitoring]
exclude_processes = svchost.exe,System,dwm.exe,csrss.exe
```

**Exclude drives**:
```ini
[monitoring]
exclude_drives = A:,B:,D:
```

## Integration Examples

### Active Directory Integration
The agent can collect AD-related information:

```python
# Get AD user information
import win32api
import win32security

def get_current_user():
    return win32api.GetUserName()

def get_user_groups():
    # Implementation to get user group memberships
    pass
```

### Registry Monitoring
Monitor specific registry keys:

```python
import winreg

def monitor_registry_key(key_path):
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path)
        # Monitor for changes
        return True
    except Exception as e:
        return False
```

### Event Log Integration
```python
import win32evtlog

def check_event_logs():
    server = 'localhost'
    logtype = 'System'
    hand = win32evtlog.OpenEventLog(server, logtype)
    # Process event logs
    return events
```

This comprehensive Windows agent documentation provides everything needed to deploy, configure, and maintain the ITSM agent on Windows systems.
