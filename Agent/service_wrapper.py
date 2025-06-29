
#!/usr/bin/env python3
"""
Service Wrapper for ITSM Agent
Cross-platform service management
"""

import os
import sys
import platform
import logging
import subprocess
from pathlib import Path


class ServiceWrapper:
    """Base service wrapper class"""

    def __init__(self, service_name, service_display_name):
        self.service_name = service_name
        self.service_display_name = service_display_name
        self.logger = logging.getLogger('ServiceWrapper')

    @staticmethod
    def is_running_as_service():
        """Check if currently running as a service"""
        if platform.system().lower() == 'windows':
            try:
                # On Windows, check if we have a console window
                try:
                    import win32console
                    win32console.GetConsoleWindow()
                    return False  # Has console, likely interactive
                except:
                    return True   # No console, likely service
            except ImportError:
                # Fallback: check stdout
                return not (sys.stdout and sys.stdout.isatty())
        else:
            # On Unix-like systems, check if we have a TTY
            return not (sys.stdout and sys.stdout.isatty())

    def install(self):
        """Install the service"""
        system = platform.system().lower()
        if system == 'windows':
            return self._install_windows_service()
        elif system == 'linux':
            return self._install_linux_service()
        else:
            print(f"Service installation not supported on {system}")
            return False

    def remove(self):
        """Remove the service"""
        system = platform.system().lower()
        if system == 'windows':
            return self._remove_windows_service()
        elif system == 'linux':
            return self._remove_linux_service()
        else:
            print(f"Service removal not supported on {system}")
            return False

    def start(self):
        """Start the service"""
        system = platform.system().lower()
        if system == 'windows':
            return self._start_windows_service()
        elif system == 'linux':
            return self._start_linux_service()
        else:
            print(f"Service start not supported on {system}")
            return False

    def stop(self):
        """Stop the service"""
        system = platform.system().lower()
        if system == 'windows':
            return self._stop_windows_service()
        elif system == 'linux':
            return self._stop_linux_service()
        else:
            print(f"Service stop not supported on {system}")
            return False

    def restart(self):
        """Restart the service"""
        self.stop()
        return self.start()

    def run(self):
        """Run as a service (called by service manager)"""
        if platform.system().lower() == 'windows':
            self._run_windows_service()
        else:
            # For Linux, just call start_service directly
            if hasattr(self, 'start_service'):
                self.start_service()

    # Windows service methods
    def _install_windows_service(self):
        """Install Windows service using pywin32"""
        try:
            import win32serviceutil
            import win32service
            import win32event
            import servicemanager

            # Create a dynamic service class
            service_wrapper = self

            class WindowsService(win32serviceutil.ServiceFramework):
                _svc_name_ = service_wrapper.service_name
                _svc_display_name_ = service_wrapper.service_display_name
                _svc_description_ = 'ITSM Endpoint Agent - Collects and reports system information'

                def __init__(self, args):
                    win32serviceutil.ServiceFramework.__init__(self, args)
                    self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
                    self.service_wrapper = None

                def SvcStop(self):
                    self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
                    win32event.SetEvent(self.hWaitStop)
                    if self.service_wrapper and hasattr(self.service_wrapper, 'stop_service'):
                        self.service_wrapper.stop_service()

                def SvcDoRun(self):
                    servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                                        servicemanager.PYS_SERVICE_STARTED,
                                        (self._svc_name_, ''))
                    try:
                        # Import here to avoid circular imports
                        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
                        from itsm_agent import ITSMService
                        self.service_wrapper = ITSMService()
                        if hasattr(self.service_wrapper, 'start_service'):
                            self.service_wrapper.start_service()
                        
                        # Wait for stop signal
                        win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)
                    except Exception as e:
                        servicemanager.LogErrorMsg(f"Service error: {e}")

            # Install the service
            win32serviceutil.InstallService(
                WindowsService._svc_reg_class_,
                WindowsService._svc_name_,
                WindowsService._svc_display_name_,
                description=WindowsService._svc_description_
            )
            
            print(f"Windows service '{self.service_name}' installed successfully")
            return True

        except ImportError:
            print("Error: pywin32 is required for Windows service functionality")
            print("Install with: pip install pywin32")
            return False
        except Exception as e:
            print(f"Error installing Windows service: {e}")
            return False

    def _remove_windows_service(self):
        """Remove Windows service"""
        try:
            result = subprocess.run([
                'sc', 'delete', self.service_name
            ], capture_output=True, text=True)

            if result.returncode == 0:
                print(f"Windows service '{self.service_name}' removed successfully")
                return True
            else:
                print(f"Error removing Windows service: {result.stderr}")
                return False

        except Exception as e:
            print(f"Error removing Windows service: {e}")
            return False

    def _start_windows_service(self):
        """Start Windows service"""
        try:
            result = subprocess.run([
                'sc', 'start', self.service_name
            ], capture_output=True, text=True)

            if result.returncode == 0:
                print(f"Windows service '{self.service_name}' started successfully")
                return True
            else:
                print(f"Error starting Windows service: {result.stderr}")
                return False

        except Exception as e:
            print(f"Error starting Windows service: {e}")
            return False

    def _stop_windows_service(self):
        """Stop Windows service"""
        try:
            result = subprocess.run([
                'sc', 'stop', self.service_name
            ], capture_output=True, text=True)

            if result.returncode == 0:
                print(f"Windows service '{self.service_name}' stopped successfully")
                return True
            else:
                print(f"Error stopping Windows service: {result.stderr}")
                return False

        except Exception as e:
            print(f"Error stopping Windows service: {e}")
            return False

    def _run_windows_service(self):
        """Run Windows service"""
        try:
            import win32serviceutil

            # Use the service name to handle command line
            sys.argv = [sys.argv[0]]  # Reset argv to avoid conflicts
            win32serviceutil.HandleCommandLine(self._get_windows_service_class())

        except ImportError:
            print("Error: pywin32 is required for Windows service functionality")
        except Exception as e:
            print(f"Error running Windows service: {e}")

    def _get_windows_service_class(self):
        """Get the Windows service class"""
        import win32serviceutil
        import win32service
        import win32event
        import servicemanager

        service_wrapper = self

        class WindowsService(win32serviceutil.ServiceFramework):
            _svc_name_ = service_wrapper.service_name
            _svc_display_name_ = service_wrapper.service_display_name
            _svc_description_ = 'ITSM Endpoint Agent'

            def __init__(self, args):
                win32serviceutil.ServiceFramework.__init__(self, args)
                self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
                self.service_impl = service_wrapper

            def SvcStop(self):
                self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
                win32event.SetEvent(self.hWaitStop)
                if hasattr(self.service_impl, 'stop_service'):
                    self.service_impl.stop_service()

            def SvcDoRun(self):
                if hasattr(self.service_impl, 'start_service'):
                    self.service_impl.start_service()

        return WindowsService

    # Linux service methods
    def _install_linux_service(self):
        """Install Linux systemd service"""
        try:
            # Get current script path
            script_path = os.path.abspath(sys.argv[0])

            # Create systemd service file content
            service_content = f"""[Unit]
Description={self.service_display_name}
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory={os.path.dirname(script_path)}
ExecStart={sys.executable} {script_path}
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
"""

            service_file = f"/etc/systemd/system/{self.service_name.lower()}.service"

            # Write service file
            with open(service_file, 'w') as f:
                f.write(service_content)

            # Reload systemd and enable service
            subprocess.run(['systemctl', 'daemon-reload'], check=True)
            subprocess.run(['systemctl', 'enable', f'{self.service_name.lower()}'], check=True)

            print(f"Linux service '{self.service_name}' installed successfully")
            return True

        except Exception as e:
            print(f"Error installing Linux service: {e}")
            return False

    def _remove_linux_service(self):
        """Remove Linux systemd service"""
        try:
            service_name = f"{self.service_name.lower()}.service"

            # Stop and disable service
            subprocess.run(['systemctl', 'stop', service_name], capture_output=True)
            subprocess.run(['systemctl', 'disable', service_name], capture_output=True)

            # Remove service file
            service_file = f"/etc/systemd/system/{service_name}"
            if os.path.exists(service_file):
                os.remove(service_file)

            # Reload systemd
            subprocess.run(['systemctl', 'daemon-reload'], check=True)

            print(f"Linux service '{self.service_name}' removed successfully")
            return True

        except Exception as e:
            print(f"Error removing Linux service: {e}")
            return False

    def _start_linux_service(self):
        """Start Linux systemd service"""
        try:
            result = subprocess.run([
                'systemctl', 'start', f'{self.service_name.lower()}'
            ], capture_output=True, text=True)

            if result.returncode == 0:
                print(f"Linux service '{self.service_name}' started successfully")
                return True
            else:
                print(f"Error starting Linux service: {result.stderr}")
                return False

        except Exception as e:
            print(f"Error starting Linux service: {e}")
            return False

    def _stop_linux_service(self):
        """Stop Linux systemd service"""
        try:
            result = subprocess.run([
                'systemctl', 'stop', f'{self.service_name.lower()}'
            ], capture_output=True, text=True)

            if result.returncode == 0:
                print(f"Linux service '{self.service_name}' stopped successfully")
                return True
            else:
                print(f"Error stopping Linux service: {result.stderr}")
                return False

        except Exception as e:
            print(f"Error stopping Linux service: {e}")
            return False
