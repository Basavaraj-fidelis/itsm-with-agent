#!/usr/bin/env python3
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
        """Install Windows service using NSSM (if available) or sc command"""
        try:
            # First try to use NSSM if available
            if self._try_nssm_install():
                return True
            
            # Fallback to creating a batch wrapper and using sc command
            return self._install_with_batch_wrapper()
            
        except Exception as e:
            print(f"Error installing Windows service: {e}")
            return False
    
    def _try_nssm_install(self):
        """Try to install service using NSSM (Non-Sucking Service Manager)"""
        try:
            # Check if NSSM is available
            result = subprocess.run(['nssm', 'version'], capture_output=True, text=True)
            if result.returncode != 0:
                return False
            
            script_path = os.path.abspath(sys.argv[0])
            
            # Install service with NSSM
            install_cmd = [
                'nssm', 'install', self.service_name,
                sys.executable, script_path
            ]
            
            result = subprocess.run(install_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                # Configure service with proper parameters
                subprocess.run(['nssm', 'set', self.service_name, 'DisplayName', self.display_name])
                subprocess.run(['nssm', 'set', self.service_name, 'Description', 'ITSM Endpoint Agent'])
                subprocess.run(['nssm', 'set', self.service_name, 'Start', 'SERVICE_AUTO_START'])
                subprocess.run(['nssm', 'set', self.service_name, 'AppStdout', 'C:\\Program Files\\ITSM Agent\\logs\\stdout.log'])
                subprocess.run(['nssm', 'set', self.service_name, 'AppStderr', 'C:\\Program Files\\ITSM Agent\\logs\\stderr.log'])
                subprocess.run(['nssm', 'set', self.service_name, 'AppRotateFiles', '1'])
                subprocess.run(['nssm', 'set', self.service_name, 'AppRotateOnline', '1'])
                subprocess.run(['nssm', 'set', self.service_name, 'AppRotateSeconds', '86400'])  # Daily rotation
                
                print(f"Windows service '{self.service_name}' installed successfully using NSSM")
                return True
            
        except FileNotFoundError:
            # NSSM not found
            pass
        except Exception as e:
            print(f"NSSM installation failed: {e}")
        
        return False
    
    def _install_with_batch_wrapper(self):
        """Install service using batch wrapper and sc command"""
        try:
            # Create service directory
            service_dir = os.path.join(os.environ.get('PROGRAMFILES', 'C:\\Program Files'), 'ITSM Agent')
            os.makedirs(service_dir, exist_ok=True)
            
            # Copy main script to service directory
            script_name = os.path.basename(sys.argv[0])
            service_script = os.path.join(service_dir, script_name)
            
            if os.path.abspath(sys.argv[0]) != service_script:
                import shutil
                shutil.copy2(sys.argv[0], service_script)
            
            # Create batch wrapper
            batch_wrapper = os.path.join(service_dir, f'{self.service_name}.bat')
            batch_content = f'''@echo off
cd /d "{service_dir}"
"{sys.executable}" "{script_name}"
'''
            
            with open(batch_wrapper, 'w') as f:
                f.write(batch_content)
            
            # Create service using sc command
            sc_cmd = [
                'sc', 'create', self.service_name,
                'binPath=', f'"{batch_wrapper}"',
                'DisplayName=', self.display_name,
                'start=', 'auto'
            ]
            
            result = subprocess.run(sc_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print(f"Windows service '{self.service_name}' installed successfully")
                return True
            else:
                print(f"Service installation failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"Error installing service with batch wrapper: {e}")
            return False
    
    def _remove_windows_service(self):
        """Remove Windows service"""
        try:
            # Try NSSM first
            result = subprocess.run(['nssm', 'remove', self.service_name, 'confirm'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"Windows service '{self.service_name}' removed successfully using NSSM")
                return True
            
            # Fallback to sc command
            result = subprocess.run(['sc', 'delete', self.service_name], 
                                  capture_output=True, text=True)
            
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
            result = subprocess.run(['sc', 'start', self.service_name], 
                                  capture_output=True, text=True)
            
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
            result = subprocess.run(['sc', 'stop', self.service_name], 
                                  capture_output=True, text=True)
            
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
        """Run as Windows service"""
        try:
            # Setup logging for service mode
            import logging
            from logging.handlers import RotatingFileHandler
            from pathlib import Path
            
            # Create service logs directory
            log_dir = Path('C:\\Program Files\\ITSM Agent\\logs')
            log_dir.mkdir(exist_ok=True)
            
            # Setup service logger
            log_file = log_dir / 'service.log'
            handler = RotatingFileHandler(log_file, maxBytes=10485760, backupCount=5)
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            
            service_logger = logging.getLogger('WindowsService')
            service_logger.setLevel(logging.INFO)
            service_logger.addHandler(handler)
            
            service_logger.info("Windows service starting...")
            self.start_service()
        except Exception as e:
            # Log any service startup errors
            try:
                with open('C:\\Program Files\\ITSM Agent\\service_error.log', 'a') as f:
                    import datetime
                    f.write(f"{datetime.datetime.now()}: Service error: {e}\n")
            except:
                pass
            raise
    
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
            result = subprocess.run(['systemctl', 'start', self.service_name], 
                                  capture_output=True, text=True)
            
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
            result = subprocess.run(['systemctl', 'stop', self.service_name], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"Linux service '{self.service_name}' stopped successfully")
                return True
            else:
                print(f"Error stopping Linux service: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"Error stopping Linux service: {e}")
            return False


if __name__ == '__main__':
    # Test the service wrapper
    class TestService(ServiceWrapper):
        def start_service(self):
            print("Test service started")
            time.sleep(5)
            print("Test service finished")
        
        def stop_service(self):
            print("Test service stopped")
    
    service = TestService('TestITSMAgent', 'Test ITSM Agent')
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'install':
            service.install()
        elif command == 'remove':
            service.remove()
        elif command == 'start':
            service.start()
        elif command == 'stop':
            service.stop()
        elif command == 'restart':
            service.restart()
        else:
            print("Usage: python service_wrapper.py [install|remove|start|stop|restart]")
    else:
        print("Running test service...")
        service.start_service()
