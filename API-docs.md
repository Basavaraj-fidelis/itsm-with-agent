
# ITSM System API Documentation

## Overview

This document provides comprehensive API documentation for the ITSM (IT Service Management) system. The API follows RESTful principles and uses JSON for request/response payloads.

**Base URL**: `https://your-domain.replit.app/api`
**Authentication**: Bearer Token (JWT)
**Content-Type**: `application/json`

## Authentication

### POST /api/auth/login
**Description**: Authenticate user and receive JWT token

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "useActiveDirectory": false
}
```

**Response** (200 OK):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "technician",
    "department": "IT Support"
  }
}
```

### POST /api/auth/signup
**Description**: Create new user account

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "user",
  "department": "IT",
  "phone": "+1234567890"
}
```

**Response** (201 Created):
```json
{
  "message": "Account created successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "department": "IT"
  }
}
```

### GET /api/auth/verify
**Description**: Verify JWT token and get user info
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "technician",
  "department": "IT Support",
  "is_active": true
}
```

### POST /api/auth/logout
**Description**: Logout user (client-side token invalidation)

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

## Dashboard

### GET /api/dashboard/summary
**Description**: Get dashboard summary statistics
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "total_devices": 156,
  "online_devices": 142,
  "total_alerts": 8,
  "critical_alerts": 2,
  "open_tickets": 23,
  "resolved_tickets": 187,
  "recent_activity": [
    {
      "type": "alert",
      "message": "High CPU usage on server-01",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Devices Management

### GET /api/devices
**Description**: Get all managed devices
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "hostname": "DESKTOP-ABC123",
    "assigned_user": "john.doe",
    "os_name": "Windows 11",
    "os_version": "22H2",
    "ip_address": "192.168.1.100",
    "status": "online",
    "last_seen": "2024-01-15T10:45:00Z",
    "latest_report": {
      "cpu_usage": "25.5",
      "memory_usage": "68.2",
      "disk_usage": "45.8",
      "network_io": "1024000",
      "collected_at": "2024-01-15T10:45:00Z"
    }
  }
]
```

### GET /api/devices/:id
**Description**: Get specific device details
**Headers**: `Authorization: Bearer <token>`
**Parameters**: 
- `id` (string): Device ID or hostname

**Response** (200 OK):
```json
{
  "id": "uuid",
  "hostname": "DESKTOP-ABC123",
  "assigned_user": "john.doe",
  "os_name": "Windows 11",
  "os_version": "22H2",
  "ip_address": "192.168.1.100",
  "status": "online",
  "last_seen": "2024-01-15T10:45:00Z",
  "created_at": "2024-01-10T08:00:00Z",
  "latest_report": {
    "cpu_usage": "25.5",
    "memory_usage": "68.2",
    "disk_usage": "45.8",
    "network_io": "1024000",
    "collected_at": "2024-01-15T10:45:00Z",
    "raw_data": {
      "processes": [...],
      "hardware": {...},
      "network": {...}
    }
  }
}
```

### GET /api/devices/:id/reports
**Description**: Get device performance reports
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "device_id": "uuid",
    "collected_at": "2024-01-15T10:45:00Z",
    "cpu_usage": "25.5",
    "memory_usage": "68.2",
    "disk_usage": "45.8",
    "network_io": "1024000"
  }
]
```

### GET /api/devices/:id/usb-devices
**Description**: Get USB devices connected to a specific device
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "device_id": "uuid",
    "device_identifier": "USB\\VID_046D&PID_C52B",
    "description": "USB Composite Device",
    "vendor_id": "046D",
    "product_id": "C52B",
    "manufacturer": "Logitech",
    "serial_number": "ABC123456",
    "device_class": "Human Interface Device",
    "location": "Port 2",
    "speed": "Full Speed",
    "first_seen": "2024-01-15T08:00:00Z",
    "last_seen": "2024-01-15T10:45:00Z",
    "is_connected": true
  }
]
```

### POST /api/report
**Description**: Submit device report from monitoring agent
**Headers**: `Content-Type: application/json`

**Request Body**:
```json
{
  "hostname": "DESKTOP-ABC123",
  "assigned_user": "john.doe",
  "os_info": {
    "name": "Windows",
    "version": "11",
    "build_number": "22621"
  },
  "system_health": {
    "cpu_percent": 25.5,
    "memory_percent": 68.2,
    "disk_percent": 45.8
  },
  "hardware": {
    "cpu": "Intel Core i7-9700K",
    "memory_total": "16GB",
    "disk_total": "1TB"
  },
  "network": {
    "ip_address": "192.168.1.100",
    "interfaces": [...]
  },
  "processes": [...],
  "usb_devices": [...],
  "installed_software": [...]
}
```

**Response** (200 OK):
```json
{
  "message": "Report saved successfully"
}
```

## Alerts Management

### GET /api/alerts
**Description**: Get all active alerts
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "device_id": "uuid",
    "device_hostname": "DESKTOP-ABC123",
    "category": "performance",
    "severity": "high",
    "message": "High CPU usage: 85.2%",
    "metadata": {
      "cpu_usage": 85.2,
      "threshold": 80,
      "metric": "cpu"
    },
    "triggered_at": "2024-01-15T10:30:00Z",
    "resolved_at": null,
    "is_active": true
  }
]
```

### GET /api/alerts/:id
**Description**: Get specific alert details
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "device_id": "uuid",
  "category": "performance",
  "severity": "high",
  "message": "High CPU usage: 85.2%",
  "metadata": {
    "cpu_usage": 85.2,
    "threshold": 80,
    "metric": "cpu"
  },
  "triggered_at": "2024-01-15T10:30:00Z",
  "resolved_at": null,
  "is_active": true
}
```

### POST /api/alerts/:id/resolve
**Description**: Resolve an active alert
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "message": "Alert resolved successfully",
  "alertId": "uuid",
  "success": true,
  "resolvedBy": "user@example.com",
  "resolvedAt": "2024-01-15T11:00:00Z"
}
```

## Tickets Management

### GET /api/tickets
**Description**: Get tickets with optional filters
**Headers**: `Authorization: Bearer <token>`
**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): Filter by ticket type
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `search` (string): Search in title/description

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "ticket_number": "INC-2024-001",
      "title": "Computer won't start",
      "description": "User reports computer won't boot up",
      "type": "incident",
      "status": "open",
      "priority": "high",
      "requester_email": "user@example.com",
      "assigned_to": "tech@example.com",
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T09:30:00Z",
      "resolved_at": null,
      "sla_due_date": "2024-01-16T09:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

### GET /api/tickets/:id
**Description**: Get specific ticket details
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "ticket_number": "INC-2024-001",
  "title": "Computer won't start",
  "description": "User reports computer won't boot up",
  "type": "incident",
  "status": "open",
  "priority": "high",
  "requester_email": "user@example.com",
  "assigned_to": "tech@example.com",
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-01-15T09:30:00Z",
  "resolved_at": null,
  "sla_due_date": "2024-01-16T09:00:00Z",
  "comments": [
    {
      "id": "uuid",
      "author": "tech@example.com",
      "content": "Initial troubleshooting started",
      "created_at": "2024-01-15T09:30:00Z"
    }
  ]
}
```

### POST /api/tickets
**Description**: Create new ticket
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "title": "Printer not working",
  "description": "Office printer is not responding to print jobs",
  "type": "incident",
  "priority": "medium",
  "requester_email": "user@example.com",
  "category": "hardware",
  "urgency": "medium",
  "impact": "medium"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "ticket_number": "INC-2024-002",
  "title": "Printer not working",
  "description": "Office printer is not responding to print jobs",
  "type": "incident",
  "status": "open",
  "priority": "medium",
  "requester_email": "user@example.com",
  "created_at": "2024-01-15T11:00:00Z"
}
```

### PUT /api/tickets/:id
**Description**: Update existing ticket
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "status": "in_progress",
  "assigned_to": "tech@example.com",
  "priority": "high",
  "notes": "Escalating due to business impact"
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "ticket_number": "INC-2024-001",
  "title": "Computer won't start",
  "status": "in_progress",
  "assigned_to": "tech@example.com",
  "priority": "high",
  "updated_at": "2024-01-15T11:30:00Z"
}
```

### DELETE /api/tickets/:id
**Description**: Delete ticket (admin only)
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "message": "Ticket deleted successfully"
}
```

### POST /api/tickets/:id/comments
**Description**: Add comment to ticket
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "content": "Investigated the issue. Hardware failure confirmed.",
  "is_internal": false
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "ticket_id": "uuid",
  "author": "tech@example.com",
  "content": "Investigated the issue. Hardware failure confirmed.",
  "is_internal": false,
  "created_at": "2024-01-15T12:00:00Z"
}
```

### GET /api/tickets/:id/comments
**Description**: Get ticket comments
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "ticket_id": "uuid",
    "author": "tech@example.com",
    "content": "Investigated the issue. Hardware failure confirmed.",
    "is_internal": false,
    "created_at": "2024-01-15T12:00:00Z"
  }
]
```

## User Management

### GET /api/users
**Description**: Get all users with optional filters
**Headers**: `Authorization: Bearer <token>`
**Query Parameters**:
- `search` (string): Search by name or email
- `role` (string): Filter by role

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "technician",
    "department": "IT Support",
    "phone": "+1234567890",
    "is_active": true,
    "created_at": "2024-01-10T08:00:00Z"
  }
]
```

### GET /api/users/:id
**Description**: Get specific user details
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "technician",
  "department": "IT Support",
  "phone": "+1234567890",
  "is_active": true,
  "created_at": "2024-01-10T08:00:00Z",
  "last_login": "2024-01-15T08:30:00Z"
}
```

### POST /api/users
**Description**: Create new user (admin only)
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "role": "user",
  "department": "HR",
  "phone": "+1234567891"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "user",
  "department": "HR",
  "phone": "+1234567891",
  "is_active": true,
  "created_at": "2024-01-15T12:30:00Z"
}
```

### PUT /api/users/:id
**Description**: Update user details
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "John A. Doe",
  "role": "manager",
  "department": "IT Management",
  "is_active": true
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "John A. Doe",
  "email": "user@example.com",
  "role": "manager",
  "department": "IT Management",
  "is_active": true,
  "updated_at": "2024-01-15T13:00:00Z"
}
```

### DELETE /api/users/:id
**Description**: Delete user (admin only)
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "message": "User deleted successfully"
}
```

## Knowledge Base

### GET /api/knowledge-base
**Description**: Get knowledge base articles
**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page
- `category` (string): Filter by category
- `search` (string): Search in title/content
- `status` (string): Filter by status (default: "published")

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "title": "How to Reset Your Password",
    "content": "Follow these steps to reset your password...",
    "category": "Security",
    "status": "published",
    "author_email": "support@example.com",
    "tags": ["password", "security", "account"],
    "views": 156,
    "created_at": "2024-01-10T10:00:00Z",
    "updated_at": "2024-01-12T14:30:00Z"
  }
]
```

### GET /api/knowledge-base/:id
**Description**: Get specific knowledge base article

**Response** (200 OK):
```json
{
  "id": "uuid",
  "title": "How to Reset Your Password",
  "content": "# Password Reset Guide\n\nFollow these steps...",
  "category": "Security",
  "status": "published",
  "author_email": "support@example.com",
  "tags": ["password", "security", "account"],
  "views": 157,
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-12T14:30:00Z"
}
```

## Notifications

### GET /api/notifications
**Description**: Get user notifications
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "type": "ticket_update",
    "title": "Ticket INC-2024-001 updated",
    "message": "Computer won't start - Status: in_progress",
    "timestamp": "2024-01-15T11:30:00Z",
    "read": false
  }
]
```

### POST /api/notifications/:id/read
**Description**: Mark notification as read
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "message": "Notification marked as read"
}
```

### POST /api/notifications/mark-all-read
**Description**: Mark all notifications as read
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "message": "All notifications marked as read",
  "success": true,
  "markedCount": 5
}
```

### DELETE /api/notifications/:id
**Description**: Delete notification
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "message": "Notification deleted"
}
```

## Automation & Orchestration

### GET /api/automation/software-packages
**Description**: Get available software packages for deployment
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "chrome",
    "name": "Google Chrome",
    "version": "Latest",
    "description": "Web browser",
    "category": "Productivity",
    "size_mb": 95,
    "supported_os": ["Windows", "macOS", "Linux"]
  }
]
```

### POST /api/automation/deploy-software
**Description**: Schedule software deployment
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "device_ids": ["uuid1", "uuid2"],
  "package_id": "chrome",
  "scheduled_time": "2024-01-16T02:00:00Z"
}
```

**Response** (200 OK):
```json
{
  "deployment_ids": ["deploy-uuid"],
  "message": "Software deployment scheduled",
  "target_devices": 2,
  "scheduled_time": "2024-01-16T02:00:00Z"
}
```

### GET /api/automation/deployment/:deploymentId
**Description**: Get deployment status
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "id": "deploy-uuid",
  "package_id": "chrome",
  "status": "in_progress",
  "target_devices": 2,
  "completed_devices": 1,
  "failed_devices": 0,
  "scheduled_time": "2024-01-16T02:00:00Z",
  "started_at": "2024-01-16T02:00:15Z"
}
```

### GET /api/automation/deployments
**Description**: Get all deployments
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "category": "automation",
    "severity": "info",
    "message": "Software deployment: Chrome",
    "metadata": {
      "package_id": "chrome",
      "status": "completed",
      "target_devices": 2
    },
    "triggered_at": "2024-01-16T02:00:00Z"
  }
]
```

## Remote Access

### POST /api/agents/:id/remote-connect
**Description**: Initiate remote connection to device
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "connection_type": "vnc",
  "port": 5900,
  "use_tunnel": false,
  "jump_host": null
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "connection_info": {
    "hostname": "DESKTOP-ABC123",
    "ip_address": "192.168.1.100",
    "port": 5900,
    "connection_type": "vnc",
    "instructions": "Ensure VNC server and websockify are running on the target machine",
    "is_private_ip": true,
    "tunnel_required": true,
    "tunnel_suggestions": [
      {
        "method": "ssh_tunnel",
        "command": "ssh -L 5900:192.168.1.100:5900 jump_host",
        "description": "Create SSH tunnel via jump host"
      }
    ]
  }
}
```

### GET /api/agents/:id/connection-status
**Description**: Check agent connection status
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "agent_online": true,
  "last_seen": "2024-01-15T12:45:00Z",
  "minutes_since_contact": 2,
  "ip_address": "192.168.1.100",
  "hostname": "DESKTOP-ABC123",
  "ready_for_connection": true
}
```

### POST /api/agents/:id/test-connectivity
**Description**: Test connectivity to agent
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "port": 5900
}
```

**Response** (200 OK):
```json
{
  "reachable": true,
  "port_open": true,
  "response_time": 75.5,
  "tested_at": "2024-01-15T13:00:00Z"
}
```

## Analytics & Reporting

### POST /api/analytics/generate-report
**Description**: Generate system report
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "type": "performance",
  "period": "last_30_days",
  "format": "json"
}
```

**Response** (200 OK):
```json
{
  "title": "Performance Summary Report",
  "period": "last_30_days",
  "generated_at": "2024-01-15T13:00:00Z",
  "devices": [
    {
      "hostname": "DESKTOP-ABC123",
      "cpu_usage": "25.5",
      "memory_usage": "68.2",
      "disk_usage": "45.8",
      "status": "online"
    }
  ]
}
```

### POST /api/analytics/download-report
**Description**: Download pre-generated report
**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "reportName": "Monthly Performance Report",
  "format": "pdf"
}
```

**Response**: Binary file download with appropriate Content-Type and Content-Disposition headers.

## Network Discovery

### GET /api/network/topology
**Description**: Get network topology information
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "nodes": [
    {
      "id": "uuid",
      "hostname": "DESKTOP-ABC123",
      "ip_address": "192.168.1.100",
      "status": "online",
      "os_name": "Windows 11",
      "assigned_user": "john.doe"
    }
  ],
  "edges": [],
  "subnets": [],
  "last_scan": "2024-01-15T13:00:00Z"
}
```

## Agent Downloads

### GET /api/download/agent/:platform
**Description**: Download monitoring agent for specific platform
**Headers**: `Authorization: Bearer <token>`
**Parameters**:
- `platform` (string): "windows", "linux", or "macos"

**Response**: ZIP file download containing agent files and installation instructions.

## Performance Insights

### GET /api/devices/:id/performance-insights
**Description**: Get AI-powered performance insights for device
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "top_cpu_consumers": [
    {
      "name": "chrome.exe",
      "cpu_percent": 15.2,
      "memory_percent": 8.5,
      "pid": 1234
    }
  ],
  "top_memory_consumers": [
    {
      "name": "docker.exe",
      "cpu_percent": 5.1,
      "memory_percent": 25.3,
      "pid": 5678
    }
  ],
  "total_processes": 156,
  "system_load_analysis": {
    "high_cpu_processes": 3,
    "high_memory_processes": 2
  }
}
```

### GET /api/devices/:id/ai-insights
**Description**: Get AI-generated insights for device
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "insights": [
    {
      "type": "performance",
      "severity": "medium",
      "message": "CPU usage has increased by 15% over the past week",
      "recommendation": "Consider closing unnecessary applications or upgrading hardware"
    }
  ]
}
```

### GET /api/devices/:id/ai-recommendations
**Description**: Get AI recommendations for device optimization
**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "recommendations": [
    {
      "category": "performance",
      "priority": "high",
      "title": "Memory Optimization",
      "description": "Close unused applications to free up memory"
    }
  ]
}
```

## Health Check

### GET /api/health
**Description**: System health check endpoint

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T13:00:00Z"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "message": "Invalid request data",
  "errors": ["Field 'email' is required"]
}
```

### 401 Unauthorized
```json
{
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

## Rate Limiting

API requests are subject to rate limiting:
- **Authenticated requests**: 1000 requests per hour per user
- **Unauthenticated requests**: 100 requests per hour per IP
- **File uploads**: 10 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Window reset time (Unix timestamp)

## WebSocket Events

The system supports real-time updates via WebSocket connections:

**Connection URL**: `wss://your-domain.replit.app/ws?token=<jwt_token>`

### Events
- `device_status_changed`: Device comes online/offline
- `alert_triggered`: New alert created
- `alert_resolved`: Alert resolved
- `ticket_updated`: Ticket status changed
- `new_notification`: New notification for user

### Example Event
```json
{
  "type": "alert_triggered",
  "data": {
    "id": "uuid",
    "device_hostname": "DESKTOP-ABC123",
    "severity": "high",
    "message": "High CPU usage: 85.2%"
  },
  "timestamp": "2024-01-15T13:00:00Z"
}
```

## SDKs and Libraries

### JavaScript/TypeScript
```javascript
// Example API client usage
import { ITSMClient } from '@itsm/client';

const client = new ITSMClient({
  baseURL: 'https://your-domain.replit.app/api',
  token: 'your-jwt-token'
});

// Get devices
const devices = await client.devices.list();

// Create ticket
const ticket = await client.tickets.create({
  title: 'System Issue',
  description: 'Description of the issue',
  priority: 'high'
});
```

### Python
```python
# Example Python client usage
from itsm_client import ITSMClient

client = ITSMClient(
    base_url='https://your-domain.replit.app/api',
    token='your-jwt-token'
)

# Get devices
devices = client.devices.list()

# Create ticket
ticket = client.tickets.create({
    'title': 'System Issue',
    'description': 'Description of the issue',
    'priority': 'high'
})
```

## Changelog

### Version 1.0.0 (January 2024)
- Initial API release
- Authentication and user management
- Device monitoring and reporting
- Ticket management system
- Knowledge base integration
- Real-time alerts and notifications
- Automation and deployment capabilities
- Remote access functionality
- Analytics and reporting features

---

**Note**: This API documentation is automatically generated from the codebase. For the most up-to-date information, please refer to the source code or contact the development team.
