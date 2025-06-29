#!/usr/bin/env python3
"""
ITSM Agent macOS Installation Script
Installs the ITSM agent as a LaunchDaemon
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
import plistlib


def check_admin_privileges():
    """Check if running with administrator privileges"""
    return os.geteuid() == 0


def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")

    packages = [
        'psutil',
        'requests',
        'configparser'
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
    install_dir = Path("/opt/itsm-agent")

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
        'windows_collector.py',
        'linux_collector.py',
        'macos_collector.py',
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
            os.chmod(dst_file, 0o755)
            print(f"✓ Copied {file_name}")
        else:
            print(f"✗ Source file not found: {file_name}")
            return None

    return install_dir


def create_launchd_service(install_dir):
    """Create LaunchDaemon plist file"""
    plist_data = {
        'Label': 'com.itsm.agent',
        'ProgramArguments': [
            sys.executable,
            f"{install_dir}/itsm_agent.py"
        ],
        'WorkingDirectory': str(install_dir),
        'RunAtLoad': True,
        'KeepAlive': True,
        'StandardErrorPath': f"{install_dir}/logs/agent.err",
        'StandardOutPath': f"{install_dir}/logs/agent.out"
    }

    plist_file = Path("/Library/LaunchDaemons/com.itsm.agent.plist")

    try:
        with open(plist_file, 'wb') as f:
            plistlib.dump(plist_data, f)

        os.chmod(plist_file, 0o644)
        print("✓ Created LaunchDaemon plist file")

        # Load the service
        subprocess.run(['launchctl', 'load', str(plist_file)], check=True)
        print("✓ Service loaded")

        return True

    except Exception as e:
        print(f"✗ Failed to create service: {e}")
        return False


def main():
    """Main installation function"""
    print("ITSM Agent macOS Installation")
    print("=============================")
    print()

    # Check admin privileges
    if not check_admin_privileges():
        print("Error: This script must be run as root")
        print("Use: sudo python3 install_macos.py")
        return 1

    # Check Python version
    if sys.version_info < (3, 6):
        print("Error: Python 3.6 or higher is required")
        return 1

    print(f"Python version: {sys.version}")
    print()

    # Install dependencies
    if not install_dependencies():
        print("Error: Failed to install dependencies")
        return 1

    print()

    # Create installation directory
    install_dir = create_installation_directory()
    if not install_dir:
        print("Error: Failed to create installation directory")
        return 1

    print()

    # Create LaunchDaemon service
    if not create_launchd_service(install_dir):
        print("Error: Failed to create LaunchDaemon service")
        return 1

    print()
    print("Installation completed successfully!")
    print()
    print("Configuration:")
    print(f"- Edit {install_dir}/config.ini to configure API endpoint and authentication")
    print()
    print("Service management:")
    print("- Start service:   sudo launchctl start com.itsm.agent")
    print("- Stop service:    sudo launchctl stop com.itsm.agent")
    print("- Service status:  sudo launchctl list | grep itsm")
    print("- View logs:       tail -f /opt/itsm-agent/logs/agent.out")
    print()

    start_now = input("Start the service now? (y/n): ").lower().strip()

    if start_now in ['y', 'yes']:
        try:
            subprocess.run(['launchctl', 'start', 'com.itsm.agent'], check=True)
            print("✓ Service started successfully")
        except subprocess.CalledProcessError:
            print("✗ Failed to start service")

    return 0


if __name__ == '__main__':
    sys.exit(main())