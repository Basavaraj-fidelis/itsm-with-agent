"""
Service Wrapper for Cross-Platform Service Management
Handles Windows Service and Linux daemon functionality
"""

import os
import sys
import time
import platform
import logging
import subprocess
from abc import ABC, abstractmethod


class ServiceWrapper(ABC):
    """Abstract base class for service management"""
    
    def __init__(self, service_name, display_name):
        self.service_name = service_name
        self.display_name = display_name
        self.logger = logging.getLogger('ServiceWrapper')
        self.is_windows = platform.system().lower() == 'windows'
    
    @abstractmethod
    def start_service(self):
        """Start the service - must be implemented by subclass"""
        pass
    
    @abstractmethod
    def stop_service(self):
        """Stop the service - must be implemented by subclass"""
        pass
    
    def install(self):
        """Install the service"""
        if self.is_windows:
            return self._install_windows_service()
        else:
            return self._install_linux_service()
    
    def remove(self):
        """Remove the service"""
        if self.is_windows:
            return self._remove_windows_service()
        else:
            return self._remove_linux_service()
    
    def start(self):
        """Start the service using system commands"""
        if self.is_windows:
            return self._start_windows_service()
        else:
            return self._start_linux_service()
    
    def stop(self):
        """Stop the service using system commands"""
        if self.is_windows:
            return self._stop_windows_service()
        else:
            return self._stop_linux_service()
    
    def restart(self):
        """Restart the service"""
        self.stop()
        time.sleep(2)
        return self.start()
    
    def run(self):
        """Run the service (used when called by service manager)"""
        if self.is_windows:
            self._run_windows_service()
        else:
            # For Linux, just start the service normally
            self.start_service()
    
    @staticmethod
    def is_running_as_service():
        """Check if currently running as a service"""
        if platform.system().lower() == 'windows':
            # On Windows, check if running under service manager
            try:
                return hasattr(sys, 'frozen') or not (sys.stdout and sys.stdout.isatty())
            except (AttributeError, OSError):
                return True
        else:
            # On Linux, check various service indicators
            try:
                return (
                    os.environ.get('INVOCATION_ID') is not None or  # systemd
                    os.getppid() == 1 or  # init process
                    not (sys.stdout and sys.stdout.isatty())  # no TTY
                )
            except (AttributeError, OSError):
                return True
    
    def _install_windows_service(self):
        """Install Windows service"""
        try:
            import win32serviceutil
            import win32service
            import win32event
            
            # Create service class
            class WindowsService(win32serviceutil.ServiceFramework):
                _svc_name_ = self.service_name
                _svc_display_name_ = self.display_name
                _svc_description_ = 'ITSM Endpoint Agent - Collects and reports system information'
                
                def __init__(self, args):
                    win32serviceutil.ServiceFramework.__init__(self, args)
                    self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
                    self.service_wrapper = None
                
                def SvcStop(self):
                    self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
                    win32event.SetEvent(self.hWaitStop)
                    if self.service_wrapper:
                        self.service_wrapper.stop_service()
                
                def SvcDoRun(self):
                    # Import the service wrapper here to avoid circular imports
                    from itsm_agent import ITSMService
                    self.service_wrapper = ITSMService()
                    self.service_wrapper.start_service()
            
            # Install the service
            sys.argv = ['', 'install']
            win32serviceutil.HandleCommandLine(WindowsService)
            print(f"Windows service '{self.service_name}' installed successfully")
            
            # Set service to start automatically
            self._set_windows_service_startup_type()
            
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
    
    def _set_windows_service_startup_type(self):
        """Set Windows service to start automatically"""
        try:
            subprocess.run([
                'sc', 'config', self.service_name, 'start=', 'auto'
            ], check=True)
            print(f"Service '{self.service_name}' set to start automatically")
        except Exception as e:
            print(f"Warning: Could not set service startup type: {e}")
    
    def _run_windows_service(self):
        """Run as Windows service"""
        try:
            import win32serviceutil
            import win32service
            import win32event
            
            class WindowsService(win32serviceutil.ServiceFramework):
                _svc_name_ = self.service_name
                _svc_display_name_ = self.display_name
                
                def __init__(self, args):
                    win32serviceutil.ServiceFramework.__init__(self, args)
                    self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
                    self.service_impl = self
                
                def SvcStop(self):
                    self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
                    win32event.SetEvent(self.hWaitStop)
                    if hasattr(self.service_impl, 'stop_service'):
                        self.service_impl.stop_service()
                
                def SvcDoRun(self):
                    if hasattr(self.service_impl, 'start_service'):
                        self.service_impl.start_service()
            
            # Start the service
            win32serviceutil.HandleCommandLine(WindowsService)
            
        except ImportError:
            print("Error: pywin32 is required for Windows service functionality")
        except Exception as e:
            print(f"Error running Windows service: {e}")
    
    def _install_linux_service(self):
        """Install Linux systemd service"""
        try:
            # Get current script path
            script_path = os.path.abspath(sys.argv[0])
            
            # Create systemd service file content
            service_content = f"""[Unit]
Description={self.display_name}
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart={sys.executable} {script_path}
Restart=always
RestartSec=10
User=root
Group=root
WorkingDirectory={os.path.dirname(script_path)}
Environment=PYTHONPATH={os.path.dirname(script_path)}

[Install]
WantedBy=multi-user.target
"""
            
            # Write service file
            service_file_path = f'/etc/systemd/system/{self.service_name}.service'
            
            with open(service_file_path, 'w') as f:
                f.write(service_content)
            
            # Reload systemd and enable service
            subprocess.run(['systemctl', 'daemon-reload'], check=True)
            subprocess.run(['systemctl', 'enable', self.service_name], check=True)
            
            print(f"Linux systemd service '{self.service_name}' installed successfully")
            print(f"Service file created at: {service_file_path}")
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"Error running systemctl command: {e}")
            return False
        except PermissionError:
            print("Error: Root permissions required to install systemd service")
            print("Run with: sudo python itsm_agent.py install")
            return False
        except Exception as e:
            print(f"Error installing Linux service: {e}")
            return False
    
    def _remove_linux_service(self):
        """Remove Linux systemd service"""
        try:
            # Stop and disable service
            subprocess.run(['systemctl', 'stop', self.service_name], capture_output=True)
            subprocess.run(['systemctl', 'disable', self.service_name], capture_output=True)
            
            # Remove service file
            service_file_path = f'/etc/systemd/system/{self.service_name}.service'
            if os.path.exists(service_file_path):
                os.remove(service_file_path)
            
            # Reload systemd
            subprocess.run(['systemctl', 'daemon-reload'], check=True)
            
            print(f"Linux systemd service '{self.service_name}' removed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"Error running systemctl command: {e}")
            return False
        except PermissionError:
            print("Error: Root permissions required to remove systemd service")
            print("Run with: sudo python itsm_agent.py remove")
            return False
        except Exception as e:
            print(f"Error removing Linux service: {e}")
            return False
    
    def _start_linux_service(self):
        """Start Linux systemd service"""
        try:
            result = subprocess.run([
                'systemctl', 'start', self.service_name
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
                'systemctl', 'stop', self.service_name
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
