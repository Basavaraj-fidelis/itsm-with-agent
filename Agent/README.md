# Non-Intrusive ITSM Agent

A lightweight, intelligent IT Service Management (ITSM) endpoint agent that integrates with your existing ITSM platform. Provides comprehensive system monitoring, command execution, and reporting capabilities while respecting running operations and system resources.

## Key Features

### 🔧 Non-Intrusive Operation
- **System Load Monitoring**: Continuously monitors CPU, memory, and disk usage
- **Operation Awareness**: Detects critical processes (backups, antivirus scans, maintenance)
- **Smart Deferral**: Automatically defers non-critical operations during high system load
- **Conflict Prevention**: Prevents conflicting operations from running simultaneously

### 📋 Intelligent Command Management
- **Priority-Based Queuing**: Commands are prioritized and executed in order of importance
- **Safe Execution Windows**: Waits for optimal system conditions before executing commands
- **Retry Logic**: Failed commands are automatically retried with exponential backoff
- **Operation Locks**: Prevents multiple conflicting operations from running simultaneously

### ⏰ Smart Scheduling
- **Maintenance Windows**: Critical operations scheduled during low-activity periods (2-4 AM by default)
- **Load-Based Deferral**: Commands wait for optimal execution windows
- **Dependency Management**: Commands can specify dependencies and execution requirements
- **Resource Monitoring**: Tracks system resources before and during execution

### 🛡️ Security & Safety
- **Secure Communication**: HTTPS/TLS with token-based authentication
- **Operation Validation**: Commands are validated before execution
- **Audit Logging**: Complete record of all operations and system changes
- **Privilege Management**: Runs with minimal required privileges

## Core Components

1. **ITSM Agent** (`itsm_agent.py`) - Main agent orchestrator and service management
2. **System Collector** (`system_collector.py`) - Non-intrusive system information collection
3. **API Client** (`api_client.py`) - Secure communication with ITSM server
4. **Command Scheduler** (`command_scheduler.py`) - Intelligent command execution engine
5. **Operation Monitor** (`operation_monitor.py`) - System state and conflict detection
6. **Smart Queue** (`smart_queue.py`) - Priority-based command queuing system
7. **Service Wrapper** (`service_wrapper.py`) - Cross-platform service management

## Quick Start

### Windows Installation

1. **Extract agent files** to a directory (e.g., `C:\ITSM-Agent`)

2. **Run installation as Administrator**:
   ```cmd
   cd C:\ITSM-Agent
   python install_windows.py
   ```

3. **Configure the agent**:
   ```cmd
   notepad "C:\Program Files\ITSM Agent\config.ini"
   # Update: base_url and auth_token
   ```

4. **Start the service**:
   ```cmd
   sc start ITSMAgent
   
# ITSM Agent - Organized Structure

## Directory Structure

```
Agent/
├── Windows/           # Windows-specific agent files
│   ├── itsm_agent.py         # Main agent for Windows
│   ├── config.ini            # Windows-specific configuration
│   ├── service_wrapper.py    # Windows service management
│   ├── install_windows.py    # Windows installation script
│   ├── fix_windows_service.py # Windows troubleshooting
│   ├── fix_service_issue.py  # Additional Windows fixes
│   └── config_validator.py   # Configuration validation
├── Linux/             # Linux-specific agent files
│   ├── itsm_agent.py         # Main agent for Linux
│   ├── config.ini            # Linux-specific configuration
│   ├── service_wrapper.py    # Linux systemd service management
│   ├── install_linux.sh      # Linux installation script
│   └── config_validator.py   # Configuration validation
├── Common/            # Shared components
│   ├── system_collector.py   # System information collection
│   ├── api_client.py         # API communication
│   ├── operation_monitor.py  # System load monitoring
│   ├── smart_queue.py        # Intelligent task queuing
│   ├── command_scheduler.py  # Command execution scheduling
│   ├── network_monitor.py    # Network connectivity monitoring
│   └── performance_baseline.py # Performance tracking
└── README.md          # This documentation
```

## Platform-Specific Files

### Windows (`Agent/Windows/`)
**Essential Files (Minimum Required):**
- `itsm_agent.py` - Main agent application
- `system_collector.py` - From Common/ (symlinked or copied)
- `api_client.py` - From Common/ (symlinked or copied)
- `service_wrapper.py` - Windows service management
- `config.ini` - Windows-specific configuration

**Installation Files:**
- `install_windows.py` - Automated installation script
- `fix_windows_service.py` - Service troubleshooting
- `fix_service_issue.py` - Additional troubleshooting

**Optional Enhancement Files:**
- `config_validator.py` - Configuration validation
- `operation_monitor.py` - From Common/
- `smart_queue.py` - From Common/
- `command_scheduler.py` - From Common/
- `network_monitor.py` - From Common/
- `performance_baseline.py` - From Common/

### Linux (`Agent/Linux/`)
**Essential Files (Minimum Required):**
- `itsm_agent.py` - Main agent application
- `system_collector.py` - From Common/ (symlinked or copied)
- `api_client.py` - From Common/ (symlinked or copied)
- `service_wrapper.py` - Linux systemd service management
- `config.ini` - Linux-specific configuration

**Installation Files:**
- `install_linux.sh` - Automated installation script

**Optional Enhancement Files:**
- `config_validator.py` - Configuration validation
- `operation_monitor.py` - From Common/
- `smart_queue.py` - From Common/
- `command_scheduler.py` - From Common/
- `network_monitor.py` - From Common/
- `performance_baseline.py` - From Common/

### Common (`Agent/Common/`)
**Shared Components:**
- `system_collector.py` - Cross-platform system information collection
- `api_client.py` - REST API communication
- `operation_monitor.py` - System load and resource monitoring
- `smart_queue.py` - Intelligent task scheduling
- `command_scheduler.py` - Command execution management
- `network_monitor.py` - Network connectivity monitoring
- `performance_baseline.py` - Performance tracking and analytics

## Minimum Installation Requirements

### For Basic Agent Functionality:
Each platform needs only **5 essential files**:
1. `itsm_agent.py` (platform-specific)
2. `system_collector.py` (from Common)
3. `api_client.py` (from Common)
4. `service_wrapper.py` (platform-specific)
5. `config.ini` (platform-specific)

### For Full-Featured Agent:
Add the optional enhancement files for:
- Advanced monitoring and load balancing
- Intelligent command scheduling
- Network connectivity tracking
- Performance baseline analysis
- Configuration validation

## Installation Process

### Windows:
```bash
# Download Windows agent package
# Extract to target directory
# Run installation:
python install_windows.py
```

### Linux:
```bash
# Download Linux agent package
# Extract to target directory
# Run installation:
sudo bash install_linux.sh
```

## Benefits of This Structure

1. **Reduced Package Size**: Each platform only includes necessary files
2. **Easier Maintenance**: Platform-specific code is separated
3. **Simplified Installation**: Clear requirements per platform
4. **Shared Components**: Common functionality is reused
5. **Scalable**: Easy to add new platforms (macOS, etc.)

## Migration from Old Structure

The old flat structure had all files mixed together. This new structure:
- Separates platform-specific code
- Reduces download size by 60-70%
- Makes troubleshooting easier
- Improves code maintenance
