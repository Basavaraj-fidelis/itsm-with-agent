
# ITSM System Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ITSM System Architecture                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Tier   │    │  Application    │    │   Data Tier     │
│   (Frontend)    │    │     Tier        │    │   (Database)    │
│                 │    │   (Backend)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │  Web Browser    │  │  Mobile App     │  │  Desktop App    │                │
│  │  (React SPA)    │  │  (Future)       │  │  (Future)       │                │
│  │                 │  │                 │  │                 │                │
│  │ • Dashboard     │  │ • Field Tech    │  │ • Admin Tools   │                │
│  │ • Tickets       │  │ • Tickets       │  │ • Reports       │                │
│  │ • Alerts        │  │ • Assets        │  │ • Monitoring    │                │
│  │ • Knowledge     │  │ • Remote Access │  │                 │                │
│  │ • Reports       │  │                 │  │                 │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│           │                     │                     │                        │
│           └─────────────────────┼─────────────────────┘                        │
│                                 │                                              │
└─────────────────────────────────┼──────────────────────────────────────────────┘
                                  │
                            ┌─────────────┐
                            │   HTTPS/WSS │
                            │   Port 443  │
                            └─────────────┘
                                  │
┌─────────────────────────────────┼──────────────────────────────────────────────┐
│                       APPLICATION TIER                                          │
├─────────────────────────────────┼──────────────────────────────────────────────┤
│                                 │                                              │
│  ┌──────────────────────────────▼───────────────────────────────────────────┐  │
│  │                     Express.js Server                                   │  │
│  │                        (Port 5000)                                      │  │
│  │                                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │  │
│  │  │  REST API       │  │  WebSocket      │  │  Authentication │         │  │
│  │  │                 │  │  Handler        │  │  Middleware     │         │  │
│  │  │ • /api/devices  │  │                 │  │                 │         │  │
│  │  │ • /api/tickets  │  │ • Real-time     │  │ • JWT Tokens    │         │  │
│  │  │ • /api/alerts   │  │   updates       │  │ • Active Dir    │         │  │
│  │  │ • /api/reports  │  │ • Agent status  │  │ • RBAC          │         │  │
│  │  │ • /api/users    │  │ • Notifications │  │                 │         │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │  │
│  │                                                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │  │
│  │  │  Services       │  │  AI/ML Engine   │  │  Automation     │         │  │
│  │  │                 │  │                 │  │  Engine         │         │  │
│  │  │ • Storage       │  │ • Insights      │  │                 │         │  │
│  │  │ • Analytics     │  │ • Predictions   │  │ • Workflows     │         │  │
│  │  │ • Security      │  │ • Recommendations│  │ • Remediation   │         │  │
│  │  │ • Performance   │  │ • NLP Processing│  │ • Escalation    │         │  │
│  │  │ • Automation    │  │                 │  │                 │         │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                 │                                              │
│                    ┌────────────┼────────────┐                                │
│                    │            │            │                                │
└────────────────────┼────────────┼────────────┼────────────────────────────────┘
                     │            │            │
           ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
           │   HTTP/WS   │ │  Database   │ │  Agent API  │
           │   Port 443  │ │  Connection │ │  Port 5000  │
           └─────────────┘ └─────────────┘ └─────────────┘
                     │            │            │
┌────────────────────┼────────────▼────────────┼────────────────────────────────┐
│                    │       DATA TIER         │                                │
├────────────────────┼─────────────────────────┼────────────────────────────────┤
│                    │                         │                                │
│  ┌─────────────────▼────────────────────────┐│                                │
│  │         PostgreSQL Database              ││                                │
│  │                                          ││                                │
│  │  ┌─────────────┐  ┌─────────────┐       ││                                │
│  │  │   Core      │  │   ITSM      │       ││                                │
│  │  │   Tables    │  │   Tables    │       ││                                │
│  │  │             │  │             │       ││                                │
│  │  │ • users     │  │ • tickets   │       ││                                │
│  │  │ • devices   │  │ • alerts    │       ││                                │
│  │  │ • reports   │  │ • knowledge │       ││                                │
│  │  │ • usb_devs  │  │ • sla_rules │       ││                                │
│  │  └─────────────┘  └─────────────┘       ││                                │
│  │                                          ││                                │
│  │  ┌─────────────┐  ┌─────────────┐       ││                                │
│  │  │ Analytics   │  │   Audit     │       ││                                │
│  │  │   Tables    │  │   Tables    │       ││                                │
│  │  │             │  │             │       ││                                │
│  │  │ • metrics   │  │ • logs      │       ││                                │
│  │  │ • trends    │  │ • changes   │       ││                                │
│  │  │ • forecasts │  │ • access    │       ││                                │
│  │  └─────────────┘  └─────────────┘       ││                                │
│  └──────────────────────────────────────────┘│                                │
│                                              │                                │
└──────────────────────────────────────────────┼────────────────────────────────┘
                                               │
┌──────────────────────────────────────────────┼────────────────────────────────┐
│                         AGENT TIER           │                                │
├──────────────────────────────────────────────┼────────────────────────────────┤
│                                              │                                │
│  ┌─────────────────┐  ┌─────────────────┐   │   ┌─────────────────┐          │
│  │  Windows Agent  │  │   Linux Agent   │   │   │   macOS Agent   │          │
│  │  (Python)       │  │   (Python)      │   │   │   (Python)      │          │
│  │                 │  │                 │   │   │                 │          │
│  │ • System Info   │  │ • System Info   │   │   │ • System Info   │          │
│  │ • Performance   │  │ • Performance   │   │   │ • Performance   │          │
│  │ • USB Devices   │  │ • USB Devices   │   │   │ • USB Devices   │          │
│  │ • Processes     │  │ • Processes     │   │   │ • Processes     │          │
│  │ • Network       │  │ • Network       │   │   │ • Network       │          │
│  │ • Security      │  │ • Security      │   │   │ • Security      │          │
│  └─────────────────┘  └─────────────────┘   │   └─────────────────┘          │
│           │                     │           │            │                   │
│           └─────────────────────┼───────────┼────────────┘                   │
│                                 │           │                                │
│  ┌──────────────────────────────▼───────────▼──────────────────────────────┐ │
│  │                    Agent Communication                                  │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │ │
│  │  │  Data Collector │  │  API Client     │  │  Command Exec   │         │ │
│  │  │                 │  │                 │  │                 │         │ │
│  │  │ • System Scan   │  │ • POST /report  │  │ • Remote Cmds   │         │ │
│  │  │ • Health Check  │  │ • GET /commands │  │ • File Transfer │         │ │
│  │  │ • Log Analysis  │  │ • Heartbeat     │  │ • Restart Svc   │         │ │
│  │  │ • File Monitor  │  │ • Error Report  │  │ • Update Agent  │         │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                 │                                             │
└─────────────────────────────────┼─────────────────────────────────────────────┘
                                  │
                        ┌─────────────────┐
                        │   HTTPS POST    │
                        │  /api/report    │
                        │   (5min int)    │
                        └─────────────────┘
```

## Component Communication Flow

### 1. Agent → Server Communication
```
┌─────────────────┐    HTTPS POST    ┌─────────────────┐
│   ITSM Agent    ├──────────────────►│  Express Server │
│   (Python)      │   /api/report    │   (Node.js)     │
│                 │                  │                 │
│ • System Data   │◄─────────────────┤ • JSON Response │
│ • Performance   │   200 OK/Error   │ • Command Queue │
│ • USB Devices   │                  │ • Config Update │
│ • Network Info  │                  │                 │
└─────────────────┘                  └─────────────────┘
```

### 2. Server → Database Communication
```
┌─────────────────┐     SQL/ORM      ┌─────────────────┐
│  Express Server ├──────────────────►│   PostgreSQL    │
│                 │                  │   Database      │
│ • Data Storage  │◄─────────────────┤                 │
│ • Queries       │   Result Sets    │ • Tables        │
│ • Transactions │                  │ • Indexes       │
│ • Analytics     │                  │ • JSON Storage  │
└─────────────────┘                  └─────────────────┘
```

### 3. Client → Server Communication
```
┌─────────────────┐   REST API/WS    ┌─────────────────┐
│  React Client   ├──────────────────►│  Express Server │
│                 │                  │                 │
│ • HTTP Requests │◄─────────────────┤ • JSON API      │
│ • WebSocket     │   Real-time      │ • WebSocket     │
│ • State Mgmt    │   Updates        │ • Auth/RBAC     │
└─────────────────┘                  └─────────────────┘
```

## Data Flow Patterns

### Agent Reporting Flow
```
1. Agent collects system data every 5 minutes
2. POST /api/report with comprehensive JSON payload
3. Server validates and processes data
4. Server updates device status and metrics
5. Server stores raw data and extracted metrics
6. Server triggers alerts based on thresholds
7. WebSocket broadcasts updates to connected clients
```

### Real-time Updates Flow
```
1. Server receives agent data
2. Server processes and stores data
3. Server evaluates alert conditions
4. Server broadcasts via WebSocket to clients:
   • Device status changes
   • New alerts
   • Performance updates
   • System notifications
```

### Alert Processing Flow
```
1. Agent reports system metrics
2. Server compares against thresholds
3. Server creates/updates alerts
4. Server deduplicates similar alerts
5. Server escalates based on SLA rules
6. Server notifies via multiple channels
7. Client receives real-time alert updates
```

## Technology Stack

### Frontend (Client Tier)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query
- **Real-time**: WebSocket client
- **Build Tool**: Vite
- **Deployment**: Replit Static Hosting

### Backend (Application Tier)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Authentication**: JWT + Active Directory
- **Real-time**: WebSocket server
- **File Storage**: Local filesystem
- **Deployment**: Replit Reserved VM

### Database (Data Tier)
- **Database**: PostgreSQL
- **Features**: JSONB, Full-text search, Indexes
- **Hosting**: Replit Database
- **Backup**: Automated snapshots

### Agent (Endpoint Tier)
- **Language**: Python 3.7+
- **Libraries**: requests, psutil, platform
- **Service**: Windows Service / Linux Daemon
- **Communication**: HTTPS REST API
- **Deployment**: Manual installation

## Security Architecture

### Authentication & Authorization
```
┌─────────────────┐    JWT Token     ┌─────────────────┐
│   Client App    ├──────────────────►│   Auth Service  │
│                 │                  │                 │
│ • Login Form    │◄─────────────────┤ • Token Verify  │
│ • Token Storage │   User Profile   │ • Role Check    │
│ • Auto Refresh  │                  │ • AD Integration│
└─────────────────┘                  └─────────────────┘
```

### Data Protection
- **In Transit**: HTTPS/TLS 1.3 encryption
- **At Rest**: Database encryption
- **Authentication**: Multi-factor support
- **Authorization**: Role-based access control
- **Audit**: Comprehensive logging

## Scalability Considerations

### Horizontal Scaling
- **Load Balancer**: Nginx/Cloudflare
- **App Instances**: Multiple Express servers
- **Database**: Read replicas
- **Caching**: Redis for sessions

### Performance Optimization
- **Database Indexing**: Optimized queries
- **API Caching**: Response caching
- **WebSocket Optimization**: Connection pooling
- **Agent Efficiency**: Minimal resource usage

This architecture provides a robust, scalable foundation for enterprise IT service management with real-time monitoring capabilities.
