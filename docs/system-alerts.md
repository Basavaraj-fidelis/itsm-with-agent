
# System Alerts Module

## Overview

The System Alerts module provides intelligent monitoring and alerting capabilities for your IT infrastructure. It proactively identifies issues, sends notifications to appropriate personnel, and maintains a comprehensive alert management system with escalation, correlation, and automated response capabilities.

## Key Features

### Intelligent Alerting
- **Threshold-based Alerts**: CPU, memory, disk, and network thresholds
- **Anomaly Detection**: ML-powered abnormal behavior detection
- **Correlation Engine**: Related alert grouping and deduplication
- **Predictive Alerts**: Forecasting-based proactive alerting
- **Custom Alert Rules**: User-defined alerting conditions

### Multi-channel Notifications
- **Email Notifications**: Rich HTML and plain text emails
- **SMS Alerts**: Critical alert SMS notifications
- **Webhook Integration**: Real-time notifications to external systems
- **Mobile Push**: Mobile app push notifications
- **Slack/Teams**: Team collaboration platform integration

### Alert Lifecycle Management
- **Auto-acknowledgment**: Automated alert acknowledgment
- **Escalation Workflows**: Time-based and severity-based escalation
- **Resolution Tracking**: Alert resolution and root cause documentation
- **SLA Compliance**: Alert response time monitoring
- **Audit Trail**: Complete alert history and actions

## Alert Types

### Performance Alerts
System performance threshold violations:

```json
{
  "alert_type": "performance",
  "severity": "critical",
  "message": "High CPU usage: 95.2% on server-01",
  "device_id": "dev-001",
  "metric": "cpu_usage",
  "threshold": 90,
  "current_value": 95.2,
  "duration": "5 minutes"
}
```

### Availability Alerts
System availability and connectivity issues:

```json
{
  "alert_type": "availability",
  "severity": "high",
  "message": "Server offline: server-01 not responding",
  "device_id": "dev-001",
  "last_seen": "2024-01-15T10:25:00Z",
  "downtime_duration": "00:15:30"
}
```

### Security Alerts
Security-related events and policy violations:

```json
{
  "alert_type": "security",
  "severity": "critical",
  "message": "Multiple failed login attempts from 192.168.1.50",
  "device_id": "dev-005",
  "source_ip": "192.168.1.50",
  "failed_attempts": 15,
  "time_window": "10 minutes"
}
```

### Configuration Alerts
Unauthorized configuration changes:

```json
{
  "alert_type": "configuration",
  "severity": "medium",
  "message": "Registry modification detected on workstation-03",
  "device_id": "dev-003",
  "changed_key": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion",
  "change_type": "modification"
}
```

## API Reference

### Get Active Alerts
```http
GET /api/alerts?status=active&severity=critical
Authorization: Bearer <token>
```

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert-001",
      "device_id": "dev-001",
      "device_hostname": "server-01",
      "category": "performance",
      "severity": "critical",
      "message": "Critical CPU usage: 98.5%",
      "triggered_at": "2024-01-15T10:30:00Z",
      "is_active": true,
      "acknowledged": false,
      "metadata": {
        "cpu_usage": 98.5,
        "threshold": 95,
        "metric": "cpu"
      }
    }
  ],
  "total": 1,
  "summary": {
    "critical": 1,
    "high": 3,
    "medium": 7,
    "low": 12
  }
}
```

### Create Alert Rule
```http
POST /api/alerts/rules
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Critical Memory Usage",
  "description": "Alert when memory usage exceeds 95%",
  "condition": "memory_usage > 95",
  "severity": "critical",
  "category": "performance",
  "enabled": true,
  "notification_channels": ["email", "sms"],
  "escalation_time": 600,
  "device_filter": {
    "tags": ["production", "critical"]
  }
}
```

### Acknowledge Alert
```http
POST /api/alerts/{id}/acknowledge
Content-Type: application/json
Authorization: Bearer <token>

{
  "acknowledged_by": "admin@company.com",
  "comment": "Investigating high CPU usage issue"
}
```

### Resolve Alert
```http
POST /api/alerts/{id}/resolve
Content-Type: application/json
Authorization: Bearer <token>

{
  "resolved_by": "tech@company.com",
  "resolution": "Restarted CPU-intensive service",
  "root_cause": "Memory leak in application process"
}
```

## Alert Configuration

### Threshold Configuration
Define performance thresholds for different device types:

```json
{
  "alert_thresholds": {
    "servers": {
      "cpu_critical": 95,
      "cpu_warning": 80,
      "memory_critical": 90,
      "memory_warning": 75,
      "disk_critical": 95,
      "disk_warning": 85
    },
    "workstations": {
      "cpu_critical": 90,
      "cpu_warning": 75,
      "memory_critical": 85,
      "memory_warning": 70,
      "disk_critical": 90,
      "disk_warning": 80
    }
  }
}
```

### Notification Templates
Customize alert notification templates:

```html
<!-- Email template example -->
<html>
<body>
  <h2>Alert: {{ alert.severity | upper }}</h2>
  <p><strong>Device:</strong> {{ alert.device_hostname }}</p>
  <p><strong>Message:</strong> {{ alert.message }}</p>
  <p><strong>Time:</strong> {{ alert.triggered_at | format_date }}</p>
  <p><strong>Current Value:</strong> {{ alert.metadata.current_value }}%</p>
  
  <div style="margin-top: 20px;">
    <a href="{{ dashboard_url }}/alerts/{{ alert.id }}" 
       style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none;">
      View Alert Details
    </a>
  </div>
</body>
</html>
```

## Escalation Workflows

### Escalation Rules
Define escalation paths based on severity and time:

```json
{
  "escalation_rules": [
    {
      "name": "Critical Server Alerts",
      "condition": "severity == 'critical' AND category == 'performance'",
      "escalation_path": [
        {
          "level": 1,
          "delay": 0,
          "recipients": ["oncall-primary@company.com"],
          "channels": ["email", "sms"]
        },
        {
          "level": 2,
          "delay": 300,
          "recipients": ["oncall-secondary@company.com"],
          "channels": ["email", "sms", "phone"]
        },
        {
          "level": 3,
          "delay": 900,
          "recipients": ["manager@company.com"],
          "channels": ["email", "phone"]
        }
      ]
    }
  ]
}
```

### Auto-escalation Logic
```typescript
// Escalation processing example
const processEscalation = async (alert: Alert) => {
  const timeSinceTriggered = Date.now() - alert.triggered_at.getTime();
  const escalationRule = findEscalationRule(alert);
  
  for (const level of escalationRule.escalation_path) {
    if (timeSinceTriggered >= level.delay * 1000 && !alert.escalated_to_level[level.level]) {
      await sendNotifications(level.recipients, level.channels, alert);
      await markEscalationLevel(alert.id, level.level);
    }
  }
};
```

## Alert Correlation

### Correlation Engine
Reduce alert noise by correlating related alerts:

```typescript
// Alert correlation example
const correlateAlerts = (newAlert: Alert, existingAlerts: Alert[]) => {
  const correlationRules = [
    {
      name: "Same Device Performance",
      condition: (a1, a2) => 
        a1.device_id === a2.device_id && 
        a1.category === 'performance' && 
        a2.category === 'performance',
      action: "group"
    },
    {
      name: "Network Outage Impact",
      condition: (a1, a2) => 
        a1.message.includes('network') && 
        a2.category === 'availability',
      action: "suppress"
    }
  ];
  
  return applyCorrelationRules(newAlert, existingAlerts, correlationRules);
};
```

### Correlation Types
- **Grouping**: Combine related alerts into a single notification
- **Suppression**: Suppress secondary alerts caused by primary issues
- **Dependency**: Understanding alert dependencies and relationships
- **Time-based**: Correlate alerts occurring within time windows

## Automated Response

### Auto-remediation Actions
Define automated responses to common alerts:

```json
{
  "auto_remediation": [
    {
      "alert_pattern": "high_memory_usage",
      "conditions": {
        "severity": "critical",
        "metric": "memory_usage",
        "threshold": 95
      },
      "actions": [
        {
          "type": "script",
          "script": "restart_service.ps1",
          "parameters": {
            "service_name": "AppService"
          }
        },
        {
          "type": "notification",
          "message": "Automated service restart initiated"
        }
      ]
    }
  ]
}
```

### Integration Actions
- **Ticket Creation**: Automatically create service desk tickets
- **Runbook Execution**: Execute predefined response procedures
- **API Calls**: Trigger external system actions
- **Script Execution**: Run custom remediation scripts

## Analytics and Reporting

### Alert Metrics
Track key alert performance indicators:

```http
GET /api/analytics/alerts/metrics?period=7d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "period": "7d",
  "total_alerts": 1250,
  "by_severity": {
    "critical": 45,
    "high": 123,
    "medium": 456,
    "low": 626
  },
  "by_category": {
    "performance": 567,
    "availability": 234,
    "security": 123,
    "configuration": 326
  },
  "resolution_times": {
    "average": "00:45:30",
    "median": "00:25:15",
    "p95": "02:15:45"
  },
  "escalation_rate": 0.12,
  "auto_resolved": 0.35
}
```

### MTTR Analysis
Mean Time to Resolution tracking:

```json
{
  "mttr_by_severity": {
    "critical": "00:15:30",
    "high": "01:30:45",
    "medium": "04:15:20",
    "low": "24:30:15"
  },
  "mttr_by_category": {
    "performance": "02:45:30",
    "availability": "00:30:15",
    "security": "01:15:45",
    "configuration": "03:30:20"
  }
}
```

## Security Considerations

### Alert Security
- **Access Control**: Role-based alert visibility
- **Data Encryption**: Encrypted alert data transmission
- **Audit Logging**: Complete alert action audit trail
- **Rate Limiting**: Alert generation rate limiting

### Sensitive Data Handling
- **Data Sanitization**: Remove sensitive data from alerts
- **Anonymization**: Anonymous alert reporting options
- **Compliance**: GDPR, HIPAA alert data compliance
- **Retention**: Configurable alert data retention policies

## Troubleshooting

### Common Issues

**Alerts Not Triggering**
```bash
# Check alert rule configuration
curl -H "Authorization: Bearer <token>" \
     "http://0.0.0.0:5000/api/alerts/rules"

# Verify device reporting
curl -H "Authorization: Bearer <token>" \
     "http://0.0.0.0:5000/api/devices/dev-001/reports?limit=5"

# Test alert processing
curl -X POST -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"test": "alert"}' \
     "http://0.0.0.0:5000/api/alerts/test"
```

**Notification Failures**
- Check SMTP server configuration
- Verify webhook endpoint availability
- Test SMS gateway connectivity
- Review notification template syntax

**Performance Issues**
- Monitor alert processing queue length
- Check database query performance
- Review correlation rule complexity
- Optimize notification batch processing

### Debugging Tools
```bash
# Monitor alert processing performance
curl -H "Authorization: Bearer <token>" \
     "http://0.0.0.0:5000/api/admin/alerts/stats"

# Export alert data for analysis
curl -H "Authorization: Bearer <token>" \
     "http://0.0.0.0:5000/api/alerts/export?format=csv&period=30d"
```
