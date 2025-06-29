
# ITSM Agent Installation Guide

This directory contains the ITSM endpoint agent that collects system information and reports to the central ITSM server.

## Platform Support

- **Windows**: Windows 10/11, Windows Server 2016+
- **Linux**: Ubuntu, CentOS, RHEL, Debian, Fedora
- **macOS**: macOS 10.14+

## Prerequisites

- Python 3.7 or higher
- Administrator/root privileges for installation
- Network connectivity to ITSM server

## Installation

### Windows

1. **Download** the agent package to your Windows machine
2. **Extract** the files to a temporary directory
3. **Edit** `config.ini` with your ITSM server details:
   ```ini
   [api]
   base_url = http://your-itsm-server:5000
   auth_token = your-auth-token-here
   ```
4. **Run** PowerShell as Administrator
5. **Execute** the installation:
   ```powershell
   python install_windows.py
   ```

### Linux

1. **Download** the agent package to your Linux machine
2. **Extract** the files: `tar -xzf itsm-agent.tar.gz`
3. **Edit** `config.ini` with your server details
4. **Run** the installation:
   ```bash
   sudo python3 install_linux.py
   ```

### macOS

1. **Download** the agent package to your Mac
2. **Extract** the files: `tar -xzf itsm-agent.tar.gz`
3. **Edit** `config.ini` with your server details
4. **Run** the installation:
   ```bash
   sudo python3 install_macos.py
   ```

## Configuration

Edit `config.ini` before installation:

```ini
[api]
base_url = http://your-itsm-server:5000
auth_token = your-auth-token-here
timeout = 30

[agent]
collection_interval = 300
log_level = INFO
hostname = auto
```

## Service Management

### Windows
```powershell
# Service management
python itsm_agent.py start
python itsm_agent.py stop
python itsm_agent.py restart

# Or use Windows Services
net start ITSMAgent
net stop ITSMAgent
```

### Linux
```bash
# Service management
sudo systemctl start itsm-agent
sudo systemctl stop itsm-agent
sudo systemctl status itsm-agent

# View logs
sudo journalctl -u itsm-agent -f
```

### macOS
```bash
# Service management
sudo launchctl start com.itsm.agent
sudo launchctl stop com.itsm.agent

# View logs
tail -f /opt/itsm-agent/logs/agent.out
```

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure all collector files are copied during installation
2. **Permission denied**: Run installation with administrator/root privileges
3. **Network connectivity**: Check firewall settings and server URL
4. **Python version**: Ensure Python 3.7+ is installed

### Log Files

- **Windows**: `C:\Program Files\ITSM Agent\logs\itsm_agent.log`
- **Linux**: `/opt/itsm-agent/logs/itsm_agent.log`
- **macOS**: `/opt/itsm-agent/logs/agent.out`

### Manual Testing

Test the agent manually before service installation:

```bash
# Navigate to installation directory
cd /opt/itsm-agent  # Linux/macOS
cd "C:\Program Files\ITSM Agent"  # Windows

# Run agent manually
python3 itsm_agent.py  # Linux/macOS
python itsm_agent.py   # Windows
```

## Data Collected

The agent collects:
- System information (OS, hardware, network)
- Performance metrics (CPU, memory, disk usage)
- Security status (firewall, antivirus)
- Installed software and patches
- USB devices and virtualization info
- Active network connections

## Security

- Agent uses HTTPS for all communications
- Authentication tokens are required
- No sensitive data is stored locally
- All communications are encrypted

## Support

For technical support, contact your system administrator or check the ITSM server logs for connectivity issues.
