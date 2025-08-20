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
import ipaddress
import threading
from concurrent.futures import ThreadPoolExecutor


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

        # Remove all tickets (simulated)
        self.logger.info("Simulating removal of all tickets from service desk.")
        # In a real scenario, this would involve API calls or database operations
        # Example: self.delete_all_tickets_api()

        # Remove all System Agents from Managed Systems and database (simulated)
        self.logger.info("Simulating removal of all System Agents from Managed Systems and database.")
        # In a real scenario, this would involve API calls or database operations
        # Example: self.delete_all_system_agents_api()


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
            'network_scan': self.scan_local_network()
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
        """Get comprehensive network information"""
        try:
            network_info = {
                'interfaces': [],
                'network_adapters': {},
                'public_ip': None,
                'dns_servers': [],
                'routing_table': [],
                'network_stats': {},
                'wifi_info': {},
                'all_ips': [],
                'hostname': platform.node(),
                'domain': None,
                'gateway': None,
                'io_counters': {}
            }

            # Get network interfaces with enhanced data
            try:
                net_if_addrs = psutil.net_if_addrs()
                net_if_stats = psutil.net_if_stats()
                net_io_counters = psutil.net_io_counters(pernic=True)
            except Exception as e:
                self.logger.error(f"Failed to get network interface data: {e}")
                net_if_addrs = {}
                net_if_stats = {}
                net_io_counters = {}

            for interface_name, interface_addresses in net_if_addrs.items():
                try:
                    interface_stats = net_if_stats.get(interface_name)
                    interface_io = net_io_counters.get(interface_name)

                    interface_data = {
                        'name': interface_name,
                        'type': 'Unknown',
                        'addresses': [],
                        'ip': None,
                        'mac': None,
                        'status': 'Down',
                        'speed': 0,
                        'mtu': 0,
                        'bytes_sent': 0,
                        'bytes_recv': 0,
                        'packets_sent': 0,
                        'packets_recv': 0
                    }

                    # Set interface stats safely
                    if interface_stats:
                        interface_data['status'] = 'Up' if interface_stats.isup else 'Down'
                        interface_data['speed'] = getattr(interface_stats, 'speed', 0)
                        interface_data['mtu'] = getattr(interface_stats, 'mtu', 0)

                    # Set interface I/O stats safely
                    if interface_io:
                        interface_data['bytes_sent'] = getattr(interface_io, 'bytes_sent', 0)
                        interface_data['bytes_recv'] = getattr(interface_io, 'bytes_recv', 0)
                        interface_data['packets_sent'] = getattr(interface_io, 'packets_sent', 0)
                        interface_data['packets_recv'] = getattr(interface_io, 'packets_recv', 0)

                # Determine interface type based on name
                    name_lower = interface_name.lower()
                    if 'wi-fi' in name_lower or 'wireless' in name_lower or 'wlan' in name_lower:
                        interface_data['type'] = 'Wi-Fi'
                    elif 'ethernet' in name_lower or 'eth' in name_lower or 'en' in name_lower:
                        interface_data['type'] = 'Ethernet'
                    elif 'loopback' in name_lower or 'lo' in name_lower:
                        interface_data['type'] = 'Loopback'
                    elif 'vpn' in name_lower or 'tap' in name_lower or 'tun' in name_lower:
                        interface_data['type'] = 'VPN'

                    # Process addresses safely
                    for addr in interface_addresses:
                        try:
                            addr_info = {
                                'family': str(getattr(addr, 'family', 'unknown')),
                                'address': getattr(addr, 'address', ''),
                                'netmask': getattr(addr, 'netmask', None),
                                'broadcast': getattr(addr, 'broadcast', None)
                            }
                            interface_data['addresses'].append(addr_info)

                            # Extract primary IP and MAC
                            if hasattr(addr, 'family') and addr.family == 2:  # IPv4
                                if not interface_data['ip'] and addr.address != '127.0.0.1':
                                    interface_data['ip'] = addr.address
                                    if addr.address not in network_info['all_ips']:
                                        network_info['all_ips'].append(addr.address)
                            elif (hasattr(addr, 'address') and addr.address and 
                                  ':' not in addr.address and len(addr.address) == 17):
                                interface_data['mac'] = addr.address
                        except Exception as e:
                            self.logger.debug(f"Error processing address for {interface_name}: {e}")
                            continue

                    network_info['interfaces'].append(interface_data)

                    # Add to network adapters with enhanced info
                    if interface_data['ip'] or interface_data['mac']:
                        network_info['network_adapters'][interface_name] = {
                            'type': interface_data['type'],
                            'ip_address': interface_data['ip'],
                            'mac_address': interface_data['mac'],
                            'status': interface_data['status'],
                            'speed': f"{interface_data['speed']} Mbps" if interface_data['speed'] > 0 else "Unknown",
                            'bytes_sent': self._format_bytes(interface_data['bytes_sent']),
                            'bytes_recv': self._format_bytes(interface_data['bytes_recv']),
                            'operational_status': interface_data['status']
                        }

                except Exception as e:
                    self.logger.debug(f"Error processing interface {interface_name}: {e}")
                    continue

                network_info['interfaces'].append(interface_data)

                # Add to network adapters with enhanced info
                if interface_data['ip'] or interface_data['mac']:
                    network_info['network_adapters'][interface_name] = {
                        'type': interface_data['type'],
                        'ip_address': interface_data['ip'],
                        'mac_address': interface_data['mac'],
                        'status': interface_data['status'],
                        'speed': f"{interface_data['speed']} Mbps" if interface_data['speed'] > 0 else "Unknown",
                        'bytes_sent': self._format_bytes(interface_data['bytes_sent']),
                        'bytes_recv': self._format_bytes(interface_data['bytes_recv']),
                        'operational_status': interface_data['status']
                    }

            # Get default gateway
            try:
                import subprocess
                if platform.system() == "Windows":
                    result = subprocess.run(['route', 'print', '0.0.0.0'], 
                                          capture_output=True, text=True, timeout=10)
                    for line in result.stdout.split('\n'):
                        if '0.0.0.0' in line and 'Gateway' not in line:
                            parts = line.split()
                            if len(parts) >= 3:
                                network_info['gateway'] = parts[2]
                                break
                else:  # Linux/Mac
                    result = subprocess.run(['ip', 'route', 'show', 'default'], 
                                          capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        for line in result.stdout.split('\n'):
                            if 'default via' in line:
                                parts = line.split()
                                if len(parts) >= 3:
                                    network_info['gateway'] = parts[2]
                                    break
            except:
                pass

            # Enhanced public IP and geolocation collection
            try:
                import requests

                # Get public IP with multiple fallback services
                public_ip = None
                ip_services = [
                    'https://api.ipify.org?format=json',
                    'https://httpbin.org/ip',
                    'https://api.myip.com',
                    'https://ipapi.co/json/',
                    'https://api.ip.sb/jsonip'
                ]

                for url in ip_services:
                    try:
                        response = requests.get(url, timeout=10)
                        if response.status_code == 200:
                            data = response.json()
                            public_ip = data.get('ip') or data.get('origin') or data.get('query')
                            if public_ip:
                                network_info['public_ip'] = public_ip
                                break
                    except Exception as e:
                        self.logger.debug(f"Failed to get IP from {url}: {e}")
                        continue

                # Get enhanced geolocation data
                if public_ip:
                    geo_services = [
                        f'https://ipapi.co/{public_ip}/json/',
                        f'https://api.ipgeolocation.io/ipgeo?apiKey=free&ip={public_ip}',
                        f'http://ip-api.com/json/{public_ip}',
                        f'https://ipinfo.io/{public_ip}/json'
                    ]

                    for geo_url in geo_services:
                        try:
                            geo_response = requests.get(geo_url, timeout=10)
                            if geo_response.status_code == 200:
                                geo_data = geo_response.json()

                                # Extract location information
                                location_parts = []
                                city = geo_data.get('city') or geo_data.get('cityName')
                                region = geo_data.get('region') or geo_data.get('region_name') or geo_data.get('stateProv')
                                country = geo_data.get('country') or geo_data.get('country_name') or geo_data.get('countryName')

                                if city:
                                    location_parts.append(city)
                                if region and region != city:
                                    location_parts.append(region)
                                if country:
                                    location_parts.append(country)

                                if location_parts:
                                    network_info['location'] = ', '.join(location_parts)
                                    network_info['geo_location'] = ', '.join(location_parts)

                                # Additional geo data
                                network_info['isp'] = geo_data.get('isp') or geo_data.get('org') or geo_data.get('as')
                                network_info['timezone'] = geo_data.get('timezone') or geo_data.get('timeZone')
                                network_info['coordinates'] = f"{geo_data.get('lat', geo_data.get('latitude', ''))},{geo_data.get('lon', geo_data.get('longitude', ''))}" if geo_data.get('lat') or geo_data.get('latitude') else None

                                # Store detailed geo data for reporting
                                network_info['geo_details'] = {
                                    'city': city,
                                    'region': region,
                                    'country': country,
                                    'country_code': geo_data.get('country_code') or geo_data.get('countryCode'),
                                    'postal_code': geo_data.get('postal') or geo_data.get('zip'),
                                    'latitude': geo_data.get('lat') or geo_data.get('latitude'),
                                    'longitude': geo_data.get('lon') or geo_data.get('longitude'),
                                    'isp': geo_data.get('isp') or geo_data.get('org'),
                                    'timezone': geo_data.get('timezone') or geo_data.get('timeZone')
                                }

                                self.logger.info(f"Successfully collected geolocation: {network_info.get('location')}")
                                break

                        except Exception as e:
                            self.logger.debug(f"Failed to get geolocation from {geo_url}: {e}")
                            continue

                # Fallback location if geo services fail
                if not network_info.get('location') and public_ip:
                    network_info['location'] = f"IP: {public_ip} (Location lookup failed)"

            except Exception as e:
                self.logger.warning(f"Error collecting public IP and geolocation: {e}")
                network_info['public_ip'] = "Unable to determine"
                network_info['location'] = "Location detection failed"

            # Get DNS servers with enhanced detection
            try:
                if platform.system() == "Windows":
                    import subprocess
                    result = subprocess.run(['nslookup', 'google.com'], 
                                          capture_output=True, text=True, timeout=10)
                    lines = result.stdout.split('\n')
                    for line in lines:
                        if 'Server:' in line:
                            dns_ip = line.split(':')[-1].strip()
                            if dns_ip and dns_ip not in network_info['dns_servers']:
                                network_info['dns_servers'].append(dns_ip)
                        elif line.strip() and '.' in line and 'Address:' in line:
                            dns_ip = line.split(':')[-1].strip()
                            if dns_ip and dns_ip not in network_info['dns_servers']:
                                network_info['dns_servers'].append(dns_ip)
                else:  # Linux/Mac
                    try:
                        with open('/etc/resolv.conf', 'r') as f:
                            for line in f:
                                if line.startswith('nameserver'):
                                    dns_ip = line.split()[1]
                                    if dns_ip not in network_info['dns_servers']:
                                        network_info['dns_servers'].append(dns_ip)
                    except:
                        pass

                    # Also try systemd-resolve
                    try:
                        import subprocess
                        result = subprocess.run(['systemd-resolve', '--status'], 
                                              capture_output=True, text=True, timeout=10)
                        for line in result.stdout.split('\n'):
                            if 'DNS Servers:' in line:
                                dns_ip = line.split(':')[-1].strip()
                                if dns_ip and dns_ip not in network_info['dns_servers']:
                                    network_info['dns_servers'].append(dns_ip)
                    except:
                        pass
            except Exception as e:
                self.logger.debug(f"DNS detection error: {e}")

            # Get Wi-Fi information
            try:
                if platform.system() == "Windows":
                    import subprocess
                    result = subprocess.run(['netsh', 'wlan', 'show', 'profiles'], 
                                          capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        connected_result = subprocess.run(['netsh', 'wlan', 'show', 'interfaces'], 
                                                        capture_output=True, text=True, timeout=10)
                        if 'connected' in connected_result.stdout.lower():
                            network_info['wifi_info'] = {
                                'connected': True,
                                'status': 'connected'
                            }
                            # Extract SSID if available
                            for line in connected_result.stdout.split('\n'):
                                if 'SSID' in line and ':' in line:
                                    network_info['wifi_info']['ssid'] = line.split(':')[-1].strip()
                                    break
                        else:
                            network_info['wifi_info'] = {'connected': False, 'status': 'disconnected'}
                else:  # Linux
                    try:
                        import subprocess
                        result = subprocess.run(['iwconfig'], capture_output=True, text=True, timeout=10)
                        if 'ESSID:' in result.stdout:
                            network_info['wifi_info'] = {'connected': True, 'status': 'connected'}
                            # Extract SSID
                            for line in result.stdout.split('\n'):
                                if 'ESSID:' in line:
                                    ssid = line.split('ESSID:')[-1].split()[0].strip('"')
                                    if ssid != 'off/any':
                                        network_info['wifi_info']['ssid'] = ssid
                                    break
                        else:
                            network_info['wifi_info'] = {'connected': False, 'status': 'disconnected'}
                    except:
                        network_info['wifi_info'] = {'connected': False, 'status': 'unknown'}
            except:
                network_info['wifi_info'] = {'connected': False, 'status': 'unknown'}

            # Get network statistics
            try:
                net_io = psutil.net_io_counters()
                network_info['network_stats'] = {
                    'bytes_sent': self._format_bytes(net_io.bytes_sent),
                    'bytes_recv': self._format_bytes(net_io.bytes_recv),
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv,
                    'errin': net_io.errin,
                    'errout': net_io.errout,
                    'dropin': net_io.dropin,
                    'dropout': net_io.dropout
                }

                # Also store raw I/O counters for metrics extraction
                network_info['io_counters'] = {
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv,
                    'errin': net_io.errin,
                    'errout': net_io.errout,
                    'dropin': net_io.dropin,
                    'dropout': net_io.dropout
                }
            except Exception as e:
                self.logger.debug(f"Network stats error: {e}")
                network_info['io_counters'] = {}

            # Try to get domain information
            try:
                import socket
                fqdn = socket.getfqdn()
                if '.' in fqdn:
                    network_info['domain'] = fqdn.split('.', 1)[1]
            except:
                pass

            # Log collected network info for debugging
            self.logger.info(f"Collected {len(network_info['interfaces'])} network interfaces")
            self.logger.info(f"Public IP: {network_info.get('public_ip', 'Not collected')}")
            self.logger.info(f"All IPs: {network_info.get('all_ips', [])}")

            return network_info

        except Exception as e:
            self.logger.error(f"Error getting network info: {e}")
            # Return basic structure even on error
            return {
                'interfaces': [],
                'network_adapters': {},
                'public_ip': "Error collecting",
                'dns_servers': [],
                'network_stats': {},
                'wifi_info': {},
                'all_ips': [],
                'hostname': platform.node(),
                'domain': None,
                'gateway': None,
                'io_counters': {},
                'error': str(e)
            }

    def _format_bytes(self, bytes_value):
        """Format bytes to human readable format"""
        try:
            for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                if bytes_value < 1024.0:
                    return f"{bytes_value:.1f} {unit}"
                bytes_value /= 1024.0
            return f"{bytes_value:.1f} PB"
        except:
            return "0 B"

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

    def scan_local_network(self):
        """Scan local network for active devices - Enhanced version"""
        try:
            network_devices = []
            scan_start_time = datetime.now()

            # Get local IP and network
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)

            self.logger.info(f"Starting enhanced network scan from {local_ip}")

            # Enhanced device discovery with multiple methods
            network_devices.extend(self._scan_arp_table())
            network_devices.extend(self._scan_dhcp_clients())
            network_devices.extend(self._scan_active_connections())

            # Get network interface info
            for interface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                        try:
                            # Ensure netmask is valid for ipaddress module
                            netmask = addr.netmask if addr.netmask else '255.255.255.255'
                            network = ipaddress.IPv4Network(f"{addr.address}/{netmask}", strict=False)
                            scan_result = self._scan_network_range(str(network))
                            network_devices.extend(scan_result)
                        except Exception as e:
                            self.logger.error(f"Error scanning network {addr.address} with netmask {addr.netmask}: {e}")
                            continue
                        break # Process only the first IPv4 address for this interface

            # Deduplicate devices by IP
            unique_devices = {}
            for device in network_devices:
                ip = device.get('ip')
                if ip and ip not in unique_devices:
                    unique_devices[ip] = device
                elif ip in unique_devices:
                    # Merge device information
                    existing = unique_devices[ip]
                    for key, value in device.items():
                        if key not in existing or not existing[key]:
                            existing[key] = value

            scan_duration = (datetime.now() - scan_start_time).total_seconds()

            return {
                'local_ip': local_ip,
                'hostname': hostname,
                'discovered_devices': list(unique_devices.values()),
                'scan_time': scan_start_time.isoformat(),
                'scan_duration_seconds': scan_duration,
                'total_devices_found': len(unique_devices),
                'scan_methods_used': ['ping_sweep', 'arp_table', 'dhcp_clients', 'active_connections'],
                'network_topology': self._analyze_network_topology(list(unique_devices.values()))
            }
        except Exception as e:
            self.logger.error(f"Network scan failed: {str(e)}")
            return {
                'error': f"Network scan failed: {str(e)}",
                'scan_time': datetime.now().isoformat()
            }

    def _scan_network_range(self, network_range, max_workers=50):
        """Scan a network range for active devices"""
        active_devices = []
        try:
            network = ipaddress.ip_network(network_range, strict=False)
        except ValueError as e:
            self.logger.error(f"Invalid network range '{network_range}': {e}")
            return []

        def ping_host(ip):
            try:
                # Try to connect to common ports to detect device
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.5)

                # Try connecting to port 135 (Windows RPC)
                result = sock.connect_ex((ip, 135))
                sock.close()

                if result == 0:
                    return {
                        'ip': ip,
                        'status': 'online',
                        'response_time': 1,
                        'detected_ports': [135]
                    }

                # Try ping if port connection fails
                if platform.system().lower() == 'windows':
                    ping_cmd = f'ping -n 1 -w 1000 {ip}'
                else:
                    ping_cmd = f'ping -c 1 -W 1 {ip}'

                result = subprocess.run(ping_cmd, shell=True, capture_output=True, text=True, timeout=2)
                if result.returncode == 0:
                    return {
                        'ip': ip,
                        'status': 'online',
                        'response_time': 1,
                        'detected_ports': []
                    }

            except Exception:
                pass

            return None

        # Scan network range with threading for performance
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            for ip in network.hosts():
                if len(futures) >= 254:  # Limit to avoid overwhelming
                    break
                futures.append(executor.submit(ping_host, str(ip)))

            for future in as_completed(futures):
                result = future.result()
                if result:
                    active_devices.append(result)

        return {
            'subnet': network_range,
            'total_scanned': len(futures),
            'active_devices': active_devices,
            'scan_completed_at': datetime.now().isoformat()
        }

    def _scan_common_ports(self, ip, timeout=0.5): # Reduced timeout for faster scanning
        """Scan common ports on a host"""
        common_ports = [22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 5900]
        open_ports = []

        for port in common_ports:
            sock = None # Initialize sock to None
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                result = sock.connect_ex((ip, port))
                if result == 0:
                    open_ports.append({
                        'port': port,
                        'service': self._get_service_name(port)
                    })
            except socket.timeout:
                # Port is closed or filtered
                pass
            except Exception as e:
                self.logger.debug(f"Error scanning port {port} on {ip}: {e}")
            finally:
                if sock: # Ensure sock is closed only if it was successfully created
                    sock.close()

        return open_ports

    def _get_service_name(self, port):
        """Get common service name for port"""
        services = {
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            80: 'HTTP',
            110: 'POP3',
            143: 'IMAP',
            443: 'HTTPS',
            993: 'IMAPS',
            995: 'POP3S',
            3389: 'RDP',
            5900: 'VNC'
        }
        return services.get(port, f'Port {port}')

    def _scan_arp_table(self):
        """Scan ARP table for known devices"""
        devices = []
        try:
            if platform.system().lower() == 'windows':
                result = subprocess.run(['arp', '-a'], capture_output=True, text=True, timeout=10)
            else:
                result = subprocess.run(['arp', '-a'], capture_output=True, text=True, timeout=10)

            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if '(' in line and ')' in line:  # Windows format
                        parts = line.split()
                        if len(parts) >= 3:
                            ip = parts[0].strip('()')
                            mac = parts[1] if len(parts) > 1 else 'Unknown'
                            devices.append({
                                'ip': ip,
                                'mac_address': mac,
                                'source': 'arp_table',
                                'status': 'known'
                            })
                    elif '.' in line and ':' in line:  # Linux format
                        parts = line.split()
                        if len(parts) >= 4:
                            ip = parts[0]
                            mac = parts[2] if len(parts) > 2 else 'Unknown'
                            devices.append({
                                'ip': ip,
                                'mac_address': mac,
                                'source': 'arp_table',
                                'status': 'known'
                            })
        except Exception as e:
            self.logger.debug(f"ARP table scan failed: {e}")

        return devices

    def _scan_dhcp_clients(self):
        """Attempt to scan DHCP client list (limited without admin access)"""
        devices = []
        try:
            # This is limited without router access, but we can try netstat
            if platform.system().lower() == 'windows':
                result = subprocess.run(['netstat', ' -rn'], capture_output=True, text=True, timeout=10)
            else:
                result = subprocess.run(['netstat', '-rn'], capture_output=True, text=True, timeout=10)

            # Extract gateway and network info for enhanced discovery
            # This is mainly for logging network topology

        except Exception as e:
            self.logger.debug(f"DHCP client scan failed: {e}")

        return devices

    def _scan_active_connections(self):
        """Scan for devices with active network connections"""
        devices = []
        try:
            connections = psutil.net_connections(kind='inet')
            remote_ips = set()

            for conn in connections:
                if conn.raddr and conn.status == 'ESTABLISHED':
                    remote_ip = conn.raddr.ip
                    if not remote_ip.startswith('127.') and not remote_ip.startswith('169.254.'):
                        remote_ips.add(remote_ip)

            for ip in remote_ips:
                devices.append({
                    'ip': ip,
                    'source': 'active_connections',
                    'status': 'connected',
                    'connection_type': 'established'
                })

        except Exception as e:
            self.logger.debug(f"Active connections scan failed: {e}")

        return devices

    def _analyze_network_topology(self, devices):
        """Analyze network topology from discovered devices"""
        try:
            topology = {
                'total_devices': len(devices),
                'device_types': {},
                'network_segments': [],
                'security_analysis': {
                    'open_services': [],
                    'potential_vulnerabilities': []
                }
            }

            # Analyze device types by open ports
            for device in devices:
                open_ports = device.get('open_ports', [])
                device_type = 'unknown'

                port_numbers = [p.get('port', 0) for p in open_ports]

                if 22 in port_numbers:
                    device_type = 'linux_server'
                elif 3389 in port_numbers:
                    device_type = 'windows_server'
                elif 80 in port_numbers or 443 in port_numbers:
                    device_type = 'web_server'
                elif 53 in port_numbers:
                    device_type = 'dns_server'

                topology['device_types'][device_type] = topology['device_types'].get(device_type, 0) + 1

                # Security analysis
                for port_info in open_ports:
                    port = port_info.get('port')
                    if port in [23, 21, 139, 445]:  # Potentially insecure services
                        topology['security_analysis']['potential_vulnerabilities'].append({
                            'device_ip': device.get('ip'),
                            'port': port,
                            'service': port_info.get('service'),
                            'risk_level': 'medium'
                        })

            return topology

        except Exception as e:
            self.logger.debug(f"Network topology analysis failed: {e}")
            return {'error': str(e)}