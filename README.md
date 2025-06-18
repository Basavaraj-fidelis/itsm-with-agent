
# ITSM (IT Service Management) System

## Project Summary

This is a comprehensive IT Service Management (ITSM) platform built with modern web technologies to streamline IT operations, enhance service delivery, and improve organizational efficiency. The system provides a centralized hub for managing IT services, tracking incidents, monitoring system health, and maintaining knowledge bases across your infrastructure.

The platform combines traditional ITSM capabilities with modern features like AI-powered insights, real-time monitoring, automated workflows, and comprehensive reporting to deliver a next-generation IT management experience.

## Target Audience

### Primary Users
- **IT Administrators**: System configuration, user management, and overall platform oversight
- **IT Support Agents**: Ticket management, incident resolution, and customer service
- **IT Managers**: Analytics, reporting, and strategic decision-making
- **End Users**: Self-service portal access, ticket submission, and knowledge base consumption

### Technical Audience
- **System Administrators**: Deployment, configuration, and maintenance
- **Developers**: API integration, customization, and extension development
- **Security Teams**: Access control, audit trails, and compliance monitoring

## Key Features List

### Core ITSM Capabilities
- **Service Desk**: Comprehensive ticket management with automated routing and SLA tracking
- **Knowledge Base**: Searchable articles with categorization and version control
- **User Directory**: Active Directory integration with role-based access control
- **Asset Management**: Complete visibility of managed systems and their health status
- **Analytics & Reporting**: Real-time dashboards and customizable reports

### Advanced Features
- **AI-Powered Insights**: Machine learning for ticket categorization and resolution suggestions
- **Remote Access**: Integrated RDP, SSH, and VNC capabilities for system administration
- **System Monitoring**: Real-time agent-based monitoring with customizable alerts
- **Workflow Automation**: Configurable business processes and approval workflows
- **Mobile Support**: Responsive design for field technicians and remote workers

### Enterprise Features
- **Multi-tenancy**: Support for multiple organizations and departments
- **API Integration**: RESTful APIs for third-party system integration
- **Audit Trails**: Comprehensive logging for compliance and security
- **High Availability**: Scalable architecture with load balancing support
- **Security**: End-to-end encryption, SSO integration, and advanced authentication

## Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USERS       │    │    TICKETS      │    │    DEVICES      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ email           │◄───┤ requester_email │    │ hostname        │
│ name            │    │ assigned_to (FK)├───►│ assigned_user   │
│ role            │    │ title           │    │ os_name         │
│ department      │    │ description     │    │ os_version      │
│ is_active       │    │ status          │    │ ip_address      │
│ created_at      │    │ priority        │    │ status          │
└─────────────────┘    │ type            │    │ last_seen       │
                       │ created_at      │    └─────────────────┘
                       │ updated_at      │           │
                       └─────────────────┘           │
                                                     │
┌─────────────────┐    ┌─────────────────┐          │
│ KNOWLEDGE_BASE  │    │ DEVICE_REPORTS  │          │
├─────────────────┤    ├─────────────────┤          │
│ id (PK)         │    │ id (PK)         │          │
│ title           │    │ device_id (FK)  │◄─────────┘
│ content         │    │ cpu_usage       │
│ category        │    │ memory_usage    │
│ status          │    │ disk_usage      │
│ author_email    │    │ network_io      │
│ created_at      │    │ raw_data        │
└─────────────────┘    │ collected_at    │
                       └─────────────────┘
                              │
                              │
┌─────────────────┐           │
│     ALERTS      │           │
├─────────────────┤           │
│ id (PK)         │           │
│ device_id (FK)  │◄──────────┘
│ category        │
│ severity        │
│ message         │
│ metadata        │
│ triggered_at    │
│ resolved_at     │
│ is_active       │
└─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│   USB_DEVICES   │    │ INSTALLED_SW    │
├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │
│ device_id (FK)  │    │ device_id (FK)  │
│ device_id       │    │ name            │
│ description     │    │ version         │
│ vendor_id       │    │ publisher       │
│ product_id      │    │ license_key     │
│ manufacturer    │    │ category        │
│ serial_number   │    │ install_date    │
│ first_seen      │    └─────────────────┘
│ last_seen       │
│ is_connected    │
└─────────────────┘
```

## Folder Structure

```
itsm-system/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── agent-detail/   # Agent monitoring components
│   │   │   ├── agents/         # Agent management
│   │   │   ├── auth/           # Authentication components
│   │   │   ├── dashboard/      # Dashboard widgets
│   │   │   ├── layout/         # Layout components
│   │   │   ├── tickets/        # Ticket management
│   │   │   └── ui/             # Base UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utility libraries
│   │   ├── pages/              # Application pages
│   │   ├── types/              # TypeScript type definitions
│   │   ├── App.tsx            # Main application component
│   │   └── main.tsx           # Application entry point
│   └── index.html             # HTML template
├── server/                     # Node.js backend application
│   ├── routes.ts              # Main API routes
│   ├── db.ts                  # Database configuration
│   ├── storage.ts             # Data access layer
│   ├── ad-service.ts          # Active Directory integration
│   ├── ai-service.ts          # AI/ML services
│   ├── analytics-service.ts   # Analytics and reporting
│   ├── automation-service.ts  # Workflow automation
│   ├── notification-service.ts # Notification system
│   ├── performance-service.ts # Performance monitoring
│   ├── security-service.ts    # Security services
│   ├── ticket-storage.ts      # Ticket data management
│   ├── user-storage.ts        # User data management
│   └── migrate-*.ts           # Database migrations
├── shared/                     # Shared TypeScript schemas
│   ├── schema.ts              # Database schemas
│   ├── ticket-schema.ts       # Ticket-related schemas
│   ├── user-schema.ts         # User-related schemas
│   └── admin-schema.ts        # Admin-related schemas
├── docs/                       # Documentation
│   ├── introduction.md        # System overview
│   ├── dashboard.md           # Dashboard documentation
│   ├── service-desk.md        # Service desk guide
│   └── *.md                   # Module-specific docs
├── attached_assets/           # Static files and assets
│   ├── Knowledgebase/         # KB articles
│   ├── *.py                   # Agent files
│   └── *.ini                  # Configuration files
└── package.json               # Project dependencies
```

## High-Level Architecture

### Frontend Layer (React + TypeScript)
The client-side application provides a modern, responsive user interface built with:
- **Component Architecture**: Modular UI components using shadcn/ui design system
- **State Management**: React Query for server state management and caching
- **Routing**: React Router for single-page application navigation
- **Real-time Updates**: WebSocket connections for live notifications and status updates
- **Responsive Design**: Mobile-first approach with Tailwind CSS styling

### Backend Services (Node.js + Express)
The server layer consists of multiple interconnected services:
- **API Gateway**: Express.js REST API serving as the primary interface
- **Authentication Service**: JWT-based authentication with role-based authorization
- **Data Access Layer**: Abstracted storage layer supporting multiple backends
- **Background Services**: Node.js workers for automated tasks and monitoring
- **WebSocket Server**: Real-time communication for live updates and notifications

### Data Layer (PostgreSQL)
- **Primary Database**: PostgreSQL for transactional data (tickets, users, assets)
- **Schema Design**: Normalized relational design with JSON support for flexible metadata
- **Indexing Strategy**: Optimized indexes for common query patterns
- **Backup & Recovery**: Automated backup procedures and point-in-time recovery

### Integration Layer
- **Active Directory**: LDAP integration for user authentication and directory services
- **Email Service**: SMTP integration for notifications and ticket communications
- **Monitoring Agents**: Lightweight Python agents for Windows and Linux system monitoring
- **Third-party APIs**: Extensible framework for external service integration

### Security Architecture
- **Transport Security**: TLS/SSL encryption for all communications
- **Data Encryption**: AES-256 encryption for sensitive data at rest
- **Access Control**: Role-based permissions with principle of least privilege
- **Audit Logging**: Comprehensive activity tracking for compliance requirements
- **Multi-factor Authentication**: Optional MFA support for enhanced security

### Monitoring & Observability
- **Application Monitoring**: Real-time performance metrics and health checks
- **System Monitoring**: Agent-based monitoring of CPU, memory, disk, and network
- **Alerting System**: Configurable thresholds with automatic escalation
- **Logging**: Centralized logging with log aggregation and analysis

## Deployment Models

### Replit Cloud Deployment (Recommended)
The system is optimized for deployment on Replit's cloud platform:

#### Features
- **Instant Deployment**: One-click deployment with automatic scaling
- **Integrated Database**: PostgreSQL database with automatic backups
- **SSL Termination**: Automatic HTTPS with managed certificates
- **Environment Management**: Secure environment variable management
- **Global CDN**: Fast content delivery worldwide

#### Benefits
- **Zero Infrastructure Management**: Focus on development, not DevOps
- **Automatic Scaling**: Handle traffic spikes without manual intervention
- **Integrated Development**: Code, test, and deploy in the same environment
- **Cost Effective**: Pay only for what you use with transparent pricing

#### Deployment Steps
1. **Environment Setup**: Configure environment variables in Replit Secrets
2. **Database Initialization**: Create PostgreSQL database in Replit Database tab
3. **One-Click Deploy**: Use the Deploy button for instant production deployment
4. **Custom Domain**: Optional custom domain configuration
5. **Monitoring**: Built-in application and infrastructure monitoring

### On-Premises Deployment
For organizations requiring complete control over their infrastructure:

#### Infrastructure Requirements
- **Application Server**: Node.js 18+ runtime environment
- **Database Server**: PostgreSQL 14+ with appropriate sizing
- **Web Server**: Nginx or Apache for reverse proxy and static content
- **Operating System**: Linux (Ubuntu 20.04+ recommended) or Windows Server

#### Network Requirements
- **Port Configuration**: 
  - Port 5000 for application server
  - Port 5432 for PostgreSQL (internal)
  - Port 80/443 for web traffic
- **Firewall Rules**: Configured for agent communication and remote access
- **Load Balancer**: For high-availability deployments

#### Security Considerations
- **Network Segmentation**: Isolated VLAN for ITSM infrastructure
- **Access Controls**: VPN or bastion host for administrative access
- **Certificate Management**: SSL/TLS certificates for secure communications
- **Backup Strategy**: Regular database and configuration backups

#### Installation Steps
1. **Server Preparation**: Install Node.js, PostgreSQL, and required dependencies
2. **Application Deployment**: Clone repository and install npm packages
3. **Database Setup**: Initialize PostgreSQL and run migrations
4. **Configuration**: Set environment variables and system settings
5. **Service Configuration**: Set up systemd services for automatic startup
6. **Web Server Setup**: Configure Nginx/Apache reverse proxy
7. **SSL Certificate**: Install and configure SSL certificates
8. **Monitoring Setup**: Configure system monitoring and alerting

### Hybrid Deployment
Combine cloud flexibility with on-premises control:
- **Application Layer**: Deployed on Replit for scalability and maintenance
- **Data Layer**: On-premises database for sensitive data
- **Agent Network**: Local agents reporting to cloud-hosted management
- **Secure Tunneling**: VPN connectivity between cloud and on-premises components

## Getting Started

### Quick Start (Replit)
1. **Fork the Repository**: Use the Replit interface to fork this project
2. **Configure Database**: Create a PostgreSQL database in the Database tab
3. **Set Environment Variables**: Configure required secrets in the Secrets tab
4. **Run the Application**: Click the Run button to start the development server
5. **Access the System**: Navigate to the provided URL to access the ITSM interface

### Development Setup
1. **Install Dependencies**: `npm install` to install all required packages
2. **Database Migration**: `npm run migrate` to set up database tables
3. **Seed Data**: `npm run seed` to populate with demo data
4. **Start Development**: `npm run dev` to start the development server

### Configuration
- **Database**: Set `DATABASE_URL` in environment variables
- **JWT Secret**: Configure `JWT_SECRET` for authentication
- **Email**: Set SMTP settings for notifications
- **Active Directory**: Configure LDAP settings if using AD integration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For technical support or questions:
- Check the documentation in the `docs/` folder
- Review the API documentation
- Contact your system administrator
- Open an issue in the repository

## Version Information

- **Current Version**: 1.0.0
- **Last Updated**: January 2024
- **Node.js Version**: 18+
- **Database**: PostgreSQL 14+
- **Browser Compatibility**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
