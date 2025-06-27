
# User Directory Module

## Overview

The User Directory module provides comprehensive user and identity management capabilities with Active Directory integration, role-based access control, and self-service features. It serves as the central identity provider for the ITSM system with support for single sign-on and automated user provisioning.

## Key Features

### User Management
- **User Lifecycle**: Create, modify, disable, and delete user accounts
- **Profile Management**: Complete user profile with organizational information
- **Role Assignment**: Hierarchical role-based access control
- **Group Membership**: Dynamic and static group management
- **Account Status**: Active, inactive, locked, and suspended states

### Active Directory Integration
- **LDAP Synchronization**: Real-time AD user synchronization
- **SSO Support**: Single sign-on with SAML and OAuth
- **Group Mapping**: AD group to system role mapping
- **Password Policies**: Enforce AD password policies
- **Authentication Methods**: Multiple authentication options

### Self-Service Features
- **Password Reset**: Secure self-service password reset
- **Profile Updates**: User profile self-management
- **Access Requests**: Request access to resources and applications
- **MFA Management**: Multi-factor authentication setup
- **Session Management**: Active session monitoring and control

## User Data Structure

### User Profile Schema
```json
{
  "id": "user-001",
  "email": "john.doe@company.com",
  "username": "john.doe",
  "first_name": "John",
  "last_name": "Doe",
  "display_name": "John Doe",
  "role": "technician",
  "department": "IT Support",
  "job_title": "Senior Technician",
  "manager_id": "user-005",
  "location": "New York Office",
  "phone": "+1-555-0123",
  "employee_id": "EMP001234",
  "is_active": true,
  "is_locked": false,
  "last_login": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T09:00:00Z",
  "preferences": {
    "timezone": "America/New_York",
    "language": "en-US",
    "notifications": {
      "email": true,
      "sms": false,
      "push": true
    }
  },
  "ad_synced": true,
  "ad_groups": ["IT-Support", "VPN-Users", "Office-365-Users"]
}
```

### Role Definitions
```json
{
  "roles": [
    {
      "name": "admin",
      "display_name": "System Administrator",
      "description": "Full system access and configuration",
      "permissions": ["*"]
    },
    {
      "name": "manager",
      "display_name": "IT Manager",
      "description": "Team management and reporting access",
      "permissions": [
        "users:read",
        "tickets:read",
        "reports:read",
        "analytics:read"
      ]
    },
    {
      "name": "technician",
      "display_name": "IT Technician",
      "description": "Ticket resolution and device management",
      "permissions": [
        "tickets:read",
        "tickets:write",
        "devices:read",
        "knowledge:read"
      ]
    },
    {
      "name": "end_user",
      "display_name": "End User",
      "description": "Submit tickets and access knowledge base",
      "permissions": [
        "tickets:create",
        "knowledge:read",
        "profile:write"
      ]
    }
  ]
}
```

## API Reference

### Get All Users
```http
GET /api/users?search={query}&role={role}&department={dept}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "user-001",
      "email": "john.doe@company.com",
      "name": "John Doe",
      "role": "technician",
      "department": "IT Support",
      "status": "active",
      "last_login": "2024-01-15T10:30:00Z",
      "ad_synced": true
    }
  ],
  "stats": {
    "total": 156,
    "active": 142,
    "inactive": 14,
    "ad_synced": 134,
    "local": 22
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

### Create User
```http
POST /api/users
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "jane.smith@company.com",
  "name": "Jane Smith",
  "role": "technician",
  "department": "IT Support",
  "phone": "+1-555-0124",
  "password": "TempPassword123!"
}
```

### Update User
```http
PUT /api/users/{id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Jane Smith-Johnson",
  "role": "manager",
  "department": "IT Management",
  "is_active": true
}
```

### Lock/Unlock User
```http
POST /api/users/{id}/lock
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Security violation - suspicious login activity"
}
```

```http
POST /api/users/{id}/unlock
Authorization: Bearer <token>
```

## Active Directory Integration

### Configuration
AD integration settings in environment variables:

```bash
# Active Directory Configuration
AD_SERVER=ldap://dc.company.com:389
AD_BASE_DN=DC=company,DC=com
AD_BIND_DN=CN=service-account,OU=Service Accounts,DC=company,DC=com
AD_BIND_PASSWORD=service-password
AD_ENABLED=true

# Group Mapping
AD_GROUP_MAPPING='{"IT-Admins":"admin","IT-Support":"technician","Managers":"manager","Employees":"end_user"}'
```

### Synchronization Process
```typescript
// AD sync workflow
const syncFromActiveDirectory = async () => {
  const adUsers = await adService.getAllUsers();
  
  for (const adUser of adUsers) {
    const localUser = await userStorage.findByEmail(adUser.email);
    
    if (localUser) {
      // Update existing user
      await userStorage.updateUser(localUser.id, {
        first_name: adUser.firstName,
        last_name: adUser.lastName,
        department: adUser.department,
        role: mapADGroupsToRole(adUser.groups),
        ad_synced: true,
        last_ad_sync: new Date()
      });
    } else {
      // Create new user
      await userStorage.createUser({
        email: adUser.email,
        first_name: adUser.firstName,
        last_name: adUser.lastName,
        department: adUser.department,
        role: mapADGroupsToRole(adUser.groups),
        ad_synced: true,
        is_active: true
      });
    }
  }
};
```

### AD Authentication Flow
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@company.com",
  "password": "user-password",
  "useActiveDirectory": true
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-001",
    "email": "john.doe@company.com",
    "name": "John Doe",
    "role": "technician",
    "department": "IT Support",
    "authMethod": "ad"
  }
}
```

## Role-Based Access Control (RBAC)

### Permission System
Granular permissions for different system areas:

```typescript
// Permission checking example
const checkPermission = (user: User, resource: string, action: string): boolean => {
  const permission = `${resource}:${action}`;
  
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  // Check role-specific permissions
  const rolePermissions = getRolePermissions(user.role);
  return rolePermissions.includes(permission) || rolePermissions.includes(`${resource}:*`);
};

// Usage examples
checkPermission(user, 'tickets', 'create'); // true for technicians
checkPermission(user, 'users', 'delete');   // true only for admins
checkPermission(user, 'reports', 'read');   // true for managers and admins
```

### Resource-Level Security
- **Data Filtering**: Users see only authorized data
- **API Endpoint Protection**: Route-level permission checks
- **UI Element Hiding**: Hide unauthorized interface elements
- **Audit Logging**: Track all permission checks and access attempts

## Self-Service Features

### Password Reset Workflow
```http
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "john.doe@company.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent",
  "reset_token": "temp-token-for-testing"
}
```

```http
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePassword123!"
}
```

### Profile Management
```http
PUT /api/users/profile
Content-Type: application/json
Authorization: Bearer <token>

{
  "phone": "+1-555-0199",
  "preferences": {
    "timezone": "America/Los_Angeles",
    "notifications": {
      "email": true,
      "sms": true,
      "push": false
    }
  }
}
```

## User Analytics

### User Activity Metrics
```http
GET /api/analytics/users/activity
Authorization: Bearer <token>
```

**Response:**
```json
{
  "active_users_24h": 145,
  "total_logins_24h": 456,
  "failed_logins_24h": 23,
  "password_resets_24h": 5,
  "new_users_7d": 12,
  "user_satisfaction": 4.2,
  "top_departments": [
    {"name": "IT Support", "user_count": 25},
    {"name": "Engineering", "user_count": 45},
    {"name": "Sales", "user_count": 32}
  ]
}
```

### Login Analytics
Track authentication patterns and security metrics:

```json
{
  "login_analytics": {
    "successful_logins": 1250,
    "failed_logins": 45,
    "success_rate": 0.965,
    "peak_hours": ["09:00", "13:00", "17:00"],
    "authentication_methods": {
      "password": 0.65,
      "active_directory": 0.30,
      "sso": 0.05
    },
    "geographic_distribution": {
      "New York": 45,
      "London": 23,
      "Tokyo": 12
    }
  }
}
```

## Security Features

### Multi-Factor Authentication
```http
POST /api/auth/mfa/setup
Content-Type: application/json
Authorization: Bearer <token>

{
  "method": "totp",
  "device_name": "iPhone 12"
}
```

**Response:**
```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhE...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backup_codes": ["123456", "789012", "345678"]
}
```

### Session Management
```http
GET /api/users/sessions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "active_sessions": [
    {
      "id": "session-001",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "location": "New York, NY",
      "created_at": "2024-01-15T09:00:00Z",
      "last_activity": "2024-01-15T10:30:00Z",
      "is_current": true
    }
  ]
}
```

### Audit Logging
```http
GET /api/users/{id}/audit-log
Authorization: Bearer <token>
```

**Response:**
```json
{
  "audit_events": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "action": "user.login",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "authentication_method": "password",
        "success": true
      }
    },
    {
      "timestamp": "2024-01-15T10:25:00Z",
      "action": "user.profile.update",
      "changed_fields": ["phone", "preferences.timezone"],
      "old_values": {
        "phone": "+1-555-0123"
      }
    }
  ]
}
```

## Bulk Operations

### Bulk User Import
```http
POST /api/users/bulk-import
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: users.csv
```

CSV Format:
```csv
email,first_name,last_name,department,role,phone
john.doe@company.com,John,Doe,IT Support,technician,+1-555-0123
jane.smith@company.com,Jane,Smith,Engineering,end_user,+1-555-0124
```

### Bulk Active Directory Sync
```http
POST /api/users/bulk-ad-sync
Content-Type: application/json
Authorization: Bearer <token>

{
  "userEmails": [
    "john.doe@company.com",
    "jane.smith@company.com"
  ]
}
```

## Integration Points

### SAML SSO Integration
```xml
<!-- SAML Configuration Example -->
<saml:Issuer>https://company.okta.com</saml:Issuer>
<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
  john.doe@company.com
</saml:NameID>
<saml:Attribute Name="Department">
  <saml:AttributeValue>IT Support</saml:AttributeValue>
</saml:Attribute>
```

### OAuth 2.0 Integration
```json
{
  "client_id": "itsm-system-client",
  "redirect_uri": "http://0.0.0.0:5000/auth/oauth/callback",
  "scope": "openid profile email groups",
  "response_type": "code",
  "state": "random-state-string"
}
```

## Troubleshooting

### Common Issues

**AD Sync Failures**
```bash
# Test AD connectivity
curl -X POST -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{"server": "ldap://dc.company.com"}' \
     "http://0.0.0.0:5000/api/ad/test-connection"

# Check AD sync status
curl -H "Authorization: Bearer <admin-token>" \
     "http://0.0.0.0:5000/api/ad/sync-status"
```

**Authentication Issues**
- Verify JWT secret configuration
- Check token expiration times
- Review user account status
- Validate password policies

**Permission Errors**
- Review role assignments
- Check permission mappings
- Verify API endpoint security
- Test role-based filtering

### Performance Optimization
```bash
# Monitor user query performance
curl -H "Authorization: Bearer <admin-token>" \
     "http://0.0.0.0:5000/api/admin/users/performance-stats"

# Optimize large user directory queries
curl -H "Authorization: Bearer <token>" \
     "http://0.0.0.0:5000/api/users?limit=50&page=1&fields=id,email,name,role"
```
