#!/bin/bash

# ITSM Agent Linux Installation Script
# Installs the ITSM agent as a systemd service with all dependencies

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="itsm-agent"
SERVICE_USER="itsm"
INSTALL_DIR="/opt/itsm-agent"
CONFIG_DIR="/etc/itsm-agent"
LOG_DIR="/var/log/itsm-agent"
DATA_DIR="/var/lib/itsm-agent"

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        print_error "Cannot detect Linux distribution"
        exit 1
    fi
    
    print_status "Detected distribution: $DISTRO $VERSION"
}

# Check Python version
check_python() {
    print_status "Checking Python installation..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        print_error "Python is not installed"
        exit 1
    fi
    
    # Check Python version
    PYTHON_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [[ $PYTHON_MAJOR -lt 3 ]] || [[ $PYTHON_MAJOR -eq 3 && $PYTHON_MINOR -lt 8 ]]; then
        print_error "Python 3.8 or higher is required (found: $PYTHON_VERSION)"
        exit 1
    fi
    
    print_status "Python version: $PYTHON_VERSION ✓"
}

# Install system dependencies
install_system_dependencies() {
    print_status "Installing system dependencies..."
    
    case $DISTRO in
        ubuntu|debian)
            apt-get update
            apt-get install -y python3-pip python3-venv python3-dev build-essential curl
            ;;
        centos|rhel|fedora)
            if command -v dnf &> /dev/null; then
                dnf install -y python3-pip python3-devel gcc curl
            else
                yum install -y python3-pip python3-devel gcc curl
            fi
            ;;
        opensuse*)
            zypper install -y python3-pip python3-devel gcc curl
            ;;
        arch)
            pacman -Sy --noconfirm python-pip base-devel curl
            ;;
        *)
            print_warning "Unknown distribution, attempting generic installation..."
            ;;
    esac
    
    print_status "System dependencies installed ✓"
}

# Create service user
create_service_user() {
    print_status "Creating service user..."
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd --system --shell /bin/false --home-dir $DATA_DIR --create-home $SERVICE_USER
        print_status "Created user: $SERVICE_USER ✓"
    else
        print_status "User $SERVICE_USER already exists ✓"
    fi
}

# Create directories
create_directories() {
    print_status "Creating directories..."
    
    # Create main directories
    mkdir -p $INSTALL_DIR
    mkdir -p $CONFIG_DIR
    mkdir -p $LOG_DIR
    mkdir -p $DATA_DIR
    
    # Set ownership and permissions
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    chown -R $SERVICE_USER:$SERVICE_USER $LOG_DIR
    chown -R $SERVICE_USER:$SERVICE_USER $DATA_DIR
    chown -R root:$SERVICE_USER $CONFIG_DIR
    
    chmod 755 $INSTALL_DIR
    chmod 750 $CONFIG_DIR
    chmod 755 $LOG_DIR
    chmod 755 $DATA_DIR
    
    print_status "Directories created ✓"
}

# Install Python dependencies
install_python_dependencies() {
    print_status "Installing Python dependencies..."
    
    # Create virtual environment
    $PYTHON_CMD -m venv $INSTALL_DIR/venv
    
    # Activate virtual environment and install packages
    source $INSTALL_DIR/venv/bin/activate
    
    pip install --upgrade pip
    
    # Install required packages
    pip install \
        psutil>=5.8.0 \
        requests>=2.28.0 \
        configparser>=5.0.0
    
    deactivate
    
    # Set ownership
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR/venv
    
    print_status "Python dependencies installed ✓"
}

# Copy agent files
copy_agent_files() {
    print_status "Copying agent files..."
    
    # Get script directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    
    # List of files to copy
    FILES=(
        "itsm_agent.py"
        "system_collector.py"
        "api_client.py"
        "command_scheduler.py"
        "operation_monitor.py"
        "smart_queue.py"
        "service_wrapper.py"
    )
    
    # Copy files
    for file in "${FILES[@]}"; do
        if [[ -f "$SCRIPT_DIR/$file" ]]; then
            cp "$SCRIPT_DIR/$file" "$INSTALL_DIR/"
            print_status "Copied $file ✓"
        else
            print_error "Source file not found: $file"
            exit 1
        fi
    done
    
    # Copy configuration file
    if [[ -f "$SCRIPT_DIR/config.ini" ]]; then
        cp "$SCRIPT_DIR/config.ini" "$CONFIG_DIR/"
        print_status "Copied config.ini ✓"
    else
        # Create default configuration
        create_default_config
    fi
    
    # Set ownership
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    chown -R root:$SERVICE_USER $CONFIG_DIR
    chmod 640 $CONFIG_DIR/config.ini
    
    print_status "Agent files copied ✓"
}

# Create default configuration
create_default_config() {
    print_status "Creating default configuration..."
    
    cat > $CONFIG_DIR/config.ini << EOF
[agent]
# Collection interval in seconds (600 = 10 minutes)
collection_interval = 600

# Heartbeat interval in seconds (60 = 1 minute) 
heartbeat_interval = 60

# Logging configuration
log_level = INFO
log_max_size = 10485760
log_backup_count = 5

[api]
# ITSM API configuration
base_url = http://localhost:5000
auth_token = dashboard-api-token

# Request configuration
timeout = 30
retry_attempts = 3
retry_delay = 5

[monitoring]
# System monitoring thresholds
cpu_threshold = 80
memory_threshold = 80
disk_threshold = 90
load_check_interval = 30

[scheduling]
# Command scheduling configuration
max_concurrent_commands = 2
defer_threshold_cpu = 75
defer_threshold_memory = 75

# Maintenance window (24-hour format)
maintenance_window_start = 02:00
maintenance_window_end = 04:00

[security]
# Security configuration
verify_ssl = true
EOF
    
    print_status "Default configuration created ✓"
}

# Create systemd service
create_systemd_service() {
    print_status "Creating systemd service..."
    
    cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=ITSM Endpoint Agent
Documentation=https://github.com/your-org/itsm-agent
After=network-online.target
Wants=network-online.target
StartLimitBurst=3
StartLimitIntervalSec=60

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/itsm_agent.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LOG_DIR $DATA_DIR $CONFIG_DIR

# Environment
Environment=PYTHONPATH=$INSTALL_DIR
Environment=ITSM_CONFIG_FILE=$CONFIG_DIR/config.ini
Environment=ITSM_LOG_DIR=$LOG_DIR
Environment=ITSM_DATA_DIR=$DATA_DIR

# Working directory
WorkingDirectory=$INSTALL_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable service
    systemctl enable $SERVICE_NAME
    
    print_status "Systemd service created and enabled ✓"
}

# Create management scripts
create_management_scripts() {
    print_status "Creating management scripts..."
    
    # Create start script
    cat > /usr/local/bin/itsm-start << 'EOF'
#!/bin/bash
systemctl start itsm-agent
systemctl status itsm-agent --no-pager -l
EOF
    
    # Create stop script
    cat > /usr/local/bin/itsm-stop << 'EOF'
#!/bin/bash
systemctl stop itsm-agent
systemctl status itsm-agent --no-pager -l
EOF
    
    # Create status script
    cat > /usr/local/bin/itsm-status << 'EOF'
#!/bin/bash
echo "=== Service Status ==="
systemctl status itsm-agent --no-pager -l
echo ""
echo "=== Recent Logs ==="
journalctl -u itsm-agent --no-pager -l -n 20
EOF
    
    # Create logs script
    cat > /usr/local/bin/itsm-logs << 'EOF'
#!/bin/bash
if [[ "$1" == "-f" ]]; then
    journalctl -u itsm-agent -f
else
    journalctl -u itsm-agent --no-pager -l -n 50
fi
EOF
    
    # Make scripts executable
    chmod +x /usr/local/bin/itsm-*
    
    print_status "Management scripts created ✓"
    print_status "Available commands: itsm-start, itsm-stop, itsm-status, itsm-logs"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # Check if firewall is active
    if systemctl is-active --quiet firewalld; then
        print_status "Configuring firewalld..."
        # Allow outbound connections for ITSM agent
        firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='0.0.0.0/0' port protocol='tcp' port='443' accept"
        firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='0.0.0.0/0' port protocol='tcp' port='80' accept"
        firewall-cmd --reload
        print_status "Firewalld configured ✓"
    elif systemctl is-active --quiet ufw; then
        print_status "Configuring ufw..."
        ufw allow out 80
        ufw allow out 443
        print_status "UFW configured ✓"
    else
        print_warning "No active firewall detected, skipping firewall configuration"
    fi
}

# Test installation
test_installation() {
    print_status "Testing installation..."
    
    # Test Python imports
    cd $INSTALL_DIR
    
    if sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/python -c "
import sys
sys.path.insert(0, '$INSTALL_DIR')
import itsm_agent, system_collector, api_client
print('All modules imported successfully')
" 2>/dev/null; then
        print_status "Python modules test passed ✓"
    else
        print_error "Python modules test failed"
        return 1
    fi
    
    # Test configuration loading
    export ITSM_CONFIG_FILE=$CONFIG_DIR/config.ini
    if sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/python -c "
import sys
sys.path.insert(0, '$INSTALL_DIR')
from itsm_agent import ITSMAgent
agent = ITSMAgent('$CONFIG_DIR/config.ini')
print('Configuration loaded successfully')
" 2>/dev/null; then
        print_status "Configuration test passed ✓"
    else
        print_error "Configuration test failed"
        return 1
    fi
    
    print_status "Installation test completed successfully ✓"
    return 0
}

# Create log rotation
setup_log_rotation() {
    print_status "Setting up log rotation..."
    
    cat > /etc/logrotate.d/itsm-agent << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        systemctl reload-or-restart itsm-agent > /dev/null 2>&1 || true
    endscript
}
EOF
    
    print_status "Log rotation configured ✓"
}

# Main installation function
main() {
    echo "ITSM Agent Linux Installation"
    echo "============================="
    echo ""
    
    # Pre-installation checks
    check_root
    detect_distro
    check_python
    
    echo ""
    print_status "Starting installation..."
    
    # Installation steps
    install_system_dependencies
    create_service_user
    create_directories
    install_python_dependencies
    copy_agent_files
    create_systemd_service
    create_management_scripts
    configure_firewall
    setup_log_rotation
    
    echo ""
    
    # Test installation
    if test_installation; then
        echo ""
        print_status "Installation completed successfully!"
    else
        echo ""
        print_warning "Installation completed with test failures"
        print_warning "The service may still work, but manual verification is recommended"
    fi
    
    echo ""
    echo "Configuration:"
    echo "- Installation directory: $INSTALL_DIR"
    echo "- Configuration file: $CONFIG_DIR/config.ini"
    echo "- Log directory: $LOG_DIR"
    echo "- Data directory: $DATA_DIR"
    echo "- Service user: $SERVICE_USER"
    echo ""
    echo "Next steps:"
    echo "1. Edit $CONFIG_DIR/config.ini to configure your API endpoint and authentication"
    echo "2. Start the service: systemctl start $SERVICE_NAME"
    echo "3. Check service status: systemctl status $SERVICE_NAME"
    echo "4. View logs: journalctl -u $SERVICE_NAME"
    echo ""
    echo "Service management commands:"
    echo "- Start service:     systemctl start $SERVICE_NAME  (or itsm-start)"
    echo "- Stop service:      systemctl stop $SERVICE_NAME   (or itsm-stop)"  
    echo "- Restart service:   systemctl restart $SERVICE_NAME"
    echo "- Service status:    systemctl status $SERVICE_NAME  (or itsm-status)"
    echo "- View logs:         journalctl -u $SERVICE_NAME     (or itsm-logs)"
    echo "- Follow logs:       journalctl -u $SERVICE_NAME -f  (or itsm-logs -f)"
    echo ""
    
    # Ask if user wants to start the service now
    read -p "Start the service now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Starting service..."
        if systemctl start $SERVICE_NAME; then
            print_status "Service started successfully ✓"
            
            # Wait a moment and check status
            sleep 2
            
            if systemctl is-active --quiet $SERVICE_NAME; then
                print_status "Service is running ✓"
                echo ""
                echo "Service status:"
                systemctl status $SERVICE_NAME --no-pager -l
            else
                print_warning "Service may not be running properly"
                echo "Check status with: systemctl status $SERVICE_NAME"
                echo "View logs with: journalctl -u $SERVICE_NAME"
            fi
        else
            print_error "Failed to start service"
            echo "Check the configuration and try starting manually:"
            echo "systemctl start $SERVICE_NAME"
        fi
    fi
    
    echo ""
    print_status "Installation complete!"
}

# Run main function
main "$@"
