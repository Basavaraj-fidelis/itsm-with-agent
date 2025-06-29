
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


def install_system_dependencies():
    """Install system-level dependencies"""
    print("Installing system dependencies...")
    
    try:
        # Update package lists
        subprocess.run(['apt', 'update'], check=True, capture_output=True)
        
        # Install required system packages
        packages = [
            'python3-pip',
            'python3-dev',
            'build-essential',
            'gcc'
        ]
        
        for package in packages:
            try:
                subprocess.run(['apt', 'install', '-y', package], check=True, capture_output=True)
                print(f"✓ Installed {package}")
            except subprocess.CalledProcessError:
                print(f"⚠ Warning: Could not install {package}")
                
    except subprocess.CalledProcessError as e:
        print(f"Warning: System package installation issues: {e}")
        print("Continuing with Python package installation...")


def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")

    packages = [
        'psutil',
        'requests',
        'configparser'
    ]

    success_count = 0
    
    for package in packages:
        # Try multiple installation methods
        methods = [
            [sys.executable, '-m', 'pip', 'install', package],
            [sys.executable, '-m', 'pip', 'install', '--user', package],
            ['pip3', 'install', package],
            ['pip3', 'install', '--user', package],
            ['python3', '-m', 'pip', 'install', package],
            ['apt', 'install', '-y', f'python3-{package.lower()}']
        ]
        
        installed = False
        for method in methods:
            try:
                subprocess.run(method, check=True, capture_output=True)
                print(f"✓ Installed {package}")
                success_count += 1
                installed = True
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if not installed:
            print(f"⚠ Warning: Could not install {package} using any method")
            # Try to continue anyway
    
    # Check if at least some packages were installed
    if success_count == 0:
        print("Error: Could not install any Python packages")
        print("Please try manually:")
        print("  sudo apt update")
        print("  sudo apt install python3-pip python3-dev build-essential")
        print("  pip3 install psutil requests configparser")
        return False
    elif success_count < len(packages):
        print(f"Warning: Only {success_count}/{len(packages)} packages installed successfully")
        print("The agent may still work with reduced functionality")
    
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
    copied_files = 0
    for file_name in files_to_copy:
        src_file = script_dir / file_name
        dst_file = install_dir / file_name

        if src_file.exists():
            shutil.copy2(src_file, dst_file)
            os.chmod(dst_file, 0o755)
            print(f"✓ Copied {file_name}")
            copied_files += 1
        else:
            print(f"⚠ Warning: Source file not found: {file_name}")

    if copied_files == 0:
        print("Error: No files were copied")
        return None
    
    print(f"Successfully copied {copied_files}/{len(files_to_copy)} files")
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
Environment=PYTHONUNBUFFERED=1

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


def test_agent_imports(install_dir):
    """Test if the agent can import required modules"""
    print("Testing agent imports...")
    
    try:
        # Change to install directory and test imports
        original_dir = os.getcwd()
        os.chdir(install_dir)
        
        test_script = f"""
import sys
sys.path.insert(0, '{install_dir}')

try:
    import psutil
    print('[OK] psutil imported')
except ImportError as e:
    print('[ERROR] psutil import failed:', e)

try:
    import requests
    print('[OK] requests imported')
except ImportError as e:
    print('[ERROR] requests import failed:', e)

try:
    import system_collector
    print('[OK] system_collector imported')
except ImportError as e:
    print('[ERROR] system_collector import failed:', e)

print('[OK] Import test completed')
"""
        
        result = subprocess.run([
            sys.executable, '-c', test_script
        ], capture_output=True, text=True, cwd=install_dir)
        
        os.chdir(original_dir)
        
        print("Import test results:")
        print(result.stdout)
        if result.stderr:
            print("Errors:")
            print(result.stderr)
            
        return result.returncode == 0
        
    except Exception as e:
        print(f"Could not test imports: {e}")
        if 'original_dir' in locals():
            os.chdir(original_dir)
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

    # Install system dependencies first
    install_system_dependencies()
    print()

    # Install Python dependencies
    if not install_dependencies():
        print("Warning: Some dependencies failed to install")
        choice = input("Continue anyway? (y/n): ").lower().strip()
        if choice not in ['y', 'yes']:
            print("Installation aborted")
            return 1

    print()

    # Create installation directory
    install_dir = create_installation_directory()
    if not install_dir:
        print("Error: Failed to create installation directory")
        return 1

    print()

    # Test imports
    if not test_agent_imports(install_dir):
        print("Warning: Import test failed")
        choice = input("Continue with service installation anyway? (y/n): ").lower().strip()
        if choice not in ['y', 'yes']:
            print("Installation aborted")
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
            print("Check logs with: sudo journalctl -u itsm-agent")

    return 0


if __name__ == '__main__':
    sys.exit(main())
