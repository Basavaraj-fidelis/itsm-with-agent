
#!/usr/bin/env python3
"""
Windows Configuration Fix Script for ITSM Agent
Fixes configuration parsing errors and restarts the service
"""

import os
import sys
import subprocess
import configparser
from pathlib import Path

def print_status(message):
    """Print status message"""
    print(f"[INFO] {message}")

def print_error(message):
    """Print error message"""
    print(f"[ERROR] {message}")

def print_success(message):
    """Print success message"""
    print(f"[SUCCESS] {message}")

def stop_service():
    """Stop ITSM Agent service"""
    try:
        print_status("Checking service status...")
        
        # Check current status
        status_result = subprocess.run(['sc', 'query', 'ITSMAgent'], 
                                     capture_output=True, text=True, check=False)
        
        if "PAUSED" in status_result.stdout:
            print_status("Service is PAUSED, attempting to continue...")
            # Try to continue the paused service first
            continue_result = subprocess.run(['sc', 'continue', 'ITSMAgent'], 
                                           capture_output=True, text=True, check=False)
            if continue_result.returncode == 0:
                print_status("Service continued from PAUSED state")
            
            # Wait a moment then stop
            import time
            time.sleep(2)
        
        print_status("Stopping ITSM Agent service...")
        result = subprocess.run(['sc', 'stop', 'ITSMAgent'], 
                              capture_output=True, text=True, check=False)
        if result.returncode == 0:
            print_success("Service stopped successfully")
            return True
        elif "service has not been started" in result.stderr.lower():
            print_success("Service was not running")
            return True
        else:
            print_error(f"Failed to stop service: {result.stderr}")
            return False
    except Exception as e:
        print_error(f"Error stopping service: {e}")
        return False

def start_service():
    """Start ITSM Agent service"""
    try:
        print_status("Starting ITSM Agent service...")
        result = subprocess.run(['sc', 'start', 'ITSMAgent'], 
                              capture_output=True, text=True, check=False)
        if result.returncode == 0:
            print_success("Service started successfully")
            return True
        else:
            print_error(f"Failed to start service: {result.stderr}")
            return False
    except Exception as e:
        print_error(f"Error starting service: {e}")
        return False

def get_service_status():
    """Get service status"""
    try:
        result = subprocess.run(['sc', 'query', 'ITSMAgent'], 
                              capture_output=True, text=True, check=False)
        if result.returncode == 0:
            return result.stdout
        else:
            return f"Error getting status: {result.stderr}"
    except Exception as e:
        return f"Error: {e}"

def fix_config_file():
    """Fix configuration file parsing errors"""
    config_path = Path("C:/Program Files/ITSM Agent/config.ini")
    
    if not config_path.exists():
        print_error(f"Configuration file not found: {config_path}")
        return False
    
    try:
        print_status("Backing up existing configuration...")
        backup_path = config_path.with_suffix('.ini.backup')
        if config_path.exists():
            import shutil
            shutil.copy2(config_path, backup_path)
            print_success(f"Backup created: {backup_path}")
        
        # Create fixed configuration
        print_status("Creating fixed configuration...")
        
        fixed_config = """
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
base_url = https://9a952752-7cf3-4c76-a203-0413c6fe3adc-00-q98ajwzbdtxi.pike.replit.dev/api
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

# Command whitelisting - only these command patterns are allowed
allowed_command_patterns = ^echo .*,^ls( .*)?$,^dir( .*)?$,^pwd$,^whoami$,^hostname$,^date$,^uptime$,^systemctl (status|is-active|is-enabled) [a-zA-Z0-9._-]+$,^sc (query|queryex) [a-zA-Z0-9._-]+$,^net start$,^net stop [a-zA-Z0-9._-]+$,^net start [a-zA-Z0-9._-]+$,^ping -[a-zA-Z0-9]+ [a-zA-Z0-9.-]+$,^ping [a-zA-Z0-9.-]+$,^nslookup [a-zA-Z0-9.-]+$,^telnet [a-zA-Z0-9.-]+ [0-9]+$,^netstat -[a-zA-Z0-9]+$,^tasklist( /.*)?$,^ps( .*)?$,^df -h$,^free -h$,^top -n 1$,^wmic .*,^Get-Process.*,^Get-Service.*,^Test-Connection.*

# Command blacklisting - these patterns are always blocked
blocked_command_patterns = ^rm -rf .*,^del /[sf] .*,^format .*,^fdisk .*,^mkfs .*,^dd if=.*,.*password.*,.*passwd.*,.*shutdown.*,.*reboot.*,.*restart.*,^sudo .*,^su .*,.*& .*,.*; .*,.*\| .*,.*> .*,.*>> .*,.*< .*,^chmod 777 .*,^chown root .*,.*net user.*add.*,.*useradd.*,.*userdel.*,.*usermod.*,^wget .*,^curl.*-o.*,^powershell.*DownloadFile.*,.*Invoke-WebRequest.*,.*Start-Process.*,.*Invoke-Expression.*,.*eval.*,.*exec.*

[network]
# Network connectivity monitoring
connectivity_check_interval = 300
connectivity_endpoints = http://0.0.0.0:5000/api/health,8.8.8.8,1.1.1.1
timeout_threshold = 10
failure_threshold = 3

[performance]
# Performance baseline tracking
enable_baseline_tracking = true
baseline_collection_interval = 3600
baseline_history_days = 30
degradation_threshold = 25
""".strip()
        
        # Write fixed configuration
        with open(config_path, 'w') as f:
            f.write(fixed_config)
        
        print_success("Configuration file fixed")
        
        # Validate the fixed configuration
        print_status("Validating fixed configuration...")
        config = configparser.ConfigParser()
        config.read(config_path)
        
        required_sections = ['agent', 'api', 'monitoring', 'scheduling', 'security', 'network', 'performance']
        for section in required_sections:
            if section in config:
                print_success(f"Section [{section}]: OK")
            else:
                print_error(f"Section [{section}]: MISSING")
                return False
        
        print_success("Configuration validation passed")
        return True
        
    except Exception as e:
        print_error(f"Failed to fix configuration: {e}")
        return False

def test_agent_import():
    """Test if agent can be imported successfully"""
    try:
        print_status("Testing agent import...")
        
        # Change to agent directory
        agent_dir = Path("C:/Program Files/ITSM Agent")
        os.chdir(agent_dir)
        
        # Test import
        import sys
        if str(agent_dir) not in sys.path:
            sys.path.insert(0, str(agent_dir))
        
        # Try to import the main agent module
        import itsm_agent
        print_success("Agent import test passed")
        return True
        
    except Exception as e:
        print_error(f"Agent import test failed: {e}")
        return False

def main():
    """Main function"""
    print("ITSM Agent Configuration Fix Utility")
    print("=" * 50)
    
    # Check if running as administrator
    try:
        import ctypes
        is_admin = ctypes.windll.shell32.IsUserAnAdmin()
        if not is_admin:
            print_error("This script must be run as Administrator")
            print("Right-click on Command Prompt and select 'Run as administrator'")
            input("Press Enter to exit...")
            return False
    except:
        print_error("Unable to check administrator privileges")
    
    # Stop the service first
    stop_service()
    
    # Fix configuration file
    if not fix_config_file():
        print_error("Failed to fix configuration file")
        input("Press Enter to exit...")
        return False
    
    # Test agent import
    if not test_agent_import():
        print_error("Agent import test failed")
        input("Press Enter to exit...")
        return False
    
    # Start the service
    if start_service():
        print_success("Service started successfully")
        
        # Wait a moment and check status
        import time
        time.sleep(3)
        
        print_status("Final service status:")
        status = get_service_status()
        print(status)
        
        if "RUNNING" in status:
            print_success("ITSM Agent service is now running properly!")
        else:
            print_error("Service may not be running correctly. Check logs for details.")
    else:
        print_error("Failed to start service")
    
    input("Press Enter to exit...")
    return True

if __name__ == "__main__":
    main()
