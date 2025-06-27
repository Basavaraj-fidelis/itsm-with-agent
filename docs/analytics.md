
# Analytics Module

## Overview

The Analytics module provides comprehensive reporting and business intelligence capabilities for the ITSM system. It offers real-time dashboards, historical trend analysis, custom report generation, and data visualization tools to help organizations make data-driven decisions about their IT operations.

## Key Features

### Real-time Analytics
- **Live Dashboards**: Real-time performance metrics and KPIs
- **Streaming Data**: WebSocket-based real-time data updates
- **Performance Monitoring**: System health and performance indicators
- **Alert Analytics**: Alert volume, resolution times, and trends
- **User Activity**: Login patterns, session analytics, and usage metrics

### Historical Reporting
- **Trend Analysis**: Long-term performance and usage trends
- **Comparative Reports**: Period-over-period comparisons
- **Capacity Planning**: Resource utilization forecasting
- **SLA Reporting**: Service level agreement compliance tracking
- **Custom Time Ranges**: Flexible date range selection

### Report Generation
- **Automated Reports**: Scheduled report generation and distribution
- **Custom Reports**: User-defined report templates
- **Multiple Formats**: PDF, Excel, CSV, and Word document export
- **Interactive Dashboards**: Drill-down capabilities and filtering
- **Data Visualization**: Charts, graphs, and statistical displays

## Dashboard Components

### System Health Dashboard
Real-time overview of IT infrastructure health:

```http
GET /api/analytics/realtime
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "timestamp": "2024-01-15T10:30:00Z",
    "cpu_usage": 45.2,
    "memory_usage": 62.8,
    "disk_usage": 78.3,
    "active_devices": 12,
    "alerts_last_hour": 1,
    "ticket_volume_24h": 45,
    "resolution_rate": 0.87,
    "user_satisfaction": 4.2
  }
}
```

### Performance Analytics
```http
GET /api/analytics/performance?timeRange=7d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "perf-001",
    "title": "Performance Summary",
    "time_range": "7d",
    "data": {
      "avg_cpu_usage": 52.3,
      "peak_cpu_usage": 89.1,
      "avg_memory_usage": 68.7,
      "peak_memory_usage": 94.2,
      "device_uptime": 0.987,
      "response_times": {
        "avg": 145,
        "p50": 120,
        "p95": 450,
        "p99": 890
      },
      "trend_data": [
        {
          "timestamp": "2024-01-14T00:00:00Z",
          "cpu": 48.5,
          "memory": 65.2,
          "disk": 75.1
        }
      ]
    }
  }
}
```

## Report Types

### Service Desk Analytics
Comprehensive ticket and service desk performance analysis:

```http
GET /api/analytics/ticket-analytics?timeRange=30d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "report": {
    "title": "Ticket Analytics Report",
    "time_range": "30d",
    "data": {
      "total_tickets": 1245,
      "resolved_tickets": 1087,
      "resolution_rate": 0.873,
      "avg_resolution_time": "4.2 hours",
      "sla_compliance": 0.94,
      "ticket_trends": {
        "by_type": {
          "incident": 456,
          "request": 567,
          "problem": 123,
          "change": 99
        },
        "by_priority": {
          "critical": 45,
          "high": 234,
          "medium": 567,
          "low": 399
        },
        "by_status": {
          "resolved": 1087,
          "open": 158
        }
      },
      "agent_performance": [
        {
          "agent": "tech1@company.com",
          "tickets_resolved": 145,
          "avg_resolution_time": "3.2 hours",
          "satisfaction_score": 4.6
        }
      ],
      "customer_satisfaction": {
        "average_rating": 4.2,
        "response_rate": 0.68,
        "promoter_score": 8.1
      }
    }
  }
}
```

### Asset Inventory Analytics
```http
GET /api/analytics/asset-inventory
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "report": {
    "title": "Asset Inventory Report",
    "data": {
      "total_devices": 245,
      "device_types": {
        "servers": 45,
        "workstations": 156,
        "laptops": 34,
        "network_devices": 10
      },
      "operating_systems": {
        "Windows 11": 145,
        "Windows 10": 67,
        "Windows Server 2022": 23,
        "Linux": 10
      },
      "hardware_age": {
        "0-2_years": 89,
        "2-4_years": 123,
        "4-6_years": 25,
        "6+_years": 8
      },
      "software_licenses": {
        "total_licenses": 1250,
        "used_licenses": 890,
        "utilization_rate": 0.712,
        "compliance_status": "compliant"
      },
      "warranty_status": {
        "under_warranty": 198,
        "expired_warranty": 47,
        "expiring_soon": 12
      }
    }
  }
}
```

### Security Compliance Report
```http
GET /api/analytics/security-compliance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "report": {
    "title": "Security Compliance Report",
    "data": {
      "overall_compliance": 0.87,
      "security_metrics": {
        "devices_with_antivirus": 0.98,
        "devices_with_firewall": 0.95,
        "updated_devices": 0.89,
        "encrypted_devices": 0.76
      },
      "vulnerabilities": {
        "critical": 5,
        "high": 23,
        "medium": 45,
        "low": 89
      },
      "patch_compliance": {
        "up_to_date": 0.82,
        "pending_patches": 67,
        "overdue_patches": 12
      },
      "access_controls": {
        "mfa_enabled": 0.89,
        "password_policy_compliant": 0.94,
        "inactive_accounts": 12
      }
    }
  }
}
```

## Custom Report Generation

### Create Custom Report
```http
POST /api/analytics/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "reportType": "performance",
  "timeRange": "30d",
  "format": "pdf",
  "filters": {
    "device_types": ["servers"],
    "departments": ["IT", "Engineering"]
  },
  "metrics": [
    "cpu_usage",
    "memory_usage",
    "disk_usage",
    "uptime"
  ]
}
```

**Response (PDF):**
Binary PDF file with Content-Type: application/pdf

### Scheduled Reports
```http
POST /api/analytics/schedules
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Weekly Performance Report",
  "report_type": "performance",
  "schedule": "0 9 * * 1",
  "recipients": ["manager@company.com", "admin@company.com"],
  "format": "pdf",
  "parameters": {
    "timeRange": "7d",
    "include_trends": true
  }
}
```

## Data Visualization

### Chart Types
The analytics module supports various chart types:

- **Line Charts**: Time-series data and trends
- **Bar Charts**: Categorical data comparisons
- **Pie Charts**: Distribution and proportion analysis
- **Heatmaps**: Activity patterns and density visualization
- **Scatter Plots**: Correlation analysis
- **Gauge Charts**: KPI and metric displays

### Interactive Features
- **Drill-down**: Click to view detailed data
- **Filtering**: Dynamic data filtering
- **Zoom**: Time range zoom and pan
- **Export**: Export charts as images
- **Real-time Updates**: Live data streaming

### Example Chart Configuration
```typescript
const chartConfig = {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      label: 'CPU Usage %',
      data: [45, 52, 48, 61, 55],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Server CPU Usage Trends'
      }
    }
  }
};
```

## Data Export Options

### Export Formats
Support for multiple export formats:

```http
GET /api/analytics/export?format=csv&report=performance&period=30d
Authorization: Bearer <token>
```

**CSV Format:**
```csv
Date,Device,CPU Usage,Memory Usage,Disk Usage
2024-01-15,server-01,45.2,68.3,75.1
2024-01-15,server-02,52.1,72.4,68.9
```

**Excel Format (XLSX):**
- Multiple worksheets for different data types
- Formatted cells with conditional formatting
- Charts and graphs included
- Summary statistics

**PDF Format:**
- Professional report layout
- Executive summary
- Charts and visualizations
- Detailed data tables

## Trend Analysis

### Predictive Analytics
```http
GET /api/analytics/trends?metric=cpu&timeRange=90d&forecast=30d
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "trends": {
    "metric": "cpu",
    "historical_data": [
      {"date": "2024-01-01", "value": 45.2},
      {"date": "2024-01-02", "value": 47.1}
    ],
    "forecast_data": [
      {"date": "2024-02-01", "predicted_value": 52.3, "confidence": 0.85},
      {"date": "2024-02-02", "predicted_value": 53.1, "confidence": 0.84}
    ],
    "trend_direction": "increasing",
    "growth_rate": 0.023,
    "seasonality": {
      "detected": true,
      "period": "weekly",
      "peak_days": ["Tuesday", "Wednesday"]
    }
  }
}
```

### Capacity Planning
```http
GET /api/analytics/capacity
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "recommendations": {
    "cpu_capacity": {
      "current_utilization": 0.65,
      "projected_utilization_6m": 0.78,
      "recommendation": "Consider CPU upgrade in 4-5 months",
      "confidence": 0.82
    },
    "memory_capacity": {
      "current_utilization": 0.72,
      "projected_utilization_6m": 0.89,
      "recommendation": "Memory upgrade needed within 3 months",
      "confidence": 0.88
    },
    "storage_capacity": {
      "current_utilization": 0.45,
      "projected_utilization_6m": 0.67,
      "recommendation": "Storage capacity adequate for 12+ months",
      "confidence": 0.75
    }
  }
}
```

## API Performance Monitoring

### Query Optimization
Monitor and optimize analytics query performance:

```http
GET /api/analytics/performance-stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "query_performance": {
    "avg_response_time": 245,
    "slow_queries": [
      {
        "query": "complex_ticket_analytics",
        "avg_time": 2340,
        "execution_count": 45
      }
    ],
    "cache_hit_rate": 0.87,
    "concurrent_queries": 12
  },
  "database_stats": {
    "active_connections": 15,
    "query_queue_length": 3,
    "index_usage": 0.94
  }
}
```

### Caching Strategy
- **Redis Caching**: Frequently accessed analytics data
- **Query Result Caching**: Cache expensive query results
- **Dashboard Caching**: Pre-computed dashboard data
- **Report Caching**: Cache generated reports for reuse

## Security and Access Control

### Data Access Control
- **Role-based Filtering**: Users see only authorized data
- **Department Filtering**: Departmental data isolation
- **Sensitive Data Masking**: Hide sensitive information
- **Audit Logging**: Track all analytics access

### Data Privacy
```http
GET /api/analytics/anonymized?report=user-activity
Authorization: Bearer <token>
```

**Response:**
```json
{
  "anonymized_data": true,
  "user_activity": [
    {
      "user_id": "user-***-001",
      "department": "IT",
      "login_count": 45,
      "avg_session_duration": "2:45:30"
    }
  ]
}
```

## Integration and APIs

### External BI Tools
Support for integration with business intelligence platforms:

```bash
# Tableau Integration
curl -H "Authorization: Bearer <token>" \
     -H "Accept: application/json" \
     "http://0.0.0.0:5000/api/analytics/data-source/tableau"

# Power BI Integration
curl -H "Authorization: Bearer <token>" \
     -H "Accept: application/json" \
     "http://0.0.0.0:5000/api/analytics/data-source/powerbi"
```

### Webhook Notifications
Real-time analytics event notifications:

```json
{
  "webhook_url": "https://external-system.com/analytics-webhook",
  "events": [
    "report.generated",
    "threshold.exceeded",
    "anomaly.detected"
  ],
  "payload": {
    "event": "threshold.exceeded",
    "metric": "cpu_usage",
    "value": 95.2,
    "threshold": 90,
    "device": "server-01"
  }
}
```

## Troubleshooting

### Common Issues

**Slow Report Generation**
```bash
# Check database performance
curl -H "Authorization: Bearer <admin-token>" \
     "http://0.0.0.0:5000/api/admin/database/performance"

# Monitor query execution
curl -H "Authorization: Bearer <admin-token>" \
     "http://0.0.0.0:5000/api/admin/analytics/query-log"
```

**Data Inconsistencies**
- Verify data collection processes
- Check ETL job status
- Review data validation rules
- Monitor data source connectivity

**Memory Issues**
- Optimize query complexity
- Implement data pagination
- Use streaming for large datasets
- Monitor server resource usage

### Performance Optimization
```bash
# Rebuild analytics indexes
curl -X POST -H "Authorization: Bearer <admin-token>" \
     "http://0.0.0.0:5000/api/admin/analytics/rebuild-indexes"

# Clear analytics cache
curl -X DELETE -H "Authorization: Bearer <admin-token>" \
     "http://0.0.0.0:5000/api/admin/analytics/cache"

# Generate performance report
curl -H "Authorization: Bearer <admin-token>" \
     "http://0.0.0.0:5000/api/admin/analytics/performance-report"
```
