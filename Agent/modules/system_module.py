
"""
System Information Collection Module
Collects general system information and coordinates other modules
"""

import platform
import socket
import getpass
import psutil
from typing import Dict, Any
from datetime import datetime
from .base_module import BaseModule


class SystemModule(BaseModule):
    """System information collection module"""
    
    def __init__(self):
        super().__init__('System')
    
    def collect(self) -> Dict[str, Any]:
        """Collect system information"""
        system_info = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'hostname': self._get_hostname(),
            'os_info': self._get_os_info(),
            'assigned_user': self._get_current_user(),
            'uptime': self._get_uptime(),
            'boot_time': self._get_boot_time(),
            'virtualization': self._get_virtualization_info(),
            'system_health': self._get_system_health()
        }
        
        return system_info
    
    def _get_hostname(self) -> str:
        """Get system hostname"""
        try:
            return socket.gethostname()
        except Exception as e:
            self.logger.error(f"Error getting hostname: {e}")
            return "unknown"
    
    def _get_os_info(self) -> Dict[str, Any]:
        """Get operating system information"""
        try:
            info = {
                'name': platform.system(),
                'version': platform.version(),
                'release': platform.release(),
                'architecture': platform.architecture()[0],
                'machine': platform.machine(),
                'processor': platform.processor(),
                'platform_string': platform.platform()
            }
            
            return info
        except Exception as e:
            self.logger.error(f"Error getting OS info: {e}")
            return {}
    
    def _get_current_user(self) -> str:
        """Get the current logged-in user"""
        try:
            # First try to get the actual logged-in user (not service accounts)
            if platform.system().lower() == 'linux':
                try:
                    import subprocess
                    # Try to get the user who is actually logged in to the desktop session
                    result = subprocess.run(['who'], capture_output=True, text=True, timeout=10)
                    if result.returncode == 0 and result.stdout.strip():
                        lines = result.stdout.strip().split('\n')
                        # Look for users on console or pts (actual login sessions)
                        for line in lines:
                            parts = line.split()
                            if len(parts) >= 2 and ('console' in line or 'pts' in line or 'tty' in line):
                                username = parts[0]
                                # Skip system accounts
                                if username not in ['root', 'mysql', 'postgres', 'redis', 'nginx', 'apache', 'www-data']:
                                    return username
                except Exception as e:
                    self.logger.debug(f"Failed to get logged-in user: {e}")
            
            # Fallback to current process user
            current_user = getpass.getuser()
            
            # If running as root, try to find the actual user
            if current_user == 'root' and platform.system().lower() == 'linux':
                try:
                    import os
                    # Check SUDO_USER environment variable
                    sudo_user = os.environ.get('SUDO_USER')
                    if sudo_user and sudo_user != 'root':
                        return sudo_user
                except Exception:
                    pass
            
            return current_user if current_user not in ['mysql', 'postgres', 'redis'] else "system"
            
        except Exception as e:
            self.logger.warning(f"Failed to get current user: {e}")
            return "unknown"
    
    def _get_uptime(self) -> int:
        """Get system uptime in seconds"""
        try:
            import time
            return int(time.time() - psutil.boot_time())
        except Exception as e:
            self.logger.error(f"Error getting uptime: {e}")
            return 0
    
    def _get_boot_time(self) -> str:
        """Get system boot time"""
        try:
            return datetime.fromtimestamp(psutil.boot_time()).isoformat()
        except Exception as e:
            self.logger.error(f"Error getting boot time: {e}")
            return datetime.utcnow().isoformat()
    
    def _get_virtualization_info(self) -> Dict[str, Any]:
        """Detect if running in a virtual machine"""
        try:
            vm_info = {
                'is_virtual': False,
                'hypervisor': 'unknown',
                'detection_methods': []
            }
            
            system = platform.system().lower()
            
            if system == 'linux':
                vm_info = self._detect_linux_virtualization()
            elif system == 'windows':
                vm_info = self._detect_windows_virtualization()
            elif system == 'darwin':
                vm_info = self._detect_macos_virtualization()
            
            return vm_info
        except Exception as e:
            self.logger.error(f"Error detecting virtualization: {e}")
            return {'is_virtual': False, 'hypervisor': 'unknown', 'detection_methods': []}
    
    def _detect_linux_virtualization(self) -> Dict[str, Any]:
        """Detect virtualization on Linux"""
        vm_info = {
            'is_virtual': False,
            'hypervisor': 'unknown',
            'detection_methods': []
        }
        
        try:
            # Check /proc/cpuinfo for hypervisor flag
            with open('/proc/cpuinfo', 'r') as f:
                content = f.read()
                if 'hypervisor' in content:
                    vm_info['is_virtual'] = True
                    vm_info['detection_methods'].append('cpuinfo_hypervisor_flag')
        except Exception:
            pass
        
        try:
            # Check DMI information
            dmi_files = [
                '/sys/class/dmi/id/sys_vendor',
                '/sys/class/dmi/id/product_name',
                '/sys/class/dmi/id/board_vendor'
            ]
            
            for dmi_file in dmi_files:
                try:
                    with open(dmi_file, 'r') as f:
                        content = f.read().lower()
                        if 'vmware' in content:
                            vm_info['is_virtual'] = True
                            vm_info['hypervisor'] = 'vmware'
                            vm_info['detection_methods'].append('dmi_vmware')
                        elif 'virtualbox' in content:
                            vm_info['is_virtual'] = True
                            vm_info['hypervisor'] = 'virtualbox'
                            vm_info['detection_methods'].append('dmi_virtualbox')
                        elif 'kvm' in content or 'qemu' in content:
                            vm_info['is_virtual'] = True
                            vm_info['hypervisor'] = 'kvm'
                            vm_info['detection_methods'].append('dmi_kvm')
                        elif 'microsoft' in content:
                            vm_info['is_virtual'] = True
                            vm_info['hypervisor'] = 'hyper-v'
                            vm_info['detection_methods'].append('dmi_hyperv')
                except Exception:
                    continue
        except Exception:
            pass
        
        return vm_info
    
    def _detect_windows_virtualization(self) -> Dict[str, Any]:
        """Detect virtualization on Windows"""
        vm_info = {
            'is_virtual': False,
            'hypervisor': 'unknown',
            'detection_methods': []
        }
        
        try:
            import subprocess
            
            # Check WMI for VM detection
            result = subprocess.run([
                'wmic', 'computersystem', 'get', 'Model,Manufacturer', '/format:csv'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                content = result.stdout.lower()
                if 'vmware' in content:
                    vm_info['is_virtual'] = True
                    vm_info['hypervisor'] = 'vmware'
                    vm_info['detection_methods'].append('wmi_vmware')
                elif 'virtualbox' in content:
                    vm_info['is_virtual'] = True
                    vm_info['hypervisor'] = 'virtualbox'
                    vm_info['detection_methods'].append('wmi_virtualbox')
                elif 'microsoft corporation' in content and 'virtual' in content:
                    vm_info['is_virtual'] = True
                    vm_info['hypervisor'] = 'hyper-v'
                    vm_info['detection_methods'].append('wmi_hyperv')
        except Exception:
            pass
        
        return vm_info
    
    def _detect_macos_virtualization(self) -> Dict[str, Any]:
        """Detect virtualization on macOS"""
        vm_info = {
            'is_virtual': False,
            'hypervisor': 'unknown',
            'detection_methods': []
        }
        
        try:
            import subprocess
            
            # Check for common VM indicators
            result = subprocess.run([
                'system_profiler', 'SPHardwareDataType'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                content = result.stdout.lower()
                if 'vmware' in content:
                    vm_info['is_virtual'] = True
                    vm_info['hypervisor'] = 'vmware'
                    vm_info['detection_methods'].append('system_profiler_vmware')
                elif 'virtualbox' in content:
                    vm_info['is_virtual'] = True
                    vm_info['hypervisor'] = 'virtualbox'
                    vm_info['detection_methods'].append('system_profiler_virtualbox')
                elif 'parallels' in content:
                    vm_info['is_virtual'] = True
                    vm_info['hypervisor'] = 'parallels'
                    vm_info['detection_methods'].append('system_profiler_parallels')
        except Exception:
            pass
        
        return vm_info
    
    def _get_system_health(self) -> Dict[str, Any]:
        """Get system health indicators"""
        try:
            health = {
                'status': 'healthy',
                'alerts': [],
                'metrics': {}
            }
            
            # Check basic system health indicators
            try:
                memory = psutil.virtual_memory()
                if memory.percent > 90:
                    health['alerts'].append('Critical memory usage')
                    health['status'] = 'critical'
                elif memory.percent > 75:
                    health['alerts'].append('High memory usage')
                    if health['status'] == 'healthy':
                        health['status'] = 'warning'
                
                health['metrics']['memory_percent'] = memory.percent
            except Exception:
                pass
            
            try:
                cpu_percent = psutil.cpu_percent(interval=1)
                if cpu_percent > 90:
                    health['alerts'].append('Critical CPU usage')
                    health['status'] = 'critical'
                elif cpu_percent > 75:
                    health['alerts'].append('High CPU usage')
                    if health['status'] == 'healthy':
                        health['status'] = 'warning'
                
                health['metrics']['cpu_percent'] = cpu_percent
            except Exception:
                pass
            
            return health
        except Exception as e:
            self.logger.error(f"Error getting system health: {e}")
            return {'status': 'unknown', 'alerts': [], 'metrics': {}}
