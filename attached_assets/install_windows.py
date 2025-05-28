#!/usr/bin/env python3
"""
ITSM Agent Windows Installation Script
Installs the ITSM agent as a Windows service
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path


def check_admin_privileges():
    """Check if running with administrator privileges"""
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")
    
    packages = [
        'psutil',
        'requests',
        'configparser',
        'pywin32'
    ]
    
    for package in packages:
        try:
            subprocess.run([
                sys.executable, '-m', 'pip', 'install', package
            ], check=True, capture_output=True)
            print(f"✓ Installed {package}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install {package}: {e}")
            return False
    
    return True


def create_installation_directory():
    """Create installation directory and copy files"""
    install_dir = Path("C:\\Program Files\\ITSM Agent")
    
    print(f"Creating installation directory: {install_dir}")
    install_dir.mkdir(parents=True, exist_ok=True)
    
    # Create logs directory
    logs_dir = install_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    # Copy agent files
    script_dir = Path(__file__).parent
    files_to_copy = [
        'itsm_agent.py',
        'system_collector.py',
        'api_client.py',
        'service_wrapper.py',
        'config.ini'
    ]
    
    print("Copying agent files...")
    for file_name in files_to_copy:
        src_file = script_dir / file_name
        dst_file = install_dir / file_name
        
        if src_file.exists():
            shutil.copy2(src_file, dst_file)
            print(f"✓ Copied {file_name}")
        else:
            print(f"✗ Source file not found: {file_name}")
            return None
    
    return install_dir


def install_windows_service(install_dir):
    """Install and configure Windows service"""
    print("Installing Windows service...")
    
    try:
        # Change to installation directory
        os.chdir(install_dir)
        
        # Install the service
        result = subprocess.run([
            sys.executable, 'itsm_agent.py', 'install'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Windows service installed successfully")
            
            # Set service to start automatically
            subprocess.run([
                'sc', 'config', 'ITSMAgent', 'start=', 'auto'
            ], capture_output=True)
            
            print("✓ Service configured to start automatically")
            return True
        else:
            print(f"✗ Service installation failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"✗ Error installing service: {e}")
        return False


def create_shortcuts(install_dir):
    """Create desktop shortcuts for service management"""
    try:
        import winshell
        from win32com.client import Dispatch
        
        desktop = winshell.desktop()
        
        # Create service management shortcuts
        shortcuts = [
            ('Start ITSM Agent', 'start'),
            ('Stop ITSM Agent', 'stop'),
            ('Restart ITSM Agent', 'restart')
        ]
        
        for shortcut_name, command in shortcuts:
            shortcut_path = os.path.join(desktop, f"{shortcut_name}.lnk")
            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(shortcut_path)
            shortcut.Targetpath = sys.executable
            shortcut.Arguments = f'"{install_dir}\\itsm_agent.py" {command}'
            shortcut.WorkingDirectory = str(install_dir)
            shortcut.save()
            
        print("✓ Desktop shortcuts created")
        return True
        
    except ImportError:
        print("Note: winshell not available, skipping shortcut creation")
        return True
    except Exception as e:
        print(f"Warning: Could not create shortcuts: {e}")
        return True


def main():
    """Main installation function"""
    print("ITSM Agent Windows Installation")
    print("==============================")
    print()
    
    # Check administrator privileges
    if not check_admin_privileges():
        print("Error: This script must be run as Administrator")
        print("Right-click on Command Prompt and select 'Run as Administrator'")
        input("Press Enter to exit...")
        return 1
    
    # Check Python version
    if sys.version_info < (3, 6):
        print("Error: Python 3.6 or higher is required")
        input("Press Enter to exit...")
        return 1
    
    print(f"Python version: {sys.version}")
    print()
    
    # Install dependencies
    if not install_dependencies():
        print("Error: Failed to install dependencies")
        input("Press Enter to exit...")
        return 1
    
    print()
    
    # Create installation directory
    install_dir = create_installation_directory()
    if not install_dir:
        print("Error: Failed to create installation directory")
        input("Press Enter to exit...")
        return 1
    
    print()
    
    # Install Windows service
    if not install_windows_service(install_dir):
        print("Error: Failed to install Windows service")
        input("Press Enter to exit...")
        return 1
    
    print()
    
    # Create shortcuts
    create_shortcuts(install_dir)
    
    print()
    print("Installation completed successfully!")
    print()
    print("Configuration:")
    print(f"- Edit {install_dir}\\config.ini to configure API endpoint and authentication")
    print("- Set ITSM_API_URL and ITSM_AUTH_TOKEN environment variables (optional)")
    print()
    print("Service management:")
    print("- Start service:   sc start ITSMAgent")
    print("- Stop service:    sc stop ITSMAgent")
    print("- Service status:  sc query ITSMAgent")
    print("- View logs:       Check Event Viewer > Windows Logs > Application")
    print()
    print("The service is installed but not started. To start it now:")
    start_now = input("Start the service now? (y/n): ").lower().strip()
    
    if start_now in ['y', 'yes']:
        try:
            subprocess.run(['sc', 'start', 'ITSMAgent'], check=True)
            print("✓ Service started successfully")
        except subprocess.CalledProcessError:
            print("✗ Failed to start service")
    
    input("Press Enter to exit...")
    return 0


if __name__ == '__main__':
    sys.exit(main())
