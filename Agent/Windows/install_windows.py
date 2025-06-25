#!/usr/bin/env python3
"""
ITSM Agent Windows Installation Script
Installs the ITSM agent as a Windows service with all dependencies
"""

import os
import sys
import shutil
import subprocess
import platform
import requests
import zipfile
import tempfile
from pathlib import Path
import ctypes


def check_admin_privileges():
    """Check if running with administrator privileges"""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("Error: Python 3.8 or higher is required")
        print(f"Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    return True


def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")

    packages = [
        'psutil>=5.8.0',
        'requests>=2.28.0',
        'configparser>=5.0.0'
    ]

    # Try to install pywin32 for Windows service support
    if platform.system().lower() == 'windows':
        packages.append('pywin32>=227')

    for package in packages:
        try:
            print(f"Installing {package}...")
            result = subprocess.run([
                sys.executable, '-m', 'pip', 'install', package, '--upgrade'
            ], check=True, capture_output=True, text=True)
            print(f"✓ Installed {package}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install {package}: {e}")
            print(f"Error output: {e.stderr}")
            return False

    # Special handling for pywin32 post-install
    if platform.system().lower() == 'windows':
        try:
            print("Configuring pywin32...")
            subprocess.run([
                sys.executable, '-c', 
                'import win32serviceutil; print("pywin32 configured successfully")'
            ], check=True, capture_output=True, text=True)
            print("✓ pywin32 configured successfully")
        except subprocess.CalledProcessError as e:
            print("Warning: pywin32 configuration may have issues, but installation will continue")

    return True


def download_nssm():
    """Download NSSM (Non-Sucking Service Manager) for better Windows service support"""
    try:
        print("Downloading NSSM for Windows service management...")

        # Create tools directory
        tools_dir = Path("C:\\Program Files\\ITSM Agent\\tools")
        tools_dir.mkdir(parents=True, exist_ok=True)

        # Check if NSSM already exists
        nssm_exe = tools_dir / "nssm.exe"
        if nssm_exe.exists():
            print("✓ NSSM already installed")
            return str(tools_dir)

        # Download NSSM
        nssm_url = "https://nssm.cc/release/nssm-2.24.zip"

        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / "nssm.zip"

            print("Downloading NSSM...")
            response = requests.get(nssm_url, stream=True, timeout=30)
            response.raise_for_status()

            with open(zip_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            # Extract NSSM
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)

            # Find the appropriate NSSM executable
            arch = platform.architecture()[0]
            nssm_folder = "win64" if arch == "64bit" else "win32"

            nssm_source = Path(temp_dir) / "nssm-2.24" / nssm_folder / "nssm.exe"

            if nssm_source.exists():
                shutil.copy2(nssm_source, nssm_exe)
                print("✓ NSSM installed successfully")
                return str(tools_dir)
            else:
                print("✗ NSSM executable not found in download")
                return None

    except Exception as e:
        print(f"Warning: Could not download NSSM: {e}")
        print("Service installation will use fallback method")
        return None


def create_installation_directory():
    """Create installation directory and copy files"""
    install_dir = Path("C:\\Program Files\\ITSM Agent")

    print(f"Creating installation directory: {install_dir}")
    install_dir.mkdir(parents=True, exist_ok=True)

    # Create subdirectories
    (install_dir / "logs").mkdir(exist_ok=True)
    (install_dir / "config").mkdir(exist_ok=True)
    (install_dir / "data").mkdir(exist_ok=True)

    # Core agent files to copy
    agent_files = [
        'itsm_agent.py',
        'system_collector.py', 
        'api_client.py',
        'command_scheduler.py',
        'operation_monitor.py',
        'smart_queue.py',
        'service_wrapper.py',
        'config_validator.py',
        'network_monitor.py',
        'performance_baseline.py'
    ]

    # Copy agent files
    print("Copying agent files...")
    script_dir = Path(__file__).parent

    print("Copying agent files...")
    for file_name in agent_files:
        src_file = script_dir / file_name
        dst_file = install_dir / file_name

        if src_file.exists():
            shutil.copy2(src_file, dst_file)
            print(f"✓ Copied {file_name}")
        else:
            print(f"✗ Source file not found: {file_name}")
            return None

    return install_dir


def configure_agent(install_dir):
    """Configure the agent with default settings"""
    config_file = install_dir / "config.ini"

    if not config_file.exists():
        print("✗ Configuration file not found")
        return False

    print("Agent configuration:")
    print(f"- Configuration file: {config_file}")
    print("- Edit the config.ini file to set your API endpoint and authentication")
    
    # Read current config values
    try:
        import configparser
        config = configparser.ConfigParser()
        config.read(config_file)
        current_url = config.get('api', 'base_url', fallback='http://localhost:5000')
        current_token = config.get('api', 'auth_token', fallback='dashboard-api-token')
        print(f"- Current API URL: {current_url}")
        print(f"- Current auth token: {current_token}")
    except Exception:
        print("- Default API URL: http://localhost:5000")
        print("- Default auth token: dashboard-api-token")

    return True


def install_windows_service(install_dir, nssm_path=None):
    """Install and configure Windows service"""
    print("Installing Windows service...")

    service_name = "ITSMAgent"
    display_name = "ITSM Endpoint Agent"

    try:
        # First, clean up any existing service
        print("Cleaning up existing service...")
        subprocess.run(['sc', 'stop', service_name], capture_output=True)
        subprocess.run(['sc', 'delete', service_name], capture_output=True)

        # If NSSM is available, try to remove using NSSM too
        if nssm_path:
            nssm_exe = Path(nssm_path) / "nssm.exe"
            if nssm_exe.exists():
                subprocess.run([str(nssm_exe), 'remove', service_name, 'confirm'], capture_output=True)

        # Wait a moment for cleanup
        import time
        time.sleep(2)

        # Ensure we're in the correct directory
        original_dir = os.getcwd()
        os.chdir(install_dir)

        try:
            if nssm_path:
                # Use NSSM for better service management
                nssm_exe = Path(nssm_path) / "nssm.exe"

                if nssm_exe.exists():
                    print("Installing service with NSSM...")

                    # Install service
                    install_cmd = [
                        str(nssm_exe), 'install', service_name,
                        sys.executable, f'"{str(install_dir / "itsm_agent.py")}"'
                    ]

                    result = subprocess.run(install_cmd, capture_output=True, text=True)

                    if result.returncode == 0:
                        # Configure service with comprehensive settings
                        subprocess.run([str(nssm_exe), 'set', service_name, 'DisplayName', display_name])
                        subprocess.run([str(nssm_exe), 'set', service_name, 'Description', 
                                      'ITSM Endpoint Agent - Collects and reports system information'])
                        subprocess.run([str(nssm_exe), 'set', service_name, 'Start', 'SERVICE_AUTO_START'])
                        subprocess.run([str(nssm_exe), 'set', service_name, 'AppDirectory', str(install_dir)])
                        
                        # Configure logging
                        log_dir = install_dir / "logs"
                        log_dir.mkdir(exist_ok=True)
                        subprocess.run([str(nssm_exe), 'set', service_name, 'AppStdout', str(log_dir / 'stdout.log')])
                        subprocess.run([str(nssm_exe), 'set', service_name, 'AppStderr', str(log_dir / 'stderr.log')])
                        subprocess.run([str(nssm_exe), 'set', service_name, 'AppRotateFiles', '1'])
                        
                        # Set recovery options
                        subprocess.run([str(nssm_exe), 'set', service_name, 'AppExit', 'Default', 'Restart'])
                        subprocess.run([str(nssm_exe), 'set', service_name, 'AppRestartDelay', '60000'])  # 1 minute

                        print("✓ Windows service installed successfully with NSSM")
                        return True
                    else:
                        print(f"✗ NSSM service installation failed: {result.stderr}")

            # Fallback to Python service installation
            print("Installing service with Python service wrapper...")
            result = subprocess.run([
                sys.executable, 'itsm_agent.py', 'install'
            ], capture_output=True, text=True)
        finally:
            # Restore original directory
            os.chdir(original_dir)

        if result.returncode == 0:
            print("✓ Windows service installed successfully")

            # Set service to start automatically
            subprocess.run([
                'sc', 'config', service_name, 'start=', 'auto'
            ], capture_output=True)

            print("✓ Service configured to start automatically")
            return True
        else:
            print(f"✗ Service installation failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"✗ Error installing service: {e}")
        return False


def create_start_script(install_dir):
    """Create a start script for manual execution"""
    start_script = install_dir / "start_agent.bat"

    script_content = f'''@echo off
cd /d "{install_dir}"
echo Starting ITSM Agent...
"{sys.executable}" itsm_agent.py
pause
'''

    try:
        with open(start_script, 'w') as f:
            f.write(script_content)

        print(f"✓ Created start script: {start_script}")
        return True

    except Exception as e:
        print(f"✗ Could not create start script: {e}")
        return False


def create_shortcuts():
    """Create desktop shortcuts for service management"""
    try:
        desktop = Path.home() / "Desktop"

        # Create service management batch files
        install_dir = Path("C:\\Program Files\\ITSM Agent")

        shortcuts = [
            ('Start ITSM Agent Service.bat', 'sc start ITSMAgent'),
            ('Stop ITSM Agent Service.bat', 'sc stop ITSMAgent'),
            ('ITSM Agent Status.bat', 'sc query ITSMAgent & pause'),
            ('ITSM Agent Logs.bat', f'notepad "{install_dir}\\logs\\itsm_agent.log"')
        ]

        for shortcut_name, command in shortcuts:
            shortcut_path = desktop / shortcut_name

            batch_content = f'''@echo off
echo {shortcut_name.replace('.bat', '')}...
{command}
'''

            with open(shortcut_path, 'w') as f:
                f.write(batch_content)

        print("✓ Desktop shortcuts created")
        return True

    except Exception as e:
        print(f"Warning: Could not create shortcuts: {e}")
        return True


def setup_firewall():
    """Setup Windows Firewall rules if needed"""
    try:
        print("Configuring Windows Firewall...")

        # Allow Python through firewall for ITSM communication
        rule_name = "ITSM Agent"

        # Remove existing rule if it exists
        subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'delete', 'rule', 
            f'name="{rule_name}"'
        ], capture_output=True)

        # Add new rule
        result = subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'add', 'rule',
            f'name="{rule_name}"',
            'dir=out',
            'action=allow',
            f'program="{sys.executable}"',
            'enable=yes'
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print("✓ Firewall rule created")
        else:
            print("Note: Could not create firewall rule (this is optional)")

        return True

    except Exception as e:
        print(f"Note: Could not configure firewall: {e}")
        return True


def test_installation(install_dir):
    """Test the installation"""
    print("Testing installation...")

    try:
        # Test Python imports
        os.chdir(install_dir)
        result = subprocess.run([
            sys.executable, '-c', 
            'import itsm_agent, system_collector, api_client, network_monitor, performance_baseline; print("All modules imported successfully")'
        ], capture_output=True, text=True, timeout=10)

        if result.returncode == 0:
            print("✓ Python modules test passed")
        else:
            print(f"✗ Python modules test failed: {result.stderr}")
            return False

        # Test configuration loading
        result = subprocess.run([
            sys.executable, '-c',
            'from itsm_agent import ITSMAgent; agent = ITSMAgent(); print("Configuration loaded successfully")'
        ], capture_output=True, text=True, timeout=10)

        if result.returncode == 0:
            print("✓ Configuration test passed")
        else:
            print(f"✗ Configuration test failed: {result.stderr}")
            return False

        print("✓ Installation test completed successfully")
        return True

    except Exception as e:
        print(f"✗ Installation test failed: {e}")
        return False


def main():
    """Main installation function"""
    print("ITSM Agent Windows Installation")
    print("=" * 50)
    print()

    # Check administrator privileges
    if not check_admin_privileges():
        print("Error: This script must be run as Administrator")
        print("Right-click on Command Prompt and select 'Run as Administrator'")
        input("Press Enter to exit...")
        return 1

    # Check Python version
    if not check_python_version():
        input("Press Enter to exit...")
        return 1

    print(f"Python version: {sys.version}")
    print(f"Platform: {platform.platform()}")
    print()

    # Install dependencies
    if not install_dependencies():
        print("Error: Failed to install dependencies")
        input("Press Enter to exit...")
        return 1

    print()

    # Download NSSM
    nssm_path = download_nssm()
    print()

    # Create installation directory
    install_dir = create_installation_directory()
    if not install_dir:
        print("Error: Failed to create installation directory")
        input("Press Enter to exit...")
        return 1

    print()

    # Configure agent
    if not configure_agent(install_dir):
        print("Error: Failed to configure agent")
        input("Press Enter to exit...")
        return 1

    print()

    # Install Windows service
    if not install_windows_service(install_dir, nssm_path):
        print("Error: Failed to install Windows service")
        input("Press Enter to exit...")
        return 1

    print()

    # Create additional files
    create_start_script(install_dir)
    create_shortcuts()
    setup_firewall()

    print()

    # Test installation
    if not test_installation(install_dir):
        print("Warning: Installation test failed, but installation may still work")

    print()
    print("Installation completed successfully!")
    print()
    print("Configuration:")
    print(f"- Installation directory: {install_dir}")
    print(f"- Configuration file: {install_dir}\\config.ini")
    print(f"- Log files: {install_dir}\\logs\\")
    print()
    print("Next steps:")
    print("1. Edit config.ini to configure your API endpoint and authentication token")
    print("2. Start the service: sc start ITSMAgent")
    print("3. Check service status: sc query ITSMAgent")
    print("4. View logs: Check the logs directory or Event Viewer")
    print()
    print("Service management:")
    print("- Start service:   sc start ITSMAgent")
    print("- Stop service:    sc stop ITSMAgent")
    print("- Service status:  sc query ITSMAgent")
    print("- Restart service: sc stop ITSMAgent && sc start ITSMAgent")
    print()

    # Ask if user wants to start the service now
    start_now = input("Start the service now? (y/n): ").lower().strip()

    if start_now in ['y', 'yes']:
        try:
            result = subprocess.run(['sc', 'start', 'ITSMAgent'], 
                                  capture_output=True, text=True, check=True)
            print("✓ Service started successfully")

            # Wait a moment and check status
            import time
            time.sleep(2)

            status_result = subprocess.run(['sc', 'query', 'ITSMAgent'], 
                                         capture_output=True, text=True)
            if 'RUNNING' in status_result.stdout:
                print("✓ Service is running")
            else:
                print("Service status:")
                print(status_result.stdout)

        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to start service: {e}")
            print("You can start it manually later with: sc start ITSMAgent")

    print()
    input("Press Enter to exit...")
    return 0


if __name__ == '__main__':
    sys.exit(main())