#!/usr/bin/env python3
"""
System Information Collector - Non-intrusive system monitoring
Collects system information with minimal performance impact
"""

import os
import sys
import time
import platform
import subprocess
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

try:
    import psutil
except ImportError:
    psutil = None


class SystemCollector:
    """Collects system information with minimal performance impact"""
    
    def __init__(self):
        """Initialize the system collector"""
        self.logger = logging.getLogger('SystemCollector')
        self.platform = platform.system().lower()
        
        # Cache for expensive operations
        self._cache = {}
        self._cache_timeout = 30  # seconds
        
        if not psutil:
            self.logger.warning("psutil not available, limited system information will be collected")
    
    def collect_all(self) -> Dict[str, Any]:
        """Collect comprehensive system information"""
        try:
            system_info = {
                'timestamp': datetime.now().isoformat(),
                'hostname': platform.node(),
                'platform': self.platform,
                'architecture': platform.architecture()[0],
                'processor': platform.processor(),
                'system': self._get_system_info(),
                'hardware': self._get_hardware_info(),
                'performance': self._get_performance_info(),
                'network': self._get_network_info(),
                'storage': self._get_storage_info(),
                'processes': self._get_process_info(),
                'services': self._get_services_info(),
                'software': self._get_software_info(),
                'security': self._get_security_info()
            }
            
            return system_info
            
        except Exception as e:
            self.logger.error(f"Error collecting system information: {e}")
            return self._get_basic_fallback_info()
    
    def collect_basic_info(self) -> Dict[str, Any]:
        """Collect basic system information for monitoring"""
        try:
            info = {
                'timestamp': datetime.now().isoformat(),
                'hostname': platform.node(),
                'platform': self.platform
            }
            
            if psutil:
                # CPU usage (non-blocking)
                cpu_percent = psutil.cpu_percent(interval=None)
                info['cpu_percent'] = cpu_percent
                
                # Memory usage
                memory = psutil.virtual_memory()
                info['memory_percent'] = memory.percent
                info['memory_total'] = memory.total
                info['memory_available'] = memory.available
                
                # Disk usage (root/C: drive)
                disk_path = 'C:\\' if self.platform == 'windows' else '/'
                try:
                    disk = psutil.disk_usage(disk_path)
                    info['disk_percent'] = (disk.used / disk.total) * 100
                    info['disk_total'] = disk.total
                    info['disk_free'] = disk.free
                except:
                    info['disk_percent'] = 0
                
                # Load average (Linux/Unix only)
                if hasattr(os, 'getloadavg'):
                    info['load_average'] = os.getloadavg()
                
                # Process count
                info['process_count'] = len(psutil.pids())
                
                # Network I/O
                try:
                    net_io = psutil.net_io_counters()
                    info['network_bytes_sent'] = net_io.bytes_sent
                    info['network_bytes_recv'] = net_io.bytes_recv
                except:
                    pass
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error collecting basic system info: {e}")
            return {
                'timestamp': datetime.now().isoformat(),
                'hostname': platform.node(),
                'platform': self.platform,
                'cpu_percent': 0,
                'memory_percent': 0,
                'disk_percent': 0
            }
    
    def _get_system_info(self) -> Dict[str, Any]:
        """Get basic system information"""
        try:
            info = {
                'platform': platform.platform(),
                'system': platform.system(),
                'release': platform.release(),
                'version': platform.version(),
                'machine': platform.machine(),
                'processor': platform.processor(),
                'python_version': platform.python_version(),
                'uptime': self._get_uptime()
            }
            
            # Add OS-specific information
            if self.platform == 'windows':
                info.update(self._get_windows_info())
            elif self.platform == 'linux':
                info.update(self._get_linux_info())
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting system info: {e}")
            return {'platform': self.platform}
    
    def _get_hardware_info(self) -> Dict[str, Any]:
        """Get hardware information"""
        try:
            info = {}
            
            if psutil:
                # CPU information
                info['cpu_count'] = psutil.cpu_count()
                info['cpu_count_logical'] = psutil.cpu_count(logical=True)
                info['cpu_freq'] = psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
                
                # Memory information
                memory = psutil.virtual_memory()
                info['memory'] = {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used,
                    'free': memory.free
                }
                
                # Swap information
                swap = psutil.swap_memory()
                info['swap'] = {
                    'total': swap.total,
                    'used': swap.used,
                    'free': swap.free,
                    'percent': swap.percent
                }
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting hardware info: {e}")
            return {}
    
    def _get_performance_info(self) -> Dict[str, Any]:
        """Get performance metrics"""
        try:
            info = {}
            
            if psutil:
                # CPU usage per core
                info['cpu_percent_per_core'] = psutil.cpu_percent(percpu=True, interval=None)
                
                # CPU times
                cpu_times = psutil.cpu_times()
                info['cpu_times'] = cpu_times._asdict()
                
                # Load average (Unix systems)
                if hasattr(os, 'getloadavg'):
                    info['load_average'] = os.getloadavg()
                
                # Boot time
                info['boot_time'] = psutil.boot_time()
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting performance info: {e}")
            return {}
    
    def _get_network_info(self) -> Dict[str, Any]:
        """Get network information"""
        try:
            info = {}
            
            if psutil:
                # Network interfaces
                interfaces = {}
                for interface, addrs in psutil.net_if_addrs().items():
                    interfaces[interface] = [addr._asdict() for addr in addrs]
                info['interfaces'] = interfaces
                
                # Network I/O statistics
                net_io = psutil.net_io_counters(pernic=True)
                info['io_counters'] = {nic: stats._asdict() for nic, stats in net_io.items()}
                
                # Network connections (sample)
                try:
                    connections = psutil.net_connections(kind='inet')
                    info['connection_count'] = len(connections)
                    info['listening_ports'] = [
                        conn.laddr.port for conn in connections 
                        if conn.status == 'LISTEN' and conn.laddr
                    ]
                except:
                    # May require elevated privileges
                    pass
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting network info: {e}")
            return {}
    
    def _get_storage_info(self) -> Dict[str, Any]:
        """Get storage information"""
        try:
            info = {}
            
            if psutil:
                # Disk partitions
                partitions = []
                for partition in psutil.disk_partitions():
                    try:
                        usage = psutil.disk_usage(partition.mountpoint)
                        partitions.append({
                            'device': partition.device,
                            'mountpoint': partition.mountpoint,
                            'fstype': partition.fstype,
                            'total': usage.total,
                            'used': usage.used,
                            'free': usage.free,
                            'percent': (usage.used / usage.total) * 100
                        })
                    except PermissionError:
                        # Can't access this partition
                        partitions.append({
                            'device': partition.device,
                            'mountpoint': partition.mountpoint,
                            'fstype': partition.fstype,
                            'error': 'Permission denied'
                        })
                
                info['partitions'] = partitions
                
                # Disk I/O statistics
                try:
                    disk_io = psutil.disk_io_counters(perdisk=True)
                    info['io_counters'] = {disk: stats._asdict() for disk, stats in disk_io.items()}
                except:
                    pass
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting storage info: {e}")
            return {}
    
    def _get_process_info(self) -> Dict[str, Any]:
        """Get process information (limited to avoid performance impact)"""
        try:
            info = {}
            
            if psutil:
                # Process count
                info['process_count'] = len(psutil.pids())
                
                # Top processes by CPU (limit to top 10)
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        proc_info = proc.info
                        if proc_info['cpu_percent'] and proc_info['cpu_percent'] > 0:
                            processes.append(proc_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                # Sort by CPU usage and take top 10
                processes.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
                info['top_processes_cpu'] = processes[:10]
                
                # Memory usage summary
                total_memory = sum(proc['memory_percent'] or 0 for proc in processes)
                info['total_process_memory_percent'] = total_memory
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting process info: {e}")
            return {}
    
    def _get_services_info(self) -> Dict[str, Any]:
        """Get services information"""
        try:
            info = {}
            
            if self.platform == 'windows':
                info.update(self._get_windows_services())
            elif self.platform == 'linux':
                info.update(self._get_linux_services())
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting services info: {e}")
            return {}
    
    def _get_software_info(self) -> Dict[str, Any]:
        """Get installed software information"""
        try:
            info = {}
            
            if self.platform == 'windows':
                info.update(self._get_windows_software())
            elif self.platform == 'linux':
                info.update(self._get_linux_software())
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting software info: {e}")
            return {}
    
    def _get_security_info(self) -> Dict[str, Any]:
        """Get security-related information"""
        try:
            info = {}
            
            # User information
            if psutil:
                users = []
                for user in psutil.users():
                    users.append({
                        'name': user.name,
                        'terminal': user.terminal,
                        'host': user.host,
                        'started': user.started
                    })
                info['logged_users'] = users
            
            # Firewall status (basic check)
            if self.platform == 'windows':
                info.update(self._get_windows_security())
            elif self.platform == 'linux':
                info.update(self._get_linux_security())
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting security info: {e}")
            return {}
    
    def _get_uptime(self) -> Optional[float]:
        """Get system uptime in seconds"""
        try:
            if psutil:
                return time.time() - psutil.boot_time()
            return None
        except:
            return None
    
    def _get_windows_info(self) -> Dict[str, Any]:
        """Get Windows-specific information"""
        try:
            info = {}
            
            # Windows version details
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                   r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
                info['windows_version'] = winreg.QueryValueEx(key, "ProductName")[0]
                info['windows_build'] = winreg.QueryValueEx(key, "CurrentBuildNumber")[0]
                winreg.CloseKey(key)
            except:
                pass
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Windows info: {e}")
            return {}
    
    def _get_linux_info(self) -> Dict[str, Any]:
        """Get Linux-specific information"""
        try:
            info = {}
            
            # Distribution information
            try:
                with open('/etc/os-release', 'r') as f:
                    for line in f:
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            info[f'distro_{key.lower()}'] = value.strip('"')
            except:
                pass
            
            # Kernel version
            info['kernel_version'] = platform.release()
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Linux info: {e}")
            return {}
    
    def _get_windows_services(self) -> Dict[str, Any]:
        """Get Windows services information"""
        try:
            info = {}
            
            # Use sc command to get service status
            try:
                result = subprocess.run(['sc', 'query'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    # Parse service output (simplified)
                    services = []
                    lines = result.stdout.split('\n')
                    current_service = {}
                    
                    for line in lines:
                        line = line.strip()
                        if line.startswith('SERVICE_NAME:'):
                            if current_service:
                                services.append(current_service)
                            current_service = {'name': line.split(':', 1)[1].strip()}
                        elif line.startswith('STATE'):
                            current_service['state'] = line.split(':', 1)[1].strip()
                    
                    if current_service:
                        services.append(current_service)
                    
                    info['services'] = services[:50]  # Limit to first 50
                    info['service_count'] = len(services)
            except:
                pass
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Windows services: {e}")
            return {}
    
    def _get_linux_services(self) -> Dict[str, Any]:
        """Get Linux services information"""
        try:
            info = {}
            
            # Try systemctl for systemd systems
            try:
                result = subprocess.run(['systemctl', 'list-units', '--type=service', '--no-pager'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    services = []
                    lines = result.stdout.split('\n')[1:]  # Skip header
                    
                    for line in lines:
                        if line.strip() and not line.startswith('●'):
                            parts = line.split()
                            if len(parts) >= 4:
                                services.append({
                                    'name': parts[0],
                                    'load': parts[1],
                                    'active': parts[2],
                                    'sub': parts[3]
                                })
                    
                    info['services'] = services[:50]  # Limit to first 50
                    info['service_count'] = len(services)
            except:
                pass
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Linux services: {e}")
            return {}
    
    def _get_windows_software(self) -> Dict[str, Any]:
        """Get Windows installed software"""
        try:
            info = {}
            
            # Use WMI or registry to get installed software (simplified)
            try:
                import winreg
                
                software_list = []
                # Check both 32-bit and 64-bit registry keys
                registry_keys = [
                    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                    r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
                ]
                
                for registry_key in registry_keys:
                    try:
                        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, registry_key)
                        i = 0
                        while True:
                            try:
                                subkey_name = winreg.EnumKey(key, i)
                                subkey = winreg.OpenKey(key, subkey_name)
                                
                                try:
                                    display_name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                    software_list.append(display_name)
                                except:
                                    pass
                                
                                winreg.CloseKey(subkey)
                                i += 1
                                
                                # Limit to prevent performance impact
                                if len(software_list) >= 100:
                                    break
                                    
                            except WindowsError:
                                break
                        
                        winreg.CloseKey(key)
                    except:
                        continue
                
                info['installed_software'] = software_list[:100]
                info['software_count'] = len(software_list)
                
            except:
                pass
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Windows software: {e}")
            return {}
    
    def _get_linux_software(self) -> Dict[str, Any]:
        """Get Linux installed packages"""
        try:
            info = {}
            
            # Try different package managers
            package_managers = [
                ('dpkg', ['dpkg', '-l']),
                ('rpm', ['rpm', '-qa']),
                ('pacman', ['pacman', '-Q'])
            ]
            
            for pm_name, command in package_managers:
                try:
                    result = subprocess.run(command, capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        packages = result.stdout.strip().split('\n')
                        info[f'{pm_name}_packages'] = packages[:100]  # Limit to first 100
                        info['package_count'] = len(packages)
                        break
                except:
                    continue
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Linux software: {e}")
            return {}
    
    def _get_windows_security(self) -> Dict[str, Any]:
        """Get Windows security information"""
        try:
            info = {}
            
            # Windows Defender status (if available)
            try:
                result = subprocess.run(['powershell', '-Command', 'Get-MpComputerStatus'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    info['windows_defender_available'] = True
                else:
                    info['windows_defender_available'] = False
            except:
                info['windows_defender_available'] = False
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Windows security: {e}")
            return {}
    
    def _get_linux_security(self) -> Dict[str, Any]:
        """Get Linux security information"""
        try:
            info = {}
            
            # Check for common security tools
            security_tools = ['iptables', 'ufw', 'fail2ban', 'apparmor', 'selinux']
            available_tools = []
            
            for tool in security_tools:
                try:
                    result = subprocess.run(['which', tool], 
                                          capture_output=True, timeout=10)
                    if result.returncode == 0:
                        available_tools.append(tool)
                except:
                    pass
            
            info['security_tools'] = available_tools
            
            return info
            
        except Exception as e:
            self.logger.error(f"Error getting Linux security: {e}")
            return {}
    
    def _get_basic_fallback_info(self) -> Dict[str, Any]:
        """Get basic fallback information when psutil is not available"""
        return {
            'timestamp': datetime.now().isoformat(),
            'hostname': platform.node(),
            'platform': self.platform,
            'system': platform.system(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'python_version': platform.python_version(),
            'error': 'Limited information available - psutil not installed'
        }


if __name__ == '__main__':
    # Test the system collector
    collector = SystemCollector()
    
    print("Testing basic info collection...")
    basic_info = collector.collect_basic_info()
    print(f"CPU: {basic_info.get('cpu_percent', 'N/A')}%")
    print(f"Memory: {basic_info.get('memory_percent', 'N/A')}%")
    print(f"Disk: {basic_info.get('disk_percent', 'N/A')}%")
    
    print("\nTesting full info collection...")
    full_info = collector.collect_all()
    print(f"Collected {len(full_info)} categories of information")
