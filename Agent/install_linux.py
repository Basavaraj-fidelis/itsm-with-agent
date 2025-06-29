#!/usr/bin/env python3
"""
ITSM Agent Linux Installation Script
Installs the ITSM agent as a systemd service
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path


def check_root_privileges():
    """Check if running with root privileges"""
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


def create_systemd_service(install_dir):
    """Create systemd service file"""
    service_content = f"""[Unit]
Description=ITSM Endpoint Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={install_dir}
ExecStart={sys.executable} {install_dir}/itsm_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""

    service_file = Path("/etc/systemd/system/itsm-agent.service")

    try:
        with open(service_file, 'w') as f:
            f.write(service_content)

        print("✓ Created systemd service file")

        # Reload systemd and enable service
        subprocess.run(['systemctl', 'daemon-reload'], check=True)
        subprocess.run(['systemctl', 'enable', 'itsm-agent'], check=True)

        print("✓ Service enabled for auto-start")
        return True

    except Exception as e:
        print(f"✗ Failed to create service: {e}")
        return False


def main():
    """Main installation function"""
    print("ITSM Agent Linux Installation")
    print("=============================")
    print()

    # Check root privileges
    if not check_root_privileges():
        print("Error: This script must be run as root")
        print("Use: sudo python3 install_linux.py")
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

    # Create systemd service
    if not create_systemd_service(install_dir):
        print("Error: Failed to create systemd service")
        return 1

    print()
    print("Installation completed successfully!")
    print()
    print("Configuration:")
    print(f"- Edit {install_dir}/config.ini to configure API endpoint and authentication")
    print()
    print("Service management:")
    print("- Start service:   sudo systemctl start itsm-agent")
    print("- Stop service:    sudo systemctl stop itsm-agent")
    print("- Service status:  sudo systemctl status itsm-agent")
    print("- View logs:       sudo journalctl -u itsm-agent -f")
    print()

    start_now = input("Start the service now? (y/n): ").lower().strip()

    if start_now in ['y', 'yes']:
        try:
            subprocess.run(['systemctl', 'start', 'itsm-agent'], check=True)
            print("✓ Service started successfully")
        except subprocess.CalledProcessError:
            print("✗ Failed to start service")

    return 0


if __name__ == '__main__':
    sys.exit(main())