
#!/usr/bin/env python3
"""
ITSM Agent Service Diagnostic Tool for Windows
Diagnoses and fixes common Windows service issues
"""

import os
import sys
import subprocess
import platform
import configparser
from pathlib import Path
import ctypes

def print_status(message):
    print(f"[INFO] {message}")

def print_error(message):
    print(f"[ERROR] {message}")

def print_success(message):
    print(f"[SUCCESS] {message}")

def check_admin_privileges():
    """Check if running with administrator privileges"""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def check_service_status():
    """Check the current service status"""
    print_status("Checking service status...")
    try:
        result = subprocess.run(['sc', 'query', 'ITSMAgent'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("Service status:")
            print(result.stdout)
            return 'RUNNING' in result.stdout
        else:
            print_error("Service is not installed")
            return False
    except Exception as e:
        print_error(f"Failed to check service status: {e}")
        return False

def check_installation_files():
    """Check if all required files are present"""
    install_dir = Path("C:/Program Files/ITSM Agent")
    print_status(f"Checking installation directory: {install_dir}")

    if not install_dir.exists():
        print_error("Installation directory does not exist")
        return False

    required_files = [
        'itsm_agent.py',
        'system_collector.py', 
        'api_client.py',
        'command_scheduler.py',
        'operation_monitor.py',
        'smart_queue.py',
        'service_wrapper.py',
        'config.ini',
        'config_validator.py',
        'network_monitor.py',
        'performance_baseline.py'
    ]

    missing_files = []
    for file in required_files:
        file_path = install_dir / file
        if file_path.exists():
            print_status(f"File {file}: OK")
        else:
            missing_files.append(file)
            print_error(f"File {file}: MISSING")

    if missing_files:
        print_error(f"Missing files: {', '.join(missing_files)}")
        return False

    return True

def check_python_dependencies():
    """Check Python dependencies"""
    print_status("Checking Python dependencies...")
    
    required_packages = ['psutil', 'requests', 'configparser']
    missing_packages = []

    for package in required_packages:
        try:
            __import__(package)
            print_status(f"Package {package}: OK")
        except ImportError:
            missing_packages.append(package)
            print_error(f"Package {package}: MISSING")

    if missing_packages:
        print_error(f"Missing packages: {', '.join(missing_packages)}")
        return False

    return True

def check_configuration():
    """Check configuration file"""
    config_path = Path("C:/Program Files/ITSM Agent/config.ini")
    print_status("Checking configuration file...")

    if not config_path.exists():
        print_error("Configuration file does not exist")
        return False

    try:
        config = configparser.ConfigParser()
        config.read(config_path)

        # Check required sections
        required_sections = ['agent', 'api', 'monitoring', 'scheduling']
        for section in required_sections:
            if section in config:
                print_status(f"Configuration section [{section}]: OK")
            else:
                print_error(f"Configuration section [{section}]: MISSING")
                return False

        # Check critical settings
        base_url = config.get('api', 'base_url', fallback='')
        auth_token = config.get('api', 'auth_token', fallback='')
        
        if not base_url or base_url == 'http://localhost:5000':
            print_error("API base_url not properly configured")
            return False
            
        if not auth_token or auth_token == 'dashboard-api-token':
            print_error("API auth_token not properly configured")
            return False

        print_status(f"API URL: {base_url}")
        print_status("API token: Configured")

        return True

    except Exception as e:
        print_error(f"Configuration check failed: {e}")
        return False

def test_agent_startup():
    """Test agent startup"""
    print_status("Testing agent startup...")
    
    install_dir = Path("C:/Program Files/ITSM Agent")
    os.chdir(install_dir)
    
    try:
        # Test agent import and basic initialization
        result = subprocess.run([
            sys.executable, '-c',
            'from itsm_agent import ITSMAgent; agent = ITSMAgent(); print("Agent initialization successful")'
        ], capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            print_success("Agent startup test passed")
            return True
        else:
            print_error(f"Agent startup test failed: {result.stderr}")
            return False

    except subprocess.TimeoutExpired:
        print_error("Agent startup test timed out")
        return False
    except Exception as e:
        print_error(f"Agent startup test failed: {e}")
        return False

def check_event_logs():
    """Check Windows Event Logs for service errors"""
    print_status("Checking Windows Event Logs...")
    
    try:
        # Check Application event log for ITSM Agent events
        result = subprocess.run([
            'wevtutil', 'qe', 'Application', '/q:*[System[Provider[@Name="ITSM Agent"]]]',
            '/f:text', '/c:5'
        ], capture_output=True, text=True)
        
        if result.stdout.strip():
            print("Recent ITSM Agent events:")
            print(result.stdout)
        else:
            print_status("No recent ITSM Agent events found")
            
        # Check System event log for service-related errors
        result = subprocess.run([
            'wevtutil', 'qe', 'System', '/q:*[System[Provider[@Name="Service Control Manager"]] and EventData[Data="ITSMAgent"]]',
            '/f:text', '/c:5'
        ], capture_output=True, text=True)
        
        if result.stdout.strip():
            print("Recent Service Control Manager events for ITSMAgent:")
            print(result.stdout)
        else:
            print_status("No recent Service Control Manager events found")
            
        return True
        
    except Exception as e:
        print_error(f"Could not check event logs: {e}")
        return False

def repair_service():
    """Attempt to repair the service"""
    print_status("Attempting service repair...")
    
    try:
        # Stop service
        subprocess.run(['sc', 'stop', 'ITSMAgent'], capture_output=True)
        
        # Delete service
        subprocess.run(['sc', 'delete', 'ITSMAgent'], capture_output=True)
        
        # Wait a moment
        import time
        time.sleep(3)
        
        # Reinstall service
        install_dir = Path("C:/Program Files/ITSM Agent")
        os.chdir(install_dir)
        
        result = subprocess.run([
            sys.executable, 'itsm_agent.py', 'install'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print_success("Service reinstalled successfully")
            
            # Try to start service
            start_result = subprocess.run(['sc', 'start', 'ITSMAgent'], 
                                        capture_output=True, text=True)
            
            if start_result.returncode == 0:
                print_success("Service started successfully")
                return True
            else:
                print_error(f"Service start failed: {start_result.stderr}")
                return False
        else:
            print_error(f"Service reinstallation failed: {result.stderr}")
            return False
            
    except Exception as e:
        print_error(f"Service repair failed: {e}")
        return False

def main():
    """Main diagnostic function"""
    print("ITSM Agent Service Diagnostic Tool")
    print("=" * 50)
    print()

    if not check_admin_privileges():
        print_error("This script must be run as Administrator")
        print("Right-click and select 'Run as administrator'")
        input("Press Enter to exit...")
        return 1

    print_status("Starting diagnostic checks...")
    print()

    # Run all diagnostic checks
    checks = [
        ("Installation Files", check_installation_files),
        ("Python Dependencies", check_python_dependencies),
        ("Configuration", check_configuration),
        ("Agent Startup", test_agent_startup),
        ("Service Status", check_service_status),
        ("Event Logs", check_event_logs)
    ]

    failed_checks = []
    
    for check_name, check_func in checks:
        print(f"Running {check_name} check...")
        if not check_func():
            failed_checks.append(check_name)
        print()

    if failed_checks:
        print_error(f"Failed checks: {', '.join(failed_checks)}")
        
        # Ask if user wants to attempt repair
        repair = input("Attempt automatic repair? (y/n): ").lower().strip()
        if repair in ['y', 'yes']:
            if repair_service():
                print_success("Repair completed successfully")
            else:
                print_error("Repair failed - manual intervention required")
    else:
        print_success("All diagnostic checks passed")

    print()
    print("Diagnostic completed.")
    input("Press Enter to exit...")
    return 0

if __name__ == "__main__":
    sys.exit(main())
