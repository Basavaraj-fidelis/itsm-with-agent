#!/usr/bin/env python3
"""
Windows Service Repair Utility for ITSM Agent
Fixes common Windows service installation and startup issues
"""

import os
import sys
import subprocess
import winreg
import shutil
from pathlib import Path

def print_status(message):
    print(f"[INFO] {message}")

def print_error(message):
    print(f"[ERROR] {message}")

def print_warning(message):
    print(f"[WARNING] {message}")

def check_admin_privileges():
    """Check if running with administrator privileges"""
    try:
        return os.getuid() == 0
    except AttributeError:
        # Windows
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin()
        except:
            return False

def stop_service():
    """Stop the ITSM Agent service"""
    print_status("Stopping ITSM Agent service...")
    try:
        result = subprocess.run(['sc', 'stop', 'ITSMAgent'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print_status("Service stopped successfully")
        else:
            print_warning("Service may not have been running")
        return True
    except Exception as e:
        print_error(f"Failed to stop service: {e}")
        return False

def delete_service():
    """Delete the ITSM Agent service"""
    print_status("Deleting ITSM Agent service...")
    try:
        result = subprocess.run(['sc', 'delete', 'ITSMAgent'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print_status("Service deleted successfully")
        else:
            print_warning("Service may not have existed")
        return True
    except Exception as e:
        print_error(f"Failed to delete service: {e}")
        return False

def clean_registry():
    """Clean up registry entries"""
    print_status("Cleaning registry entries...")

    registry_paths = [
        r"SYSTEM\CurrentControlSet\Services\ITSMAgent",
        r"SYSTEM\CurrentControlSet\Services\EventLog\Application\ITSMAgent"
    ]

    for path in registry_paths:
        try:
            winreg.DeleteKey(winreg.HKEY_LOCAL_MACHINE, path)
            print_status(f"Deleted registry key: {path}")
        except FileNotFoundError:
            print_warning(f"Registry key not found: {path}")
        except Exception as e:
            print_error(f"Failed to delete registry key {path}: {e}")

def check_python_installation():
    """Check Python installation and dependencies"""
    print_status("Checking Python installation...")

    try:
        result = subprocess.run([sys.executable, '--version'], 
                              capture_output=True, text=True)
        print_status(f"Python version: {result.stdout.strip()}")
    except Exception as e:
        print_error(f"Python check failed: {e}")
        return False

    # Check required packages
    required_packages = ['psutil', 'requests', 'pywin32']
    missing_packages = []

    for package in required_packages:
        try:
            __import__(package)
            print_status(f"Package {package}: OK")
        except ImportError:
            missing_packages.append(package)
            print_error(f"Package {package}: MISSING")

    if missing_packages:
        print_warning(f"Missing packages: {', '.join(missing_packages)}")
        return False

    return True

def install_missing_packages():
    """Install missing Python packages"""
    print_status("Installing missing Python packages...")

    packages = ['psutil', 'requests', 'pywin32']

    for package in packages:
        try:
            print_status(f"Installing {package}...")
            result = subprocess.run([sys.executable, '-m', 'pip', 'install', package],
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print_status(f"Successfully installed {package}")
            else:
                print_error(f"Failed to install {package}: {result.stderr}")
        except Exception as e:
            print_error(f"Exception installing {package}: {e}")

def check_installation_directory():
    """Check installation directory and files"""
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
        'config.ini'
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

def fix_file_permissions():
    """Fix file permissions for installation directory"""
    install_dir = Path("C:/Program Files/ITSM Agent")
    print_status("Fixing file permissions...")

    try:
        # Give full control to SYSTEM and Administrators
        subprocess.run([
            'icacls', str(install_dir), 
            '/grant', 'SYSTEM:(OI)(CI)F',
            '/grant', 'Administrators:(OI)(CI)F',
            '/T'
        ], check=True)
        print_status("File permissions fixed")
        return True
    except Exception as e:
        print_error(f"Failed to fix permissions: {e}")
        return False

def create_service():
    """Create the ITSM Agent service"""
    install_dir = Path("C:/Program Files/ITSM Agent")
    python_exe = sys.executable
    script_path = install_dir / "itsm_agent.py"

    print_status("Creating ITSM Agent service...")

    try:
        # Use sc command to create service
        cmd = [
            'sc', 'create', 'ITSMAgent',
            'binPath=', f'"{python_exe}" "{script_path}"',
            'start=', 'auto',
            'DisplayName=', 'ITSM Agent Service',
            'depend=', 'Tcpip'
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0:
            print_status("Service created successfully")

            # Set service description
            subprocess.run([
                'sc', 'description', 'ITSMAgent',
                'Non-intrusive ITSM endpoint agent for system monitoring and management'
            ])

            return True
        else:
            print_error(f"Failed to create service: {result.stderr}")
            return False

    except Exception as e:
        print_error(f"Exception creating service: {e}")
        return False

def start_service():
    """Start the ITSM Agent service"""
    print_status("Starting ITSM Agent service...")

    try:
        result = subprocess.run(['sc', 'start', 'ITSMAgent'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print_status("Service started successfully")
            return True
        else:
            print_error(f"Failed to start service: {result.stderr}")
            return False
    except Exception as e:
        print_error(f"Exception starting service: {e}")
        return False

def check_service_status():
    """Check the current service status"""
    print_status("Checking service status...")

    try:
        result = subprocess.run(['sc', 'query', 'ITSMAgent'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print_status("Service status:")
            print(result.stdout)
            return True
        else:
            print_warning("Service is not installed")
            return False
    except Exception as e:
        print_error(f"Failed to check service status: {e}")
        return False

def test_configuration():
    """Test configuration file"""
    config_path = Path("C:/Program Files/ITSM Agent/config.ini")
    print_status("Testing configuration file...")

    if not config_path.exists():
        print_error("Configuration file does not exist")
        return False

    try:
        import configparser
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
        if 'base_url' not in config['api']:
            print_warning("API base_url not configured")
        if 'auth_token' not in config['api']:
            print_warning("API auth_token not configured")

        return True

    except Exception as e:
        print_error(f"Configuration test failed: {e}")
        return False

def test_api_connectivity():
    """Test API connectivity"""
    print_status("Testing API connectivity...")

    try:
        import requests
        import configparser

        # Read API URL from config
        config_path = Path("C:/Program Files/ITSM Agent/config.ini")
        if config_path.exists():
            config = configparser.ConfigParser()
            config.read(config_path)
            base_url = config.get('api', 'base_url', fallback='http://localhost:5000/api')
            # Remove /api suffix if present and add /health
            if base_url.endswith('/api'):
                api_url = base_url.replace('/api', '/api/health')
            else:
                api_url = f"{base_url}/api/health"
        else:
            api_url = "http://localhost:5000/api/health"
            print_warning("Config file not found, using default URL")

        print_status(f"Testing connection to: {api_url}")
        response = requests.get(api_url, timeout=10)

        if response.status_code == 200:
            print_success("API connectivity: OK")
            return True
        else:
            print_error(f"API returned status {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to API server")
        return False
    except requests.exceptions.Timeout:
        print_error("API request timeout")
        return False
    except Exception as e:
        print_error(f"API test failed: {e}")
        return False

def main():
    """Main repair function"""
    print("ITSM Agent Windows Service Repair Utility")
    print("=========================================")
    print()

    if not check_admin_privileges():
        print_error("This script must be run as Administrator")
        print("Right-click and select 'Run as administrator'")
        sys.exit(1)

    print_status("Starting service repair process...")

    # Step 1: Stop and remove existing service
    stop_service()
    delete_service()

    # Step 2: Clean registry
    clean_registry()

    # Step 3: Check Python and packages
    if not check_python_installation():
        install_missing_packages()
        if not check_python_installation():
            print_error("Python setup failed. Please install required packages manually:")
            print("pip install psutil requests pywin32")
            return False

    # Step 4: Check installation files
    if not check_installation_directory():
        print_error("Installation directory or files are missing")
        print("Please run the installation script again")
        return False

    # Step 5: Fix permissions
    fix_file_permissions()

    # Step 6: Test configuration
    if not test_configuration():
        print_warning("Configuration issues detected")
        print("Please review C:/Program Files/ITSM Agent/config.ini")

    # Step 7: Recreate service
    if not create_service():
        print_error("Failed to create service")
        return False

    # Step 8: Start service
    if not start_service():
        print_error("Failed to start service")
        print("Check Windows Event Log for detailed error information")
        return False

    # Step 9: Verify service status
    check_service_status()

    print()
    print_status("Service repair completed successfully!")
    print()
    print("Next steps:")
    print("1. Verify configuration in: C:/Program Files/ITSM Agent/config.ini")
    print("2. Check service logs for any warnings")
    print("3. Monitor service status: sc query ITSMAgent")

    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)