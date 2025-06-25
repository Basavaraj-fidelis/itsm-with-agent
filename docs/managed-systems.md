
# Managed Systems Module

## Overview

The Managed Systems module provides comprehensive monitoring and management of IT infrastructure, including servers, workstations, network devices, and other endpoints. It offers real-time visibility into system health, performance metrics, and automated alerting for proactive issue resolution.

## Key Features

### Device Discovery & Inventory
- **Automated Discovery**: Network scanning and device detection
- **Agent-based Monitoring**: Lightweight agents for detailed system information
- **Asset Classification**: Automatic categorization of device types
- **Hardware Inventory**: CPU, memory, storage, and peripheral tracking
- **Software Inventory**: Installed applications and license tracking

### Real-time Monitoring
- **System Health**: CPU, memory, disk, and network utilization
- **Service Monitoring**: Critical service status and availability
- **Performance Metrics**: Historical trend analysis and forecasting
- **Custom Metrics**: User-defined monitoring parameters
- **Threshold Management**: Configurable alerting thresholds

### Remote Management
- **Remote Desktop**: VNC, RDP, and SSH access
- **File Transfer**: Secure file upload/download capabilities
- **Command Execution**: Remote command and script execution
- **Software Deployment**: Automated software installation and updates
- **Configuration Management**: Centralized configuration deployment

## Agent Architecture

### Windows Agent
The Windows agent provides comprehensive system monitoring:

```python
# Agent configuration example
[api]
base_url = http://0.0.0.0:5000
auth_token = your-auth-token

[agent]
collection_interval = 60
max_retry_attempts = 3
log_level = INFO

[monitoring]
cpu_threshold = 80
memory_threshold = 85
disk_threshold = 90
```

### Linux Agent
Similar functionality for Linux/Unix systems:

```bash
# Install Linux agent
sudo python3 itsm_agent.py install
sudo systemctl start itsm-agent
sudo systemctl enable itsm-agent
```

### Agent Data Collection
Agents collect and report the following information:

```json
{
  "hostname": "workstation-01",
  "ip_address": "192.168.1.100",
  "os_info": {
    "name": "Windows 11 Pro",
    "version": "22H2",
    "build": "22621"
  },
  "hardware": {
    "cpu": "Intel Core i7-10700K",
    "memory_total": 16777216,
    "disk_total": 512000000
  },
  "system_health": {
    "cpu_percent": 25.5,
    "memory_percent": 68.2,
    "disk_percent": 45.8
  },
  "processes": [
    {
      "name": "explorer.exe",
      "cpu_percent": 1.2,
      "memory_mb": 156
    }
  ],
  "network": {
    "interfaces": [
      {
        "name": "Ethernet",
        "ip_address": "192.168.1.100",
        "mac_address": "00:1A:2B:3C:4D:5E"
      }
    ]
  }
}
```

## API Reference

### Get All Devices
```http
GET /api/devices
Authorization: Bearer <token>
```

**Response:**
```json
{
  "devices": [
    {
      "id": "dev-001",
      "hostname": "server-01",
      "ip_address": "192.168.1.10",
      "status": "online",
      "assigned_user": "john.doe@company.com",
      "os_name": "Windows Server 2022",
      "last_seen": "2024-01-15T10:30:00Z",
      "latest_report": {
        "cpu_usage": 45.2,
        "memory_usage": 72.1,
        "disk_usage": 35.8
      }
    }
  ]
}
```

### Get Device Details
```http
GET /api/devices/{id}
Authorization: Bearer <token>
```

### Report System Information (Agent)
```http
POST /api/report
Content-Type: application/json

{
  "hostname": "workstation-01",
  "system_info": { /* detailed system data */ },
  "performance_metrics": { /* performance data */ }
}
```

### Get Device Reports
```http
GET /api/devices/{id}/reports?limit=100
Authorization: Bearer <token>
```

## Monitoring Capabilities

### Performance Metrics
- **CPU Utilization**: Real-time and historical CPU usage
- **Memory Usage**: RAM utilization and available memory
- **Disk I/O**: Read/write operations and disk space
- **Network Traffic**: Bandwidth utilization and packet statistics
- **Process Monitoring**: Running processes and resource consumption

### System Health Checks
- **Service Status**: Critical service availability monitoring
- **Event Log Analysis**: Windows event log parsing and analysis
- **Hardware Health**: Temperature, fan speed, and hardware errors
- **Security Status**: Antivirus status, firewall status, updates
- **License Compliance**: Software license usage and compliance

### Custom Monitoring
Define custom metrics and thresholds:

```json
{
  "custom_metrics": [
    {
      "name": "Application Response Time",
      "script": "measure_app_response.py",
      "threshold": 5000,
      "unit": "milliseconds",
      "alert_on": "greater_than"
    }
  ]
}
```

## Alerting System

### Alert Types
- **Performance Alerts**: CPU, memory, disk usage thresholds
- **Availability Alerts**: System offline or unresponsive
- **Security Alerts**: Security policy violations or threats
- **Configuration Alerts**: Unauthorized configuration changes
- **Application Alerts**: Application-specific error conditions

### Alert Configuration
```http
POST /api/alerts/rules
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "High CPU Alert",
  "condition": "cpu_usage > 90",
  "severity": "critical",
  "notification_channels": ["email", "sms"],
  "escalation_time": 900,
  "auto_resolve": true
}
```

### Alert Management
- **Acknowledgment**: Manual alert acknowledgment by operators
- **Escalation**: Automatic escalation based on time and severity
- **Suppression**: Temporary alert suppression during maintenance
- **Correlation**: Related alert grouping and deduplication

## Asset Management Integration

### Hardware Tracking
- **Automatic Discovery**: Hardware components automatically detected
- **Change Detection**: Hardware modification alerts
- **Warranty Tracking**: Hardware warranty expiration monitoring
- **Lifecycle Management**: Hardware refresh planning and tracking

### Software Inventory
- **Installed Software**: Complete application inventory
- **License Tracking**: Software license usage and compliance
- **Update Management**: Software update status and scheduling
- **Security Patches**: Critical security update tracking

### Example Asset Data
```json
{
  "device_id": "dev-001",
  "hardware": {
    "manufacturer": "Dell Inc.",
    "model": "OptiPlex 7090",
    "serial_number": "ABC123456",
    "warranty_expiry": "2025-12-31"
  },
  "software": [
    {
      "name": "Microsoft Office 365",
      "version": "16.0.15629.20196",
      "license_key": "XXXXX-XXXXX-XXXXX",
      "install_date": "2024-01-10"
    }
  ]
}
```

## Security Features

### Access Control
- **Device Permissions**: Role-based device access control
- **Remote Access**: Secure remote connection protocols
- **Audit Logging**: Complete audit trail of all device interactions
- **Multi-factor Authentication**: MFA for sensitive operations

### Data Protection
- **Encryption**: All agent communication encrypted in transit
- **Certificate Management**: PKI-based certificate authentication
- **Data Anonymization**: Personal data protection and anonymization
- **Compliance**: SOC2, ISO27001, and other compliance frameworks

### Security Monitoring
- **USB Device Tracking**: USB device insertion/removal monitoring
- **Process Monitoring**: Suspicious process detection
- **Network Monitoring**: Unusual network activity detection
- **Configuration Drift**: Unauthorized configuration changes

## Remote Access Module

### Connection Types
- **VNC**: Cross-platform remote desktop access
- **RDP**: Windows Remote Desktop Protocol
- **SSH**: Secure shell access for Linux/Unix systems
- **Web Terminal**: Browser-based terminal access

### Remote Access API
```http
POST /api/agents/{id}/remote-connect
Content-Type: application/json
Authorization: Bearer <token>

{
  "connection_type": "vnc",
  "port": 5900,
  "use_tunnel": false
}
```

**Response:**
```json
{
  "success": true,
  "connection_info": {
    "hostname": "workstation-01",
    "ip_address": "192.168.1.100",
    "port": 5900,
    "connection_type": "vnc",
    "instructions": "Ensure VNC server is running on the target machine"
  }
}
```

## Performance Optimization

### Agent Optimization
- **Lightweight Design**: Minimal resource consumption
- **Efficient Data Collection**: Optimized data gathering algorithms
- **Compression**: Data compression for network efficiency
- **Caching**: Local caching to reduce server load

### Scalability
- **Horizontal Scaling**: Support for thousands of managed devices
- **Load Balancing**: Distribute agent connections across servers
- **Database Optimization**: Efficient data storage and retrieval
- **Monitoring Architecture**: Hierarchical monitoring for large deployments

## Troubleshooting

### Agent Issues

**Agent Not Reporting**
```bash
# Check agent service status
systemctl status itsm-agent

# View agent logs
tail -f /var/log/itsm-agent/agent.log

# Test connectivity
curl -H "Authorization: Bearer <token>" \
     http://0.0.0.0:5000/api/health
```

**High Resource Usage**
- Monitor agent CPU and memory consumption
- Adjust collection intervals
- Review custom monitoring scripts
- Check for memory leaks in agent processes

**Connection Issues**
- Verify network connectivity
- Check firewall rules
- Validate SSL certificates
- Test DNS resolution

### Performance Monitoring
```bash
# Monitor device performance
curl -H "Authorization: Bearer <token>" \
     "http://0.0.0.0:5000/api/devices/dev-001/reports?limit=10"

# Check system health
curl -H "Authorization: Bearer <token>" \
     "http://0.0.0.0:5000/api/analytics/devices/health"
```

## Integration Points

### External Monitoring Tools
- **SNMP Integration**: Integration with SNMP-enabled devices
- **Syslog Collection**: Centralized log collection and analysis
- **APM Tools**: Application Performance Monitoring integration
- **Cloud Monitoring**: AWS CloudWatch, Azure Monitor integration

### Automation Platforms
- **Ansible Integration**: Automated configuration management
- **PowerShell DSC**: Windows configuration management
- **Puppet/Chef**: Infrastructure as code integration
- **Custom Scripts**: Custom automation script execution
