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
import shutil

# Import OS-specific collectors
from windows_collector import WindowsCollector
from linux_collector import LinuxCollector
from macos_collector import MacOSCollector


class SystemCollector:
    """Main system information collector that delegates to OS-specific collectors"""

    def __init__(self):
        self.logger = logging.getLogger('SystemCollector')
        self.is_windows = platform.system().lower() == 'windows'
        self.is_linux = platform.system().lower() == 'linux'
        self.is_macos = platform.system().lower() == 'darwin'

        # Initialize OS-specific collector
        if self.is_windows:
            self.os_collector = WindowsCollector()
        elif self.is_linux:
            self.os_collector = LinuxCollector()
        elif self.is_macos:
            self.os_collector = MacOSCollector()
        else:
            self.os_collector = None
            self.logger.warning(f"Unsupported OS: {platform.system()}")

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
            'windows_updates': self._get_windows_updates() if self.is_windows else None,
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
            # Get base OS info
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

            # Get OS-specific information
            if self.os_collector:
                os_specific_info = self.os_collector.get_os_info()
                info.update(os_specific_info)

            return info
        except Exception as e:
            self.logger.error(f"Error getting OS info: {e}")
            return {}

    def _get_network_info(self):
        """Get network interface information"""
        try:
            import socket
            interfaces = []

            # Get public IP
            public_ip = self._get_public_ip()

            # List of keywords to filter out virtual adapters by name
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
                'system': {}
            }

            # Get OS-specific hardware information
            if self.os_collector:
                os_specific_hw = self.os_collector.get_hardware_info()
                info['system'].update(os_specific_hw)

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

            smart_data = []
            if self.is_linux and hasattr(self.os_collector, 'get_smart_data'):
                smart_data = self.os_collector.get_smart_data()

            return {
                'disks': disks,
                'smart_data': smart_data
            }
        except Exception as e:
            self.logger.error(f"Error getting storage info: {e}", exc_info=True)
            return {'disks': [], 'smart_data': []}

    def _get_software_info(self):
        """Get installed software information"""
        try:
            if self.os_collector:
                return self.os_collector.get_software_info()
            return []
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
        try:
            if self.os_collector:
                return self.os_collector.get_usb_devices()
            return []
        except Exception as e:
            self.logger.error(f"Error getting USB devices: {e}")
            return []

    def _get_virtualization_info(self):
        """Detect if running in a virtual machine"""
        try:
            if self.os_collector:
                return self.os_collector.get_virtualization_info()
            return {'is_virtual': False, 'hypervisor': 'unknown', 'detection_methods': []}
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
        """Get the current logged-in user - prefer actual logged in user over service account"""
        try:
            # First try to get the actual logged-in user (not service accounts)
            if self.is_linux:
                try:
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

                    # Fallback: check for users with home directories in /home
                    if os.path.exists('/home'):
                        home_users = [d for d in os.listdir('/home') 
                                    if os.path.isdir(os.path.join('/home', d)) 
                                    and not d.startswith('.')]
                        if home_users:
                            # Return the first regular user
                            return home_users[0]

                except Exception as e:
                    self.logger.debug(f"Failed to get logged-in user: {e}")

            # Fallback to current process user
            current_user = getpass.getuser()

            # If running as root, try to find the actual user
            if current_user == 'root' and self.is_linux:
                try:
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
        """Get security information"""
        try:
            if self.os_collector:
                return self.os_collector.get_security_info()
            return {}
        except Exception as e:
            self.logger.error(f"Error collecting security info: {e}")
            return {}

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

    def _get_windows_updates(self):
        """Get Windows Update information"""
        try:
            if not self.is_windows:
                return None

            update_info = {
                'available_updates': [],
                'installed_updates': [],
                'last_search_date': None,
                'automatic_updates_enabled': False
            }

            # Get available updates using Windows Update API
            try:
                ps_command = '''
                $UpdateSession = New-Object -ComObject Microsoft.Update.Session
                $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
                $SearchResult = $UpdateSearcher.Search("IsInstalled=0 and Type='Software'")
                
                $Updates = @()
                foreach ($Update in $SearchResult.Updates) {
                    $Updates += @{
                        Title = $Update.Title
                        Description = $Update.Description
                        KBArticleIDs = $Update.KBArticleIDs -join ","
                        Severity = if ($Update.MsrcSeverity) { $Update.MsrcSeverity } else { "Unknown" }
                        Size = $Update.MaxDownloadSize
                        IsDownloaded = $Update.IsDownloaded
                        RebootRequired = $Update.RebootRequired
                    }
                }
                
                $Updates | ConvertTo-Json -Depth 3
                '''
                
                result = subprocess.run(["powershell", "-Command", ps_command], 
                                      capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0 and result.stdout.strip():
                    try:
                        available_updates = json.loads(result.stdout.strip())
                        if isinstance(available_updates, dict):
                            available_updates = [available_updates]
                        update_info['available_updates'] = available_updates or []
                    except json.JSONDecodeError:
                        pass
                        
            except Exception as e:
                self.logger.warning(f"Failed to get available Windows updates: {e}")

            # Get installed updates history
            try:
                ps_command = '''
                $UpdateSession = New-Object -ComObject Microsoft.Update.Session
                $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
                $HistoryCount = $UpdateSearcher.GetTotalHistoryCount()
                $UpdateHistory = $UpdateSearcher.QueryHistory(0, [Math]::Min($HistoryCount, 50))
                
                $InstalledUpdates = @()
                foreach ($Update in $UpdateHistory) {
                    if ($Update.ResultCode -eq 2) {  # Successfully installed
                        $InstalledUpdates += @{
                            Title = $Update.Title
                            Date = $Update.Date.ToString("yyyy-MM-dd HH:mm:ss")
                            ResultCode = $Update.ResultCode
                            ClientApplicationID = $Update.ClientApplicationID
                        }
                    }
                }
                
                $InstalledUpdates | ConvertTo-Json -Depth 3
                '''
                
                result = subprocess.run(["powershell", "-Command", ps_command], 
                                      capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0 and result.stdout.strip():
                    try:
                        installed_updates = json.loads(result.stdout.strip())
                        if isinstance(installed_updates, dict):
                            installed_updates = [installed_updates]
                        update_info['installed_updates'] = installed_updates or []
                    except json.JSONDecodeError:
                        pass
                        
            except Exception as e:
                self.logger.warning(f"Failed to get installed Windows updates: {e}")

            # Get last search date
            try:
                ps_command = '''
                $UpdateSession = New-Object -ComObject Microsoft.Update.Session
                $AutoUpdate = New-Object -ComObject Microsoft.Update.AutoUpdate
                $AutoUpdate.Results.LastSearchSuccessDate.ToString("yyyy-MM-dd HH:mm:ss")
                '''
                
                result = subprocess.run(["powershell", "-Command", ps_command], 
                                      capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0 and result.stdout.strip():
                    update_info['last_search_date'] = result.stdout.strip()
                    
            except Exception as e:
                self.logger.warning(f"Failed to get last search date: {e}")

            # Check automatic updates status
            try:
                ps_command = '''
                $AUSettings = (New-Object -ComObject Microsoft.Update.AutoUpdate).Settings
                $AUSettings.NotificationLevel -ne 1
                '''
                
                result = subprocess.run(["powershell", "-Command", ps_command], 
                                      capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    update_info['automatic_updates_enabled'] = "True" in result.stdout
                    
            except Exception as e:
                self.logger.warning(f"Failed to check automatic updates: {e}")

            return update_info
            
        except Exception as e:
            self.logger.error(f"Error getting Windows updates: {e}")
            return None