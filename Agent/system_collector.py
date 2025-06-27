"""
System Information Collector
Gathers comprehensive system information across platforms
"""

import os
import sys
import json
import socket
import platform
import subprocess
import psutil
import logging
from datetime import datetime
from pathlib import Path
import requests
import getpass
import csv
import io
import re


class SystemCollector:
    """Collects comprehensive system information"""
    
    def __init__(self):
        self.logger = logging.getLogger('SystemCollector')
        self.is_windows = platform.system().lower() == 'windows'
        self.is_linux = platform.system().lower() == 'linux'
        self.is_macos = platform.system().lower() == 'darwin'
        
    def sync_active_directory(self, config):
        """Sync with Active Directory from agent's network"""
        try:
            import ldap3
            from ldap3 import Server, Connection, ALL
            
            server = Server(config['server'], get_info=ALL)
            conn = Connection(
                server,
                user=config['bindDN'],
                password=config['bindPassword'],
                auto_bind=True
            )
            
            # Search for users
            users = []
            conn.search(
                config['searchBase'],
                '(&(objectClass=user)(mail=*))',
                attributes=['sAMAccountName', 'mail', 'displayName', 'department', 'memberOf']
            )
            
            for entry in conn.entries:
                users.append({
                    'username': str(entry.sAMAccountName),
                    'email': str(entry.mail),
                    'displayName': str(entry.displayName),
                    'department': str(entry.department) if entry.department else '',
                    'groups': [str(group) for group in entry.memberOf] if entry.memberOf else []
                })
            
            # Search for groups
            groups = []
            conn.search(
                config['searchBase'].replace('OU=Users', 'OU=Groups'),
                '(objectClass=group)',
                attributes=['cn', 'description', 'member']
            )
            
            for entry in conn.entries:
                groups.append({
                    'name': str(entry.cn),
                    'description': str(entry.description) if entry.description else '',
                    'members': [str(member) for member in entry.member] if entry.member else []
                })
            
            conn.unbind()
            
            return {
                'success': True,
                'users': users,
                'groups': groups,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"AD sync error: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def test_ad_connection(self, config):
        """Test AD connection from agent's network"""
        try:
            import ldap3
            from ldap3 import Server, Connection, ALL
            
            server = Server(config['server'], get_info=ALL)
            conn = Connection(
                server,
                user=config['bindDN'],
                password=config['bindPassword'],
                auto_bind=True
            )
            
            # Test search
            conn.search(config['searchBase'], '(objectClass=*)', search_scope='BASE')
            conn.unbind()
            
            return {
                'success': True,
                'message': 'AD connection successful',
                'server_info': {
                    'domain': config['searchBase'],
                    'server': config['server']
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def collect_all(self):
        """Collect all available system information"""
        
        
        info = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'hostname': self._get_hostname(),
            'os_info': self._get_os_info(),
            'network': self._get_network_info(),
            'hardware': self._get_hardware_info(),
            'storage': self._get_storage_info(),
            'software': self._get_software_info(),
            'processes': self._get_running_processes(),
            'usb_devices': self._get_usb_devices(),
            'virtualization': self._get_virtualization_info(),
            'system_health': self._get_system_health(),
            'security': self._get_security_info(),
            'assigned_user': self._get_current_user(),
            "active_ports": self._get_filtered_tcp_ports(),
            
        }
        
        return info
    
    def _get_hostname(self):
        """Get system hostname"""
        try:
            return socket.gethostname()
        except Exception as e:
            self.logger.error(f"Error getting hostname: {e}")
            return "unknown"
    
    def _get_os_info(self):
        """Get operating system information"""
        try:
            info = {
                'name': platform.system(),
                'version': platform.version(),
                'release': platform.release(),
                'architecture': platform.architecture()[0],
                'machine': platform.machine(),
                'processor': platform.processor(),
                'platform_string': platform.platform(),
                'boot_time': datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                'uptime_seconds': int(psutil.time.time() - psutil.boot_time())
            }
            
            # Get additional OS-specific information
            if self.is_windows:
                info.update(self._get_windows_os_info())
            elif self.is_linux:
                info.update(self._get_linux_os_info())
            elif self.is_macos:
                info.update(self._get_macos_os_info())
            
            return info
        except Exception as e:
            self.logger.error(f"Error getting OS info: {e}")
            return {}
    
    def _get_windows_os_info(self):
       """Get Windows-specific OS information"""
       try:
           info = {}

           # Get Windows version info from registry
           try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                r"SOFTWARE\Microsoft\Windows NT\CurrentVersion") as key:
                 try:
                        info['build_number'] = winreg.QueryValueEx(key, "CurrentBuildNumber")[0]
                 except Exception:
                        pass
                 try:
                        info['display_version'] = winreg.QueryValueEx(key, "DisplayVersion")[0]
                 except Exception:
                        pass
                 try:
                        info['product_name'] = winreg.QueryValueEx(key, "ProductName")[0]
                 except Exception:
                        pass
           except Exception as e:
                self.logger.warning(f"Registry access failed: {e}")

           # Alternative method using systeminfo command
           if not info:
                try:
                    result = subprocess.run(['systeminfo'], capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        for line in result.stdout.split('\n'):
                            if 'OS Name:' in line:
                                info['product_name'] = line.split(':', 1)[1].strip()
                            elif 'OS Version:' in line:
                                info['os_version'] = line.split(':', 1)[1].strip()
                except Exception as e:
                    self.logger.warning(f"systeminfo command failed: {e}")

            # Last update time (latest patch)
           try:
                ps_command = "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1 | ConvertTo-Json"
                result = subprocess.run(["powershell", "-Command", ps_command], capture_output=True, text=True, timeout=30)
                if result.returncode == 0 and result.stdout:
                    import json as js
                    hotfix_info = js.loads(result.stdout.strip())
                    if isinstance(hotfix_info, dict) and 'InstalledOn' in hotfix_info:
                        info['last_update'] = hotfix_info['InstalledOn']
           except Exception as e:
                self.logger.warning(f"PowerShell last update fetch failed: {e}")

            # Full list of installed patches
           try:
                ps_command = "Get-HotFix | Select-Object HotFixID, InstalledOn | ConvertTo-Json"
                result = subprocess.run(["powershell", "-Command", ps_command], capture_output=True, text=True, timeout=30)
                if result.returncode == 0 and result.stdout:
                    import json as js
                    patches = js.loads(result.stdout.strip())
                    if isinstance(patches, list):
                        info['patches'] = [
                            {
                                "id": patch.get('HotFixID', 'unknown'),
                                "installed_on": patch.get('InstalledOn', 'unknown')
                            }
                            for patch in patches
                        ]
           except Exception as e:
                self.logger.warning(f"Failed to collect full patch list: {e}")

           return info
       except Exception as e:
            self.logger.error(f"Error getting Windows OS info: {e}")
            return {}


        
    def _get_linux_os_info(self):
        """Get Linux-specific OS information"""
        try:
            info = {}

            # Read OS release info
            try:
                with open('/etc/os-release', 'r') as f:
                    for line in f:
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            info[key.lower()] = value.strip('"')
            except Exception:
                pass

            # Kernel version
            try:
                info['kernel_version'] = platform.uname().release
            except Exception:
                pass

            # Last update time
            try:
                if os.path.exists('/var/log/apt/history.log'):
                    result = subprocess.run(['tail', '-n', '50', '/var/log/apt/history.log'], 
                                            capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        for line in reversed(lines):
                            if line.startswith('Start-Date:'):
                                info['last_update'] = line.split(':', 1)[1].strip()
                                break

                elif os.path.exists('/var/log/dnf.log') or os.path.exists('/var/log/yum.log'):
                    log_file = '/var/log/dnf.log' if os.path.exists('/var/log/dnf.log') else '/var/log/yum.log'
                    result = subprocess.run(['tail', '-n', '10', log_file], 
                                            capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if lines:
                            info['last_update'] = ' '.join(lines[-1].split()[0:2])
            except Exception:
                pass

            # Patch list (APT or RPM)
            try:
                patches = []
                if shutil.which('dpkg'):
                    result = subprocess.run(['grep', 'Start-Date:', '/var/log/apt/history.log'], 
                                            capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        for i, line in enumerate(result.stdout.strip().split('\n')[-10:]):
                            patches.append({"id": f"APT-{i+1}", "installed_on": line.replace('Start-Date:', '').strip()})
                elif shutil.which('rpm'):
                    result = subprocess.run(['rpm', '-qa', '--last'], capture_output=True, text=True, timeout=15)
                    if result.returncode == 0:
                        for i, line in enumerate(result.stdout.strip().split('\n')[:10]):
                            parts = line.split()
                            patches.append({
                                "id": parts[0],
                                "installed_on": ' '.join(parts[1:4])
                            })
                if patches:
                    info['patches'] = patches
            except Exception as e:
                self.logger.warning(f"Failed to collect Linux patch list: {e}")

            return info
        except Exception as e:
            self.logger.error(f"Error getting Linux OS info: {e}")
            return {}

    def _get_macos_os_info(self):
        """Get macOS-specific OS information"""
        try:
            info = {}

            try:
                result = subprocess.run(['sw_vers'], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if 'ProductName:' in line:
                            info['product_name'] = line.split(':')[1].strip()
                        elif 'ProductVersion:' in line:
                            info['version'] = line.split(':')[1].strip()
                        elif 'BuildVersion:' in line:
                            info['build'] = line.split(':')[1].strip()
            except Exception:
                pass

            # Last update and patches
            try:
                result = subprocess.run(['softwareupdate', '--history'], capture_output=True, text=True, timeout=15)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    patches = []
                    for line in lines[1:][-10:]:  # skip header
                        parts = line.strip().split()
                        if len(parts) >= 3:
                            patch_name = parts[0]
                            patch_date = ' '.join(parts[1:3])
                            patches.append({"id": patch_name, "installed_on": patch_date})
                    if patches:
                        info['patches'] = patches
            except Exception as e:
                self.logger.warning(f"Failed to collect macOS patch list: {e}")

            return info
        except Exception as e:
            self.logger.error(f"Error getting macOS OS info: {e}")
            return {}

    
    def _get_network_info(self):
        """Get network interface information"""
        try:
            import socket
            interfaces = []

            # Get public IP
            public_ip = self._get_public_ip()

            # List of keywords to filter out virtual adapters by name (customize as needed)
            virtual_keywords = ['vEthernet', 'VMware', 'Virtual', 'Loopback', 'Hyper-V']

            # Collect interface info
            for interface_name, addresses in psutil.net_if_addrs().items():
                # Skip virtual adapters by name
                if any(keyword.lower() in interface_name.lower() for keyword in virtual_keywords):
                    continue

                interface_info = {
                    'name': interface_name,
                    'addresses': []
                }

                for addr in addresses:
                    addr_info = {
                        'family': addr.family.name if hasattr(addr.family, 'name') else str(addr.family),
                        'address': addr.address,
                        'netmask': addr.netmask,
                        'broadcast': addr.broadcast
                    }

                    # Capture MAC address
                    if addr.family == getattr(psutil, 'AF_LINK', 17):  # 17 is AF_LINK fallback
                        interface_info['mac_address'] = addr.address

                    interface_info['addresses'].append(addr_info)

                # Interface stats
                try:
                    stats = psutil.net_if_stats()[interface_name]
                    # Skip interfaces that are down or have 0 speed (optional)
                    if not stats.isup or stats.speed == 0:
                        continue

                    interface_info['stats'] = {
                        'is_up': stats.isup,
                        'duplex': stats.duplex.name if hasattr(stats.duplex, 'name') else str(stats.duplex),
                        'speed': stats.speed,
                        'mtu': stats.mtu
                    }
                except Exception:
                    continue

                interfaces.append(interface_info)

            # Get first non-null, non-zero MAC address from filtered interfaces
            macs = [
                iface.get('mac_address') for iface in interfaces
                if 'mac_address' in iface and iface.get('mac_address') not in [None, '', '00:00:00:00:00:00']
            ]
            primary_mac = macs[0] if macs else "unknown"

            return {
                'public_ip': public_ip,
                'primary_mac': primary_mac,
                'interfaces': interfaces,
                'io_counters': self._get_network_io_counters()
            }

        except Exception as e:
            self.logger.error(f"Error getting network info: {e}", exc_info=True)
            return {}


    
    def _get_public_ip(self):
        """Get public IP address"""
        try:
            # Try multiple services for reliability
            services = [
                'https://api.ipify.org',
                'https://icanhazip.com',
                'https://checkip.amazonaws.com'
            ]
            
            for service in services:
                try:
                    response = requests.get(service, timeout=10)
                    if response.status_code == 200:
                        return response.text.strip()
                except Exception:
                    continue
            
            return "unknown"
        except Exception:
            return "unknown"
    
    def _get_network_io_counters(self):
        """Get network I/O statistics"""
        try:
            io_counters = psutil.net_io_counters()
            return {
                'bytes_sent': io_counters.bytes_sent,
                'bytes_recv': io_counters.bytes_recv,
                'packets_sent': io_counters.packets_sent,
                'packets_recv': io_counters.packets_recv,
                'errin': io_counters.errin,
                'errout': io_counters.errout,
                'dropin': io_counters.dropin,
                'dropout': io_counters.dropout
            }
        except Exception:
            return {}
    
    def _get_hardware_info(self):
        """Get hardware information"""
        try:
            info = {
                'cpu': self._get_cpu_info(),
                'memory': self._get_memory_info(),
                'system': self._get_system_hardware_info()
            }
            return info
        except Exception as e:
            self.logger.error(f"Error getting hardware info: {e}")
            return {}
    
    def _get_cpu_info(self):
        """Get CPU information"""
        try:
            info = {
                'physical_cores': psutil.cpu_count(logical=False),
                'logical_cores': psutil.cpu_count(logical=True),
                'current_freq': psutil.cpu_freq().current if psutil.cpu_freq() else None,
                'max_freq': psutil.cpu_freq().max if psutil.cpu_freq() else None,
                'usage_percent': psutil.cpu_percent(interval=1),
                'load_average': list(os.getloadavg()) if hasattr(os, 'getloadavg') else None
            }
            
            # Get CPU model information
            if self.is_windows:
                try:
                    import winreg
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                      r"HARDWARE\DESCRIPTION\System\CentralProcessor\0") as key:
                        info['model'] = winreg.QueryValueEx(key, "ProcessorNameString")[0]
                except Exception:
                    pass
            elif self.is_linux:
                try:
                    with open('/proc/cpuinfo', 'r') as f:
                        for line in f:
                            if line.startswith('model name'):
                                info['model'] = line.split(':', 1)[1].strip()
                                break
                except Exception:
                    pass
            
            return info
        except Exception as e:
            self.logger.error(f"Error getting CPU info: {e}")
            return {}
    
    def _get_memory_info(self):
        """Get memory information"""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            return {
                'total': memory.total,
                'available': memory.available,
                'used': memory.used,
                'percentage': memory.percent,
                'swap_total': swap.total,
                'swap_used': swap.used,
                'swap_percentage': swap.percent
            }
        except Exception as e:
            self.logger.error(f"Error getting memory info: {e}")
            return {}
    
    def _get_system_hardware_info(self):
        """Get system hardware information (manufacturer, model, serial)"""
        try:
            info = {}
            
            if self.is_windows:
                # Try multiple methods for hardware info
                
                # Method 1: WMI computersystem with better parsing
                try:
                    # Try CSV format first as it's more reliable
                    result = subprocess.run([
                        'wmic', 'computersystem', 'get', 
                        'Manufacturer,Model', '/format:csv'
                    ], capture_output=True, text=True, timeout=60, shell=True)
                    
                    if result.returncode == 0 and result.stdout.strip():
                        lines = [line.strip() for line in result.stdout.strip().split('\n') if line.strip() and ',' in line]
                        for line in lines[1:]:  # Skip header
                            if line:
                                parts = line.split(',')
                                if len(parts) >= 3:  # Node,Manufacturer,Model
                                    manufacturer = parts[1].strip() if len(parts) > 1 else ''
                                    model = parts[2].strip() if len(parts) > 2 else ''
                                    if manufacturer and manufacturer.lower() not in ['n/a', '', 'null']:
                                        info['manufacturer'] = manufacturer
                                    if model and model.lower() not in ['n/a', '', 'null']:
                                        info['model'] = model
                                    break
                    
                    # Alternative method using registry if WMI fails
                    if not info:
                        try:
                            import winreg
                            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                              r"HARDWARE\DESCRIPTION\System\BIOS") as key:
                                try:
                                    manufacturer = winreg.QueryValueEx(key, "SystemManufacturer")[0]
                                    if manufacturer and manufacturer.lower() not in ['n/a', '', 'null']:
                                        info['manufacturer'] = manufacturer
                                except Exception:
                                    pass
                                try:
                                    model = winreg.QueryValueEx(key, "SystemProductName")[0]
                                    if model and model.lower() not in ['n/a', '', 'null']:
                                        info['model'] = model
                                except Exception:
                                    pass
                        except Exception as e:
                            self.logger.warning(f"Registry BIOS query failed: {e}")
                    
                    # If still no info, try WMI with different format
                    if not info:
                        result = subprocess.run([
                            'wmic', 'computersystem', 'get', 
                            'Manufacturer,Model,TotalPhysicalMemory', '/format:csv'
                        ], capture_output=True, text=True, timeout=60, shell=True)
                        
                        if result.returncode == 0:
                            lines = [line for line in result.stdout.strip().split('\n') if line.strip()]
                            if len(lines) > 1:
                                # Find the data line (not header)
                                for line in lines[1:]:
                                    if ',' in line:
                                        data = line.split(',')
                                        if len(data) >= 4:
                                            if data[1].strip() and data[1].strip().lower() != 'n/a':
                                                info['manufacturer'] = data[1].strip()
                                            if data[2].strip() and data[2].strip().lower() != 'n/a':
                                                info['model'] = data[2].strip()
                                            break
                except Exception as e:
                    self.logger.warning(f"WMI computersystem query failed: {e}")
                
                # Method 2: WMI BIOS for serial
                try:
                    result = subprocess.run([
                        'wmic', 'bios', 'get', 'SerialNumber', '/format:csv'
                    ], capture_output=True, text=True, timeout=60)
                    
                    if result.returncode == 0:
                        lines = [line for line in result.stdout.strip().split('\n') if line.strip()]
                        if len(lines) > 1:
                            for line in lines[1:]:
                                if ',' in line:
                                    data = line.split(',')
                                    if len(data) >= 2 and data[1].strip():
                                        info['serial_number'] = data[1].strip()
                                        break
                except Exception as e:
                    self.logger.warning(f"WMI BIOS query failed: {e}")
                
                # Method 3: Alternative using systeminfo if WMI fails
                if not info:
                    try:
                        result = subprocess.run(['systeminfo'], capture_output=True, text=True, timeout=60)
                        if result.returncode == 0:
                            for line in result.stdout.split('\n'):
                                if 'System Manufacturer:' in line:
                                    info['manufacturer'] = line.split(':', 1)[1].strip()
                                elif 'System Model:' in line:
                                    info['model'] = line.split(':', 1)[1].strip()
                    except Exception as e:
                        self.logger.warning(f"systeminfo fallback failed: {e}")
                
                # Method 4: Registry fallback
                if not info:
                    try:
                        import winreg
                        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                          r"HARDWARE\DESCRIPTION\System\BIOS") as key:
                            try:
                                info['manufacturer'] = winreg.QueryValueEx(key, "SystemManufacturer")[0]
                            except Exception:
                                pass
                            try:
                                info['model'] = winreg.QueryValueEx(key, "SystemProductName")[0]
                            except Exception:
                                pass
                    except Exception as e:
                        self.logger.warning(f"Registry BIOS query failed: {e}")
            
            elif self.is_linux:
                try:
                    # Try dmidecode for system information
                    if os.path.exists('/usr/sbin/dmidecode') or os.path.exists('/sbin/dmidecode'):
                        dmidecode_cmd = 'dmidecode' if os.path.exists('/usr/sbin/dmidecode') else '/sbin/dmidecode'
                        
                        # Get system information
                        result = subprocess.run([
                            'sudo', dmidecode_cmd, '-t', 'system'
                        ], capture_output=True, text=True, timeout=30)
                        
                        if result.returncode == 0:
                            for line in result.stdout.split('\n'):
                                line = line.strip()
                                if line.startswith('Manufacturer:'):
                                    info['manufacturer'] = line.split(':', 1)[1].strip()
                                elif line.startswith('Product Name:'):
                                    info['model'] = line.split(':', 1)[1].strip()
                                elif line.startswith('Serial Number:'):
                                    info['serial_number'] = line.split(':', 1)[1].strip()
                    
                    # Fallback: try /sys/class/dmi/id/
                    if not info:
                        dmi_paths = {
                            'manufacturer': '/sys/class/dmi/id/sys_vendor',
                            'model': '/sys/class/dmi/id/product_name',
                            'serial_number': '/sys/class/dmi/id/product_serial'
                        }
                        
                        for key, path in dmi_paths.items():
                            try:
                                with open(path, 'r') as f:
                                    info[key] = f.read().strip()
                            except Exception:
                                pass
                
                except Exception:
                    pass
            
            return info
        except Exception as e:
            self.logger.error(f"Error getting system hardware info: {e}", exc_info=True)
            return {}
    
    def _get_storage_info(self):
        """Get storage/disk information"""
        try:
            disks = []
            
            # Get disk partitions
            try:
                partitions = psutil.disk_partitions()
            except Exception as e:
                self.logger.warning(f"Failed to get disk partitions: {e}")
                partitions = []
            
            for partition in partitions:
                try:
                    disk_info = {
                        'device': partition.device,
                        'mountpoint': partition.mountpoint,
                        'filesystem': partition.fstype or 'unknown'
                    }
                    
                    # Get disk usage - be more careful about access issues
                    try:
                        # Skip problematic mount points on Windows
                        if self.is_windows and partition.mountpoint in ['A:\\', 'B:\\']:
                            continue
                        
                        usage = psutil.disk_usage(partition.mountpoint)
                        if usage.total > 0:  # Only include drives with actual size
                            disk_info.update({
                                'total': usage.total,
                                'used': usage.used,
                                'free': usage.free,
                                'percent': round((usage.used / usage.total) * 100, 2),
                                'usage': {
                                    'total': usage.total,
                                    'used': usage.used,
                                    'free': usage.free,
                                    'percentage': round((usage.used / usage.total) * 100, 2)
                                }
                            })
                        else:
                            continue  # Skip empty drives
                    except (PermissionError, OSError) as e:
                        self.logger.debug(f"Cannot access {partition.mountpoint}: {e}")
                        continue
                    except Exception as e:
                        self.logger.warning(f"Error getting disk usage for {partition.mountpoint}: {e}")
                        continue
                    
                    # Get disk I/O statistics
                    try:
                        io_counters = psutil.disk_io_counters(perdisk=True)
                        if io_counters:
                            # Try different device name formats
                            device_variants = [
                                partition.device.replace('/dev/', '').replace('\\', ''),
                                partition.device.replace(':', ''),
                                partition.device.split('\\')[-1] if '\\' in partition.device else partition.device
                            ]
                            
                            for device_name in device_variants:
                                if device_name in io_counters:
                                    io = io_counters[device_name]
                                    disk_info['io_counters'] = {
                                        'read_count': io.read_count,
                                        'write_count': io.write_count,
                                        'read_bytes': io.read_bytes,
                                        'write_bytes': io.write_bytes,
                                        'read_time': io.read_time,
                                        'write_time': io.write_time
                                    }
                                    break
                    except Exception as e:
                        self.logger.debug(f"Could not get I/O stats for {partition.device}: {e}")
                    
                    disks.append(disk_info)
                
                except Exception as e:
                    self.logger.debug(f"Error processing partition {partition}: {e}")
                    continue
            
            # If no disks found, at least try to get system drive info
            if not disks and self.is_windows:
                try:
                    system_drive = os.environ.get('SystemDrive', 'C:') + '\\'
                    usage = psutil.disk_usage(system_drive)
                    disks.append({
                        'device': system_drive,
                        'mountpoint': system_drive,
                        'filesystem': 'NTFS',
                        'usage': {
                            'total': usage.total,
                            'used': usage.used,
                            'free': usage.free,
                            'percentage': round((usage.used / usage.total) * 100, 2)
                        }
                    })
                except Exception as e:
                    self.logger.warning(f"Could not get system drive info: {e}")
            
            return {
                'disks': disks,
                'smart_data': self._get_smart_data()
            }
        except Exception as e:
            self.logger.error(f"Error getting storage info: {e}", exc_info=True)
            return {'disks': [], 'smart_data': []}
    
    def _get_smart_data(self):
        """Get SMART disk health data where available"""
        try:
            smart_data = []
            
            if self.is_linux and os.path.exists('/usr/sbin/smartctl'):
                try:
                    # Get list of drives
                    result = subprocess.run([
                        'sudo', '/usr/sbin/smartctl', '--scan'
                    ], capture_output=True, text=True, timeout=30)
                    
                    if result.returncode == 0:
                        for line in result.stdout.split('\n'):
                            if line.strip() and '/dev/' in line:
                                device = line.split()[0]
                                
                                # Get SMART health status
                                health_result = subprocess.run([
                                    'sudo', '/usr/sbin/smartctl', '-H', device
                                ], capture_output=True, text=True, timeout=30)
                                
                                if health_result.returncode == 0:
                                    health_status = 'unknown'
                                    for health_line in health_result.stdout.split('\n'):
                                        if 'SMART overall-health' in health_line:
                                            health_status = health_line.split(':')[1].strip()
                                            break
                                    
                                    smart_data.append({
                                        'device': device,
                                        'health_status': health_status
                                    })
                
                except Exception:
                    pass
            
            return smart_data
        except Exception:
            return []
    
    def _get_software_info(self):
        """Get installed software information"""
        try:
            software = []
            
            if self.is_windows:
                try:
                    # Use WMI to get installed programs
                    result = subprocess.run([
                        'wmic', 'product', 'get', 'Name,Version,Vendor', '/format:csv'
                    ], capture_output=True, text=True, timeout=60)
                    
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')[1:]  # Skip header
                        for line in lines:
                            if line.strip() and ',' in line:
                                parts = line.split(',')
                                if len(parts) >= 4 and parts[1].strip():
                                    software.append({
                                        'name': parts[1].strip(),
                                        'version': parts[3].strip(),
                                        'vendor': parts[2].strip()
                                    })
                
                except Exception:
                    pass
            
            elif self.is_linux:
                try:
                    # Try different package managers
                    if os.path.exists('/usr/bin/dpkg'):
                        # Debian/Ubuntu
                        result = subprocess.run([
                            'dpkg', '-l'
                        ], capture_output=True, text=True, timeout=60)
                        
                        if result.returncode == 0:
                            for line in result.stdout.split('\n'):
                                if line.startswith('ii'):
                                    parts = line.split()
                                    if len(parts) >= 3:
                                        software.append({
                                            'name': parts[1],
                                            'version': parts[2],
                                            'vendor': 'debian'
                                        })
                    
                    elif os.path.exists('/usr/bin/rpm'):
                        # RedHat/CentOS/Fedora
                        result = subprocess.run([
                            'rpm', '-qa', '--queryformat', '%{NAME}|%{VERSION}|%{VENDOR}\n'
                        ], capture_output=True, text=True, timeout=60)
                        
                        if result.returncode == 0:
                            for line in result.stdout.split('\n'):
                                if '|' in line:
                                    parts = line.split('|')
                                    if len(parts) >= 3:
                                        software.append({
                                            'name': parts[0],
                                            'version': parts[1],
                                            'vendor': parts[2]
                                        })
                
                except Exception:
                    pass
            
            # Limit to top 50 packages to avoid overwhelming the API
            return software[:50]
        except Exception as e:
            self.logger.error(f"Error getting software info: {e}")
            return []
    
    def _get_running_processes(self):
        """Get running processes information"""
        try:
            processes = []
            
            for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'create_time']):
                try:
                    proc_info = proc.info
                    processes.append({
                        'pid': proc_info['pid'],
                        'name': proc_info['name'],
                        'username': proc_info['username'],
                        'cpu_percent': proc_info['cpu_percent'],
                        'memory_percent': proc_info['memory_percent'],
                        'create_time': datetime.fromtimestamp(proc_info['create_time']).isoformat() if proc_info['create_time'] else None
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Sort by CPU usage and limit to top 20
            processes.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
            return processes[:20]
        except Exception as e:
            self.logger.error(f"Error getting process info: {e}")
            return []
    
    def _get_usb_devices(self):
        """Get connected external USB devices"""
        usb_devices = []

        try:
            if self.is_linux:
                if os.path.exists('/usr/bin/lsusb'):
                    try:
                        result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=30)
                        if result.returncode == 0:
                            for line in result.stdout.split('\n'):
                                line = line.strip()
                                # Exclude root hubs and hubs
                                if line and not ('Hub' in line or 'root hub' in line.lower()):
                                    usb_devices.append({'description': line})
                    except Exception as e:
                        self.logger.error(f"Error running lsusb: {e}")

            elif self.is_windows:
                try:
                    cmd = [
                        "powershell",
                        "-Command",
                        (
                            "Get-PnpDevice -Class USB | "
                            "Where-Object { $_.FriendlyName -notmatch 'Root Hub|Host Controller' } | "
                            "Select-Object FriendlyName, InstanceId | ConvertTo-Json"
                        )
                    ]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                    if result.returncode == 0 and result.stdout:
                        devices = json.loads(result.stdout)
                        if isinstance(devices, dict):
                            devices = [devices]
                        for dev in devices:
                            desc = dev.get('FriendlyName', '').strip()
                            device_id = dev.get('InstanceId', '').strip()
                            if desc:
                                usb_devices.append({'description': desc, 'device_id': device_id})
                    else:
                        self.logger.error(f"PowerShell returned error: {result.stderr}")
                except Exception as e:
                    self.logger.error(f"Error getting USB devices with PowerShell: {e}")

            else:
                self.logger.info("USB device detection not implemented for this OS")

            return usb_devices

        except Exception as e:
            self.logger.error(f"Error getting USB devices: {e}")
            return []
    
    def _get_virtualization_info(self):
        """Detect if running in a virtual machine"""
        try:
            vm_info = {
                'is_virtual': False,
                'hypervisor': 'unknown',
                'detection_methods': []
            }
            
            # Check various VM detection methods
            if self.is_linux:
                # Check /proc/cpuinfo for hypervisor flag
                try:
                    with open('/proc/cpuinfo', 'r') as f:
                        content = f.read()
                        if 'hypervisor' in content:
                            vm_info['is_virtual'] = True
                            vm_info['detection_methods'].append('cpuinfo_hypervisor_flag')
                except Exception:
                    pass
                
                # Check DMI information
                try:
                    dmi_files = [
                        '/sys/class/dmi/id/sys_vendor',
                        '/sys/class/dmi/id/product_name',
                        '/sys/class/dmi/id/board_vendor'
                    ]
                    
                    for dmi_file in dmi_files:
                        if os.path.exists(dmi_file):
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
                    pass
            
            elif self.is_windows:
                try:
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
        except Exception as e:
            self.logger.error(f"Error detecting virtualization: {e}")
            return {'is_virtual': False, 'hypervisor': 'unknown', 'detection_methods': []}
    
    def _get_system_health(self):
        """Get system health and performance metrics"""
        try:
            return {
                'cpu_temperature': self._get_cpu_temperature(),
                'disk_health': self._get_disk_health_summary(),
                'memory_pressure': self._get_memory_pressure(),
                'system_load': self._get_system_load()
            }
        except Exception as e:
            self.logger.error(f"Error getting system health: {e}")
            return {}
           
            
    def _get_current_user(self):
        """Get the current logged-in user"""
        try:
            return getpass.getuser()
        except Exception as e:
            self.logger.warning(f"Failed to get current user: {e}")
            return "unknown"
             
             
    def _get_cpu_temperature(self):
        """Get CPU temperature if available"""
        try:
            if hasattr(psutil, 'sensors_temperatures'):
                temps = psutil.sensors_temperatures()
                if temps:
                    for name, entries in temps.items():
                        if 'cpu' in name.lower() or 'core' in name.lower():
                            return [{'label': entry.label, 'current': entry.current} for entry in entries]
            return None
        except Exception:
            return None
    
    def _get_disk_health_summary(self):
        """Get disk health summary"""
        try:
            # This is a simplified version; full SMART data is in storage section
            return {
                'status': 'healthy',  # Would need more sophisticated checking
                'note': 'Basic disk health check - see storage section for SMART data'
            }
        except Exception:
            return None
    
    def _get_memory_pressure(self):
        """Get memory pressure indicators"""
        try:
            memory = psutil.virtual_memory()
            return {
                'pressure_level': 'high' if memory.percent > 90 else 'medium' if memory.percent > 75 else 'low',
                'usage_percent': memory.percent
            }
        except Exception:
            return None
    
    def _get_system_load(self):
        """Get system load averages"""
        try:
            if hasattr(os, 'getloadavg'):
                load1, load5, load15 = os.getloadavg()
                return {
                    'load_1min': load1,
                    'load_5min': load5,
                    'load_15min': load15
                }
            return None
        except Exception:
            return None
    
    def _get_security_info(self):
        """Get firewall, antivirus, update check, and update mode info"""
        try:
            info = {}

            def _normalize_win_date(value):
                """Convert /Date(1750141848172)/ to readable date"""
                try:
                    if isinstance(value, str) and value.startswith("/Date("):
                        import re
                        import datetime
                        match = re.search(r"/Date\((\d+)\)/", value)
                        if match:
                            timestamp_ms = int(match.group(1))
                            dt = datetime.datetime.fromtimestamp(timestamp_ms / 1000)
                            return dt.strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass
                return value if value else "N/A"

            if platform.system().lower() == 'windows':
                # ✅ Firewall Status
                try:
                    result = subprocess.run(
                        ["powershell", "-Command", "Get-NetFirewallProfile | Select-Object -ExpandProperty Enabled"],
                        capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        info['firewall_status'] = "enabled" if "True" in result.stdout else "disabled"
                    else:
                        info['firewall_status'] = "unknown"
                except Exception:
                    info['firewall_status'] = "unknown"

                # ✅ Antivirus Status + Last Scan
                try:
                    ps_command = (
                        "Get-MpComputerStatus | "
                        "Select-Object -Property AMServiceEnabled,AntivirusEnabled,QuickScanStartTime,FullScanStartTime | ConvertTo-Json"
                    )
                    result = subprocess.run(["powershell", "-Command", ps_command],
                                            capture_output=True, text=True, timeout=10)
                    if result.returncode == 0 and result.stdout:
                        import json as js
                        status = js.loads(result.stdout.strip())
                        if isinstance(status, dict):
                            info['antivirus_status'] = "enabled" if status.get("AntivirusEnabled") else "disabled"
                            quick = _normalize_win_date(status.get('QuickScanStartTime'))
                            full = _normalize_win_date(status.get('FullScanStartTime'))
                            info['last_scan'] = f"{quick} / {full}"
                    else:
                        info['antivirus_status'] = "unknown"
                except Exception:
                    info['antivirus_status'] = "unknown"

                # ✅ Last Update Check (COM API fallback)
                try:
                    ps = "(New-Object -ComObject Microsoft.Update.AutoUpdate).Results.LastSearchSuccessDate"
                    result = subprocess.run(["powershell", "-Command", ps],
                                            capture_output=True, text=True, timeout=5)
                    if result.returncode == 0 and result.stdout.strip():
                        info["last_update_check"] = result.stdout.strip()
                    else:
                        info["last_update_check"] = "Unknown"
                except Exception:
                    info["last_update_check"] = "Unknown"

                # ✅ Automatic Updates Status (Policy + Fallback)
                try:
                    ps_policy = "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU' -ErrorAction SilentlyContinue).AUOptions"
                    result = subprocess.run(["powershell", "-Command", ps_policy],
                                            capture_output=True, text=True, timeout=5)

                    if not result.stdout.strip():
                        ps_default = "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update' -ErrorAction SilentlyContinue).AUOptions"
                        result = subprocess.run(["powershell", "-Command", ps_default],
                                                capture_output=True, text=True, timeout=5)

                    if result.returncode == 0 and result.stdout.strip().isdigit():
                        au = int(result.stdout.strip())
                        au_map = {
                            1: "Never check",
                            2: "Notify download/install",
                            3: "Auto-download / notify",
                            4: "Auto-download / schedule install",
                            5: "Local admin chooses"
                        }
                        info["automatic_updates"] = au_map.get(au, f"Unknown ({au})")
                    else:
                        info["automatic_updates"] = "Managed by policy or unknown"
                except Exception:
                    info["automatic_updates"] = "Managed by policy or unknown"

            return info

        except Exception as e:
            self.logger.error(f"Error collecting security info: {e}")
            return {}


    
    def _get_firewall_status(self):
        """Get firewall status"""
        try:
            if self.is_windows:
                result = subprocess.run([
                    'netsh', 'advfirewall', 'show', 'allprofiles', 'state'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    return 'enabled' if 'ON' in result.stdout else 'disabled'
            
            elif self.is_linux:
                # Check various Linux firewalls
                if os.path.exists('/usr/sbin/ufw'):
                    result = subprocess.run(['ufw', 'status'], capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        return 'enabled' if 'active' in result.stdout.lower() else 'disabled'
                
                elif os.path.exists('/usr/sbin/iptables'):
                    result = subprocess.run(['iptables', '-L'], capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        # Simple check for rules
                        return 'enabled' if len(result.stdout.split('\n')) > 10 else 'disabled'
            
            return 'unknown'
        except Exception:
            return 'unknown'
    
    def _get_antivirus_status(self):
        """Get antivirus status"""
        try:
            if self.is_windows:
                # Check Windows Defender status
                result = subprocess.run([
                    'powershell', '-Command', 'Get-MpComputerStatus | Select-Object AntivirusEnabled'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    return 'enabled' if 'True' in result.stdout else 'disabled'
            
            return 'unknown'
        except Exception:
            return 'unknown'
    
    def _get_last_security_scan(self):
        """Get last security scan information"""
        try:
            if self.is_windows:
                # Check Windows Defender last scan
                result = subprocess.run([
                    'powershell', '-Command', 'Get-MpComputerStatus | Select-Object QuickScanStartTime,FullScanStartTime'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    return result.stdout.strip()
            
            return 'unknown'
        except Exception:
            return 'unknown'
    
  
    def _get_filtered_tcp_ports(self):
        ignore_pattern = re.compile(r'^(chrome|msedge|brave|explorer|svchost|Idle|System|WindowsPackageManagerServer|msedgewebview2|ms-teams)$', re.IGNORECASE)
        result = []

        try:
            for conn in psutil.net_connections(kind='tcp'):
                if conn.status != psutil.CONN_ESTABLISHED:
                    continue
                if not conn.raddr:
                    continue

                try:
                    proc = psutil.Process(conn.pid)
                    pname = proc.name().lower()
                    if ignore_pattern.match(pname):
                        continue
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

                result.append({
                    "LocalPort": conn.laddr.port,
                    "RemotePort": conn.raddr.port
                })
        except Exception as e:
            self.logger.warning(f"Failed to get TCP ports: {e}")

        return result

   