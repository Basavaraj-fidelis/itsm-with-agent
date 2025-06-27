#!/usr/bin/env python3
"""
Fix Windows Service Issues
This script helps diagnose and fix common Windows service issues
"""

import sys
import os
import subprocess
import time
from pathlib import Path


def check_admin():
    """Check if running as administrator"""
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def check_python_path():
    """Check Python installation and paths"""
    print("Python executable:", sys.executable)
    print("Python version:", sys.version)
    print("Python path:", sys.path)

    # Check if required modules are available
    try:
        import psutil
        print("[OK] psutil available")
    except ImportError:
        print("[ERROR] psutil not available")
        return False

    try:
        import requests
        print("[OK] requests available")
    except ImportError:
        print("[ERROR] requests not available")
        return False

    try:
        import winreg
        print("[OK] winreg available")
    except ImportError:
        print("[ERROR] winreg not available")
        return False

    return True


def stop_and_delete_service():
    """Stop and delete existing service"""
    print("Stopping existing service...")
    subprocess.run(['sc', 'stop', 'ITSMAgent'], capture_output=True)

    print("Deleting existing service...")
    result = subprocess.run(['sc', 'delete', 'ITSMAgent'],
                            capture_output=True,
                            text=True)

    # Wait for service to be fully deleted
    time.sleep(2)
    return True


def create_service_with_batch():
    """Create service using batch file wrapper"""
    try:
        install_dir = Path(r"C:\Program Files\ITSM Agent")
        install_dir.mkdir(parents=True, exist_ok=True)

        # Create batch file
        batch_file = install_dir / "run_agent.bat"
        batch_content = f'''@echo off
cd /d "{install_dir}"
"{sys.executable}" itsm_agent.py
pause
'''

        with open(batch_file, 'w') as f:
            f.write(batch_content)

        print(f"Created batch wrapper: {batch_file}")

        # Create service using sc command
        service_cmd = f'"{batch_file}"'

        result = subprocess.run(
            [
                'sc',
                'create',
                'ITSMAgent',
                'binPath=',
                service_cmd,
                'start=',
                'demand',  # Manual start first
                'DisplayName=',
                'ITSM Endpoint Agent'
            ],
            capture_output=True,
            text=True)

        if result.returncode == 0:
            print("[OK] Service created successfully")
            return True
        else:
            print(f"[ERROR] Service creation failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"Error creating batch service: {e}")
        return False


def create_service_with_python_service():
    """Create service using Python Service approach with proper Windows integration"""
    try:
        install_dir = r"C:\Program Files\ITSM Agent"

        # Delete existing service first
        subprocess.run(['sc', 'delete', 'ITSMAgent'], capture_output=True)
        time.sleep(3)

        # Create a Python service wrapper
        service_script = Path(install_dir) / "windows_service.py"
        service_content = f'''
import sys
import os
import time
import threading
import servicemanager
import win32event
import win32service
import win32serviceutil

# Add install directory to Python path
install_dir = r"{install_dir}"
sys.path.insert(0, install_dir)
os.chdir(install_dir)

class ITSMWindowsService(win32serviceutil.ServiceFramework):
    _svc_name_ = "ITSMAgent"
    _svc_display_name_ = "ITSM Endpoint Agent"
    _svc_description_ = "ITSM Endpoint Agent - Collects and reports system information"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.agent = None
        self.agent_thread = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                            servicemanager.PYS_SERVICE_STOPPED,
                            (self._svc_name_, ''))
        
        # Stop the agent gracefully
        if self.agent:
            try:
                self.agent.stop()
                # Wait for agent thread to finish
                if self.agent_thread and self.agent_thread.is_alive():
                    self.agent_thread.join(timeout=10)
            except Exception as e:
                servicemanager.LogErrorMsg(f"Error stopping agent: {{e}}")
        
        win32event.SetEvent(self.hWaitStop)

    def SvcDoRun(self):
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                            servicemanager.PYS_SERVICE_STARTED,
                            (self._svc_name_, ''))
        try:
            # Import and create agent instance
            from itsm_agent import ITSMAgent
            self.agent = ITSMAgent()
            
            # Run agent in separate thread to avoid blocking service manager
            def run_agent():
                try:
                    self.agent.start()
                except Exception as e:
                    servicemanager.LogErrorMsg(f"Agent runtime error: {{e}}")
            
            self.agent_thread = threading.Thread(target=run_agent, daemon=True)
            self.agent_thread.start()
            
            # Wait for stop signal
            win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)
            
        except Exception as e:
            servicemanager.LogErrorMsg(f"Service startup error: {{e}}")
            raise

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(ITSMWindowsService)
'''

        with open(service_script, 'w') as f:
            f.write(service_content)

        print(f"Created Python service wrapper: {service_script}")

        # Install the service using the Python wrapper
        original_dir = os.getcwd()
        os.chdir(install_dir)

        try:
            result = subprocess.run(
                [sys.executable, "windows_service.py", "install"],
                capture_output=True,
                text=True,
                timeout=30)

            os.chdir(original_dir)

            if result.returncode == 0:
                print("[OK] Python service wrapper installed successfully")

                # Enable and configure service - CRITICAL FIX
                print("Enabling service...")
                enable_result = subprocess.run(
                    ['sc', 'config', 'ITSMAgent', 'start=', 'demand'],
                    capture_output=True,
                    text=True)
                
                if enable_result.returncode == 0:
                    print("[OK] Service enabled successfully")
                else:
                    print(f"[WARNING] Service enable failed: {enable_result.stderr}")

                return True
            else:
                print(
                    f"[ERROR] Python service installation failed: {result.stderr}"
                )
                return False

        except subprocess.TimeoutExpired:
            print("[ERROR] Service installation timed out")
            os.chdir(original_dir)
            return False

    except Exception as e:
        print(f"Error creating Python service: {e}")
        return False


def create_service_alternative():
    """Create service with alternative configuration for better Windows compatibility"""
    try:
        install_dir = r"C:\Program Files\ITSM Agent"

        # Delete existing service first
        subprocess.run(['sc', 'delete', 'ITSMAgent'], capture_output=True)
        time.sleep(3)

        # Create a robust service launcher batch file that handles path issues
        batch_launcher = Path(install_dir) / "service_launcher.bat"
        batch_content = f'''@echo off
cd /d "{install_dir}"
set PYTHONPATH={install_dir}
set PYTHONUNBUFFERED=1

"{sys.executable}" -u itsm_agent.py >> logs\\service.log 2>&1
'''

        with open(batch_launcher, 'w') as f:
            f.write(batch_content)

        print(f"Created batch service launcher: {batch_launcher}")

        # Create service using batch launcher with proper error handling
        service_cmd = str(batch_launcher)

        result = subprocess.run([
            'sc', 'create', 'ITSMAgent',
            'binPath=', service_cmd,
            'start=', 'demand',
            'DisplayName=', 'ITSM Endpoint Agent',
            'obj=', 'LocalSystem',
            'type=', 'own'
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print("[OK] Alternative service created successfully")

            # Set service description
            subprocess.run([
                'sc', 'description', 'ITSMAgent',
                'ITSM Endpoint Agent - Collects and reports system information'
            ], capture_output=True)

            # Configure service failure actions
            subprocess.run([
                'sc', 'failure', 'ITSMAgent',
                'reset=', '0',
                'actions=', 'restart/30000/restart/60000/restart/120000'
            ], capture_output=True)

            return True
        else:
            print(f"[ERROR] Alternative service creation failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"Error creating alternative service: {e}")
        return False


def create_service_with_cmd_wrapper():
    """Create service using cmd wrapper to avoid Python execution issues"""
    try:
        install_dir = r"C:\Program Files\ITSM Agent"

        # Delete existing service first
        subprocess.run(['sc', 'delete', 'ITSMAgent'], capture_output=True)
        time.sleep(3)

        # Create a CMD wrapper that properly handles paths and environment
        cmd_wrapper = Path(install_dir) / "run_service.cmd"
        cmd_content = f'''@echo off
REM ITSM Agent Service Wrapper
REM This wrapper ensures proper environment setup for Windows service

REM Change to install directory
cd /d "{install_dir}"

REM Set Python path and environment
set PYTHONPATH={install_dir}
set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Run the agent with proper logging
echo Starting ITSM Agent at %date% %time% >> logs\\service.log
"{sys.executable}" -u itsm_agent.py 2>&1 | findstr /v "^$" >> logs\\service.log

REM Log any exit
echo ITSM Agent stopped at %date% %time% with exit code %ERRORLEVEL% >> logs\\service.log
'''

        with open(cmd_wrapper, 'w') as f:
            f.write(cmd_content)

        print(f"Created CMD service wrapper: {cmd_wrapper}")

        # Create service using CMD wrapper
        result = subprocess.run([
            'sc', 'create', 'ITSMAgent',
            'binPath=', str(cmd_wrapper),
            'start=', 'demand',
            'DisplayName=', 'ITSM Endpoint Agent',
            'obj=', 'LocalSystem'
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print("[OK] CMD wrapper service created successfully")

            # Set service description
            subprocess.run([
                'sc', 'description', 'ITSMAgent',
                'ITSM Endpoint Agent - Collects and reports system information'
            ], capture_output=True)

            return True
        else:
            print(f"[ERROR] CMD wrapper service creation failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"Error creating CMD wrapper service: {e}")
        return False


def create_service_direct():
    """Create service directly using pywin32 service wrapper"""
    try:
        install_dir = r"C:\Program Files\ITSM Agent"
        python_exe = sys.executable
        script_path = os.path.join(install_dir, "itsm_agent.py")

        print(f"Attempting to install service using pywin32...")
        print(f"Script path: {script_path}")

        # Change to install directory and try to install service using the built-in service wrapper
        original_dir = os.getcwd()
        os.chdir(install_dir)

        try:
            # Try using the service wrapper's install functionality
            result = subprocess.run([python_exe, script_path, 'install'],
                                    capture_output=True,
                                    text=True,
                                    timeout=30)

            if result.returncode == 0:
                print("[OK] Service installed using pywin32 service wrapper")

                # Configure service to start manually first
                subprocess.run(
                    ['sc', 'config', 'ITSMAgent', 'start=', 'demand'],
                    capture_output=True)

                os.chdir(original_dir)
                return True
            else:
                print(
                    f"[INFO] Service wrapper install failed, trying fallback method"
                )
                print(f"Output: {result.stdout}")
                print(f"Error: {result.stderr}")

        except subprocess.TimeoutExpired:
            print("[INFO] Service install timed out, trying fallback method")

        # Fallback to sc command method with better path handling
        service_cmd = f'"{python_exe}" "{script_path}"'

        print(f"Creating service with command: {service_cmd}")

        result = subprocess.run([
            'sc', 'create', 'ITSMAgent', 'binPath=', service_cmd, 'start=',
            'demand', 'DisplayName=', 'ITSM Endpoint Agent', 'type=', 'own'
        ],
                                capture_output=True,
                                text=True)

        os.chdir(original_dir)

        if result.returncode == 0:
            print("[OK] Service created successfully using fallback method")
            return True
        else:
            print(f"[ERROR] Service creation failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"Error creating direct service: {e}")
        if 'original_dir' in locals():
            os.chdir(original_dir)
        return False


def test_script_manually():
    """Test if the script runs manually"""
    try:
        print("Testing script execution...")
        install_dir = r"C:\Program Files\ITSM Agent"

        # Change to install directory
        original_dir = os.getcwd()
        os.chdir(install_dir)

        # First test basic imports
        print("Testing imports...")
        test_imports = '''
import sys
import os
sys.path.insert(0, os.getcwd())

try:
    import system_collector
    print("[OK] system_collector import successful")

    import api_client
    print("[OK] api_client import successful")

    import service_wrapper
    print("[OK] service_wrapper import successful")

    # Test basic functionality
    from system_collector import SystemCollector
    collector = SystemCollector()
    hostname = collector._get_hostname()
    print(f"[OK] Basic functionality works - hostname: {hostname}")

except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Runtime error: {e}")
    sys.exit(1)

print("[OK] All tests passed")
'''

        # Run the test with shorter timeout
        result = subprocess.run([sys.executable, '-c', test_imports],
                                capture_output=True,
                                text=True,
                                timeout=15,
                                cwd=install_dir)

        # Restore original directory
        os.chdir(original_dir)

        if result.returncode == 0:
            print(result.stdout)
            print("[OK] Script validation successful")
            return True
        else:
            print(f"[ERROR] Script validation failed:")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)

            # Try to provide more specific error information
            if "ModuleNotFoundError" in result.stderr:
                print("\nThis appears to be a module import issue.")
                print("The required Python packages might not be installed.")
            elif "Permission" in result.stderr:
                print("\nThis appears to be a permission issue.")
                print("Make sure you're running as Administrator.")

            return False

    except subprocess.TimeoutExpired:
        print("[ERROR] Script validation timed out (15 seconds)")
        print("This might indicate the script is hanging or taking too long.")
        os.chdir(original_dir)
        return False
    except Exception as e:
        print(f"Error testing script: {e}")
        os.chdir(original_dir)
        return False


def copy_files_to_install_dir():
    """Copy necessary files to install directory"""
    try:
        install_dir = Path(r"C:\Program Files\ITSM Agent")
        install_dir.mkdir(parents=True, exist_ok=True)

        # Files to copy
        files_to_copy = [
            'itsm_agent.py', 'system_collector.py', 'api_client.py',
            'service_wrapper.py', 'config.ini'
        ]

        current_dir = Path.cwd()

        for file_name in files_to_copy:
            src_file = current_dir / file_name
            dst_file = install_dir / file_name

            if src_file.exists():
                import shutil
                shutil.copy2(src_file, dst_file)
                print(f"[OK] Copied {file_name}")
            else:
                print(f"[ERROR] Missing {file_name}")

        # Create logs directory
        logs_dir = install_dir / "logs"
        logs_dir.mkdir(exist_ok=True)

        return True

    except Exception as e:
        print(f"Error copying files: {e}")
        return False


def main():
    print("ITSM Agent Windows Service Fix Tool")
    print("=" * 50)

    # Check if running as admin
    if not check_admin():
        print("Error: This script must be run as Administrator")
        print(
            "Right-click on Command Prompt and select 'Run as Administrator'")
        input("Press Enter to exit...")
        return

    # Check Python environment
    print("\n1. Checking Python environment...")
    if not check_python_path():
        print("Error: Python environment issues detected")

        # Try to install missing packages
        print("\nAttempting to install missing packages...")
        packages = ['psutil', 'requests', 'pywin32']
        for package in packages:
            try:
                subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', package],
                    check=True,
                    capture_output=True)
                print(f"[OK] Installed {package}")

                # Special handling for pywin32
                if package == 'pywin32':
                    try:
                        print("Configuring pywin32...")
                        subprocess.run([
                            sys.executable, '-m', 'pywin32_postinstall',
                            '-install'
                        ],
                                       check=True,
                                       capture_output=True)
                        print("[OK] pywin32 configured")
                    except subprocess.CalledProcessError:
                        print(
                            "[WARNING] pywin32 post-install failed, service may not work properly"
                        )

            except subprocess.CalledProcessError:
                print(f"[ERROR] Failed to install {package}")

        # Re-check after installation attempt
        if not check_python_path():
            print("Error: Still missing required packages")
            input("Press Enter to exit...")
            return

    # Copy files to install directory
    print("\n2. Copying files to install directory...")
    if not copy_files_to_install_dir():
        print("Error: Failed to copy files")
        input("Press Enter to exit...")
        return

    # Test script manually
    print("\n3. Testing script execution...")
    if not test_script_manually():
        print("Warning: Script validation failed")
        choice = input("Continue anyway? (y/n): ").lower().strip()
        if choice not in ['y', 'yes']:
            print("Exiting...")
            input("Press Enter to exit...")
            return
        print("Continuing despite validation failure...")

    # Stop and delete existing service
    print("\n4. Removing existing service...")
    stop_and_delete_service()

    # Try to create service with multiple methods
    print("\n5. Creating new service...")
    service_success = False

    # Method 1: Try Python service wrapper (best for Windows services)
    print("5a. Trying Python service wrapper...")
    service_success = create_service_with_python_service()

    if not service_success:
        print("5b. Python service failed, trying direct method...")
        service_success = create_service_direct()

    if not service_success:
        print("5c. Direct method failed, trying batch wrapper...")
        service_success = create_service_with_batch()

    if not service_success:
        print("5d. Batch method failed, trying CMD wrapper...")
        service_success = create_service_alternative()

    if service_success:
        # Ensure service is enabled before starting
        print("\n6. Ensuring service is enabled...")
        enable_result = subprocess.run(['sc', 'config', 'ITSMAgent', 'start=', 'demand'],
                                       capture_output=True,
                                       text=True)
        
        if enable_result.returncode == 0:
            print("[OK] Service enabled successfully")
        else:
            print(f"[WARNING] Service enable failed: {enable_result.stderr}")
            
        print("\n7. Testing service start...")
        result = subprocess.run(['sc', 'start', 'ITSMAgent'],
                                capture_output=True,
                                text=True)

        if result.returncode == 0:
            print("[OK] Service started successfully!")

            # Check status
            time.sleep(5)
            result = subprocess.run(['sc', 'query', 'ITSMAgent'],
                                    capture_output=True,
                                    text=True)
            print("\nService Status:")
            print(result.stdout)
        else:
            print(f"[ERROR] Failed to start service: {result.stderr}")
            print(f"[ERROR] Service start output: {result.stdout}")

            # Get Windows Event Log errors related to the service
            print("\nChecking Windows Event Log for service errors...")
            try:
                # Look for recent service-related errors
                eventlog_result = subprocess.run([
                    'wevtutil', 'qe', 'System', '/f:text', '/c:5', '/rd:true',
                    '/q:*[System[Provider[@Name="Service Control Manager"] and (EventID=7000 or EventID=7001 or EventID=7023 or EventID=7034)]]'
                ],
                                                 capture_output=True,
                                                 text=True,
                                                 timeout=10)

                if eventlog_result.stdout:
                    print("Recent Service Control Manager errors:")
                    print(eventlog_result.stdout)

                    # Check specifically for our service
                    if "ITSMAgent" in eventlog_result.stdout or "ITSM" in eventlog_result.stdout:
                        print(
                            "\n[DETECTED] Service-specific errors found in Event Log"
                        )
                        if "error code 1" in eventlog_result.stdout.lower():
                            print(
                                "Error code 1 indicates Python script execution issues"
                            )
                        if "access is denied" in eventlog_result.stdout.lower(
                        ):
                            print("Access denied suggests permission issues")
                else:
                    print("No recent service errors found in Event Log")

            except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
                print("Could not access Event Log")

            # Additional debugging - check if Python script runs manually
            print("\nTesting Python script execution manually...")
            try:
                test_result = subprocess.run(
                    [
                        sys.executable,
                        r"C:\Program Files\ITSM Agent\itsm_agent.py", "--test"
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=r"C:\Program Files\ITSM Agent")

                if test_result.returncode == 0:
                    print("[OK] Python script runs manually")
                else:
                    print(
                        f"[ERROR] Python script fails manually: {test_result.stderr}"
                    )

            except (subprocess.TimeoutExpired, subprocess.CalledProcessError,
                    FileNotFoundError):
                print("[WARNING] Could not test manual execution")

            # Try to get more detailed error information
            print("\nChecking service configuration...")
            config_result = subprocess.run(['sc', 'qc', 'ITSMAgent'],
                                           capture_output=True,
                                           text=True)
            print(config_result.stdout)

            print("\nTrying to start service with verbose output...")
            net_result = subprocess.run(['net', 'start', 'ITSMAgent'],
                                        capture_output=True,
                                        text=True)
            print(f"Net start output: {net_result.stdout}")
            print(f"Net start error: {net_result.stderr}")

            # Check for specific error codes and signal issues
            if "536870913" in result.stderr or "536870913" in result.stdout:
                print("\n[DETECTED] Error code 536870913 - Python execution error")
                print("This indicates the service cannot execute Python properly")
            
            # Check Event Log for signal handling errors
            if "signal only works in main thread" in eventlog_result.stdout.lower():
                print("\n[DETECTED] Signal handling error in Windows service")
                print("The agent is trying to set signal handlers in a service context")
                print("This has been fixed in the updated agent code")
                
                print("\n8a. Trying CMD wrapper approach...")
                if create_service_with_cmd_wrapper():
                    print("CMD wrapper service configuration successful!")
                    
                    # Try starting the CMD wrapper service
                    cmd_result = subprocess.run(['sc', 'start', 'ITSMAgent'],
                                               capture_output=True,
                                               text=True)
                    if cmd_result.returncode == 0:
                        print("[OK] CMD wrapper service started successfully!")
                    else:
                        print(f"[ERROR] CMD wrapper service failed: {cmd_result.stderr}")
                        
                        # Try final alternative
                        print("\n8b. Trying batch launcher approach...")
                        if create_service_alternative():
                            print("Batch launcher service configuration successful!")
                            
                            batch_result = subprocess.run(['sc', 'start', 'ITSMAgent'],
                                                         capture_output=True,
                                                         text=True)
                            if batch_result.returncode == 0:
                                print("[OK] Batch launcher service started successfully!")
                            else:
                                print(f"[ERROR] All service methods failed: {batch_result.stderr}")
            else:
                # Try creating a service with different configuration
                print("\n8. Trying alternative service configuration...")
                if create_service_alternative():
                    print("Alternative service configuration successful!")

                    # Try starting the alternative service
                    alt_result = subprocess.run(['sc', 'start', 'ITSMAgent'],
                                                capture_output=True,
                                                text=True)
                    if alt_result.returncode == 0:
                        print("[OK] Alternative service started successfully!")
                    else:
                        print(
                            f"[ERROR] Alternative service also failed to start: {alt_result.stderr}"
                        )

            print("\nTroubleshooting options:")
            print("1. Check if Python is properly installed and accessible")
            print("2. Verify all required Python packages are installed")
            print("3. Run manually to test:")
            print(f'   cd "C:\\Program Files\\ITSM Agent"')
            print(f'   "{sys.executable}" itsm_agent.py')
            print("4. Check Windows Event Viewer for detailed error messages")
            print("5. Try running as administrator manually first")
    else:
        print("\nService creation failed. You can run the agent manually:")
        print(f'cd "C:\\Program Files\\ITSM Agent"')
        print(f'"{sys.executable}" itsm_agent.py')

    print("\nDone!")
    input("Press Enter to exit...")


if __name__ == '__main__':
    main()