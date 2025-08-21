
"""
Services Information Collection Module
Collects running processes and services information
"""

import psutil
import platform
import re
from typing import Dict, Any, List
from datetime import datetime
from .base_module import BaseModule


class ServicesModule(BaseModule):
    """Services and processes information collection module"""
    
    def __init__(self):
        super().__init__('Services')
        self.is_windows = platform.system().lower() == 'windows'
    
    def collect(self) -> Dict[str, Any]:
        """Collect services and processes information"""
        services_info = {
            'running_processes': self._get_running_processes(),
            'system_services': self._get_system_services(),
            'active_connections': self._get_active_connections(),
            'startup_programs': self._get_startup_programs(),
            'process_summary': self._get_process_summary()
        }
        
        return services_info
    
    def _get_running_processes(self) -> List[Dict[str, Any]]:
        """Get running processes information"""
        processes = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 
                                           'memory_percent', 'create_time', 'status']):
                try:
                    proc_info = proc.info
                    processes.append({
                        'pid': proc_info['pid'],
                        'name': proc_info['name'],
                        'username': proc_info['username'],
                        'cpu_percent': proc_info['cpu_percent'] or 0,
                        'memory_percent': proc_info['memory_percent'] or 0,
                        'status': proc_info['status'],
                        'create_time': datetime.fromtimestamp(proc_info['create_time']).isoformat() if proc_info['create_time'] else None
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                except Exception as e:
                    self.logger.debug(f"Error processing process: {e}")
                    continue
            
            # Sort by CPU usage and limit to top 50
            processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
            return processes[:50]
            
        except Exception as e:
            self.logger.error(f"Error getting running processes: {e}")
            return []
    
    def _get_system_services(self) -> List[Dict[str, Any]]:
        """Get system services (Windows only for now)"""
        services = []
        
        if not self.is_windows:
            return services
        
        try:
            import subprocess
            
            # Get Windows services
            result = subprocess.run([
                'sc', 'query', 'type=', 'service', 'state=', 'all'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                services = self._parse_windows_services(result.stdout)
                
        except Exception as e:
            self.logger.debug(f"Error getting Windows services: {e}")
        
        return services[:100]  # Limit to top 100 services
    
    def _parse_windows_services(self, service_output: str) -> List[Dict[str, Any]]:
        """Parse Windows sc query output"""
        services = []
        current_service = {}
        
        for line in service_output.split('\n'):
            line = line.strip()
            
            if line.startswith('SERVICE_NAME:'):
                if current_service:
                    services.append(current_service)
                current_service = {
                    'name': line.split(':', 1)[1].strip(),
                    'display_name': '',
                    'state': '',
                    'type': ''
                }
            elif line.startswith('DISPLAY_NAME:') and current_service:
                current_service['display_name'] = line.split(':', 1)[1].strip()
            elif line.startswith('STATE:') and current_service:
                state_info = line.split(':', 1)[1].strip()
                current_service['state'] = state_info.split()[0] if state_info else ''
            elif line.startswith('TYPE:') and current_service:
                current_service['type'] = line.split(':', 1)[1].strip()
        
        if current_service:
            services.append(current_service)
        
        return services
    
    def _get_active_connections(self) -> List[Dict[str, Any]]:
        """Get active network connections"""
        connections = []
        
        # Process name filter pattern
        ignore_pattern = re.compile(
            r'^(chrome|msedge|brave|explorer|svchost|Idle|System|'
            r'WindowsPackageManagerServer|msedgewebview2|ms-teams)$', 
            re.IGNORECASE
        )
        
        try:
            for conn in psutil.net_connections(kind='tcp'):
                if conn.status != psutil.CONN_ESTABLISHED or not conn.raddr:
                    continue
                
                try:
                    proc = psutil.Process(conn.pid)
                    proc_name = proc.name()
                    
                    # Skip browser and system processes
                    if ignore_pattern.match(proc_name):
                        continue
                    
                    connections.append({
                        'pid': conn.pid,
                        'process_name': proc_name,
                        'local_address': f"{conn.laddr.ip}:{conn.laddr.port}",
                        'remote_address': f"{conn.raddr.ip}:{conn.raddr.port}",
                        'status': conn.status,
                        'family': conn.family.name if hasattr(conn.family, 'name') else str(conn.family)
                    })
                    
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                except Exception as e:
                    self.logger.debug(f"Error processing connection: {e}")
                    continue
            
            # Limit to top 100 connections
            return connections[:100]
            
        except Exception as e:
            self.logger.error(f"Failed to get active connections: {e}")
            return []
    
    def _get_startup_programs(self) -> List[Dict[str, Any]]:
        """Get startup programs (Windows only for now)"""
        startup_programs = []
        
        if not self.is_windows:
            return startup_programs
        
        try:
            import winreg
            
            # Common startup registry locations
            startup_keys = [
                (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run"),
                (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Run"),
                (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\RunOnce"),
                (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\RunOnce")
            ]
            
            for hkey, key_path in startup_keys:
                try:
                    with winreg.OpenKey(hkey, key_path) as key:
                        i = 0
                        while True:
                            try:
                                name, value, _ = winreg.EnumValue(key, i)
                                startup_programs.append({
                                    'name': name,
                                    'command': value,
                                    'location': f"{hkey}\\{key_path}"
                                })
                                i += 1
                            except WindowsError:
                                break
                except WindowsError:
                    continue
                    
        except Exception as e:
            self.logger.debug(f"Error getting startup programs: {e}")
        
        return startup_programs
    
    def _get_process_summary(self) -> Dict[str, Any]:
        """Get process summary statistics"""
        try:
            all_processes = list(psutil.process_iter(['pid', 'name', 'status', 'cpu_percent', 'memory_percent']))
            
            total_processes = len(all_processes)
            running_processes = len([p for p in all_processes if p.info['status'] == psutil.STATUS_RUNNING])
            sleeping_processes = len([p for p in all_processes if p.info['status'] == psutil.STATUS_SLEEPING])
            
            # Calculate total CPU and memory usage
            total_cpu = sum(p.info['cpu_percent'] or 0 for p in all_processes)
            total_memory = sum(p.info['memory_percent'] or 0 for p in all_processes)
            
            return {
                'total_processes': total_processes,
                'running_processes': running_processes,
                'sleeping_processes': sleeping_processes,
                'zombie_processes': total_processes - running_processes - sleeping_processes,
                'total_cpu_usage': round(total_cpu, 2),
                'total_memory_usage': round(total_memory, 2)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting process summary: {e}")
            return {
                'total_processes': 0,
                'running_processes': 0,
                'sleeping_processes': 0,
                'zombie_processes': 0,
                'total_cpu_usage': 0,
                'total_memory_usage': 0
            }
