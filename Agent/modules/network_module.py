
"""
Network Information Collection Module
Collects network-related system information
"""

import socket
import platform
import psutil
import subprocess
from typing import Dict, Any, List
from .base_module import BaseModule


class NetworkModule(BaseModule):
    """Network information collection module"""
    
    def __init__(self):
        super().__init__('Network')
        self.is_windows = platform.system().lower() == 'windows'
        self.is_linux = platform.system().lower() == 'linux'
    
    def collect(self) -> Dict[str, Any]:
        """Collect network information"""
        network_info = {
            'hostname': self._get_hostname(),
            'interfaces': self._get_network_interfaces(),
            'public_ip': self._get_public_ip(),
            'dns_servers': self._get_dns_servers(),
            'gateway': self._get_default_gateway(),
            'io_counters': self._get_network_io_counters(),
            'wifi_info': self._get_wifi_info(),
            'geolocation': self._get_geolocation()
        }
        
        return network_info
    
    def _get_hostname(self) -> str:
        """Get system hostname"""
        try:
            return socket.gethostname()
        except Exception as e:
            self.logger.error(f"Error getting hostname: {e}")
            return "unknown"
    
    def _get_network_interfaces(self) -> List[Dict[str, Any]]:
        """Get network interface information"""
        interfaces = []
        
        try:
            net_if_addrs = psutil.net_if_addrs()
            net_if_stats = psutil.net_if_stats()
            net_io_counters = psutil.net_io_counters(pernic=True)
        except Exception as e:
            self.logger.error(f"Failed to get network interface data: {e}")
            return interfaces
        
        # Filter out virtual adapters
        virtual_keywords = ['vEthernet', 'VMware', 'Virtual', 'Loopback', 'Hyper-V']
        
        for interface_name, addresses in net_if_addrs.items():
            # Skip virtual adapters by name
            if any(keyword.lower() in interface_name.lower() for keyword in virtual_keywords):
                continue
            
            interface_info = self._get_interface_info(
                interface_name, addresses, net_if_stats, net_io_counters
            )
            
            if interface_info:
                interfaces.append(interface_info)
        
        return interfaces
    
    def _get_interface_info(self, name: str, addresses, stats_dict, io_dict) -> Dict[str, Any]:
        """Get information for a single network interface"""
        interface_info = {
            'name': name,
            'type': self._determine_interface_type(name),
            'addresses': [],
            'ip': None,
            'mac': None,
            'status': 'down',
            'speed': 0,
            'mtu': 0,
            'bytes_sent': 0,
            'bytes_recv': 0,
            'packets_sent': 0,
            'packets_recv': 0
        }
        
        # Get interface statistics
        if name in stats_dict:
            stats = stats_dict[name]
            interface_info['status'] = 'up' if stats.isup else 'down'
            interface_info['speed'] = getattr(stats, 'speed', 0)
            interface_info['mtu'] = getattr(stats, 'mtu', 0)
            
            # Skip interfaces that are down
            if not stats.isup:
                return None
        
        # Get I/O counters
        if name in io_dict:
            io = io_dict[name]
            interface_info['bytes_sent'] = getattr(io, 'bytes_sent', 0)
            interface_info['bytes_recv'] = getattr(io, 'bytes_recv', 0)
            interface_info['packets_sent'] = getattr(io, 'packets_sent', 0)
            interface_info['packets_recv'] = getattr(io, 'packets_recv', 0)
        
        # Process addresses
        for addr in addresses:
            try:
                addr_info = {
                    'family': str(getattr(addr, 'family', 'unknown')),
                    'address': getattr(addr, 'address', ''),
                    'netmask': getattr(addr, 'netmask', None),
                    'broadcast': getattr(addr, 'broadcast', None)
                }
                interface_info['addresses'].append(addr_info)
                
                # Extract primary IP and MAC
                if hasattr(addr, 'family') and addr.family == 2:  # IPv4
                    if not interface_info['ip'] and addr.address != '127.0.0.1':
                        interface_info['ip'] = addr.address
                elif (hasattr(addr, 'address') and addr.address and
                      ':' not in addr.address and len(addr.address) == 17):
                    interface_info['mac'] = addr.address
            except Exception as e:
                self.logger.debug(f"Error processing address for {name}: {e}")
                continue
        
        return interface_info
    
    def _determine_interface_type(self, name: str) -> str:
        """Determine interface type based on name"""
        name_lower = name.lower()
        if 'wi-fi' in name_lower or 'wireless' in name_lower or 'wlan' in name_lower:
            return 'Wi-Fi'
        elif 'ethernet' in name_lower or 'eth' in name_lower or 'en' in name_lower:
            return 'Ethernet'
        elif 'loopback' in name_lower or 'lo' in name_lower:
            return 'Loopback'
        elif 'vpn' in name_lower or 'tap' in name_lower or 'tun' in name_lower:
            return 'VPN'
        else:
            return 'Unknown'
    
    def _get_public_ip(self) -> str:
        """Get public IP address"""
        try:
            import requests
            
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
                except Exception as e:
                    self.logger.debug(f"Failed to get IP from {service}: {e}")
                    continue
        except ImportError:
            self.logger.debug("requests module not available for public IP lookup")
        except Exception as e:
            self.logger.debug(f"Error getting public IP: {e}")
        
        return "unknown"
    
    def _get_dns_servers(self) -> List[str]:
        """Get DNS servers"""
        dns_servers = []
        
        try:
            if self.is_windows:
                dns_servers = self._get_windows_dns_servers()
            elif self.is_linux:
                dns_servers = self._get_linux_dns_servers()
        except Exception as e:
            self.logger.debug(f"Error getting DNS servers: {e}")
        
        return dns_servers
    
    def _get_windows_dns_servers(self) -> List[str]:
        """Get DNS servers on Windows"""
        dns_servers = []
        try:
            result = subprocess.run(['nslookup', 'google.com'],
                                  capture_output=True, text=True, timeout=10)
            lines = result.stdout.split('\n')
            for line in lines:
                if 'Server:' in line:
                    dns_ip = line.split(':')[-1].strip()
                    if dns_ip and dns_ip not in dns_servers:
                        dns_servers.append(dns_ip)
        except Exception:
            pass
        return dns_servers
    
    def _get_linux_dns_servers(self) -> List[str]:
        """Get DNS servers on Linux"""
        dns_servers = []
        try:
            with open('/etc/resolv.conf', 'r') as f:
                for line in f:
                    if line.startswith('nameserver'):
                        dns_ip = line.split()[1]
                        if dns_ip not in dns_servers:
                            dns_servers.append(dns_ip)
        except Exception:
            pass
        return dns_servers
    
    def _get_default_gateway(self) -> str:
        """Get default gateway"""
        try:
            if self.is_windows:
                return self._get_windows_gateway()
            elif self.is_linux:
                return self._get_linux_gateway()
        except Exception as e:
            self.logger.debug(f"Could not determine default gateway: {e}")
        
        return None
    
    def _get_windows_gateway(self) -> str:
        """Get default gateway on Windows"""
        try:
            result = subprocess.run(['route', 'print', '0.0.0.0'],
                                  capture_output=True, text=True, timeout=10)
            for line in result.stdout.split('\n'):
                if '0.0.0.0' in line and 'Gateway' not in line:
                    parts = line.split()
                    if len(parts) >= 3:
                        return parts[2]
        except Exception:
            pass
        return None
    
    def _get_linux_gateway(self) -> str:
        """Get default gateway on Linux"""
        try:
            result = subprocess.run(['ip', 'route', 'show', 'default'],
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'default via' in line:
                        parts = line.split()
                        if len(parts) >= 3:
                            return parts[2]
        except Exception:
            pass
        return None
    
    def _get_network_io_counters(self) -> Dict[str, Any]:
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
        except Exception as e:
            self.logger.error(f"Error getting network I/O counters: {e}")
            return {}
    
    def _get_wifi_info(self) -> Dict[str, Any]:
        """Get Wi-Fi information"""
        wifi_info = {'connected': False, 'status': 'unknown'}
        
        try:
            if self.is_windows:
                wifi_info = self._get_windows_wifi_info()
            elif self.is_linux:
                wifi_info = self._get_linux_wifi_info()
        except Exception as e:
            self.logger.debug(f"Error getting Wi-Fi info: {e}")
        
        return wifi_info
    
    def _get_windows_wifi_info(self) -> Dict[str, Any]:
        """Get Wi-Fi information on Windows"""
        try:
            result = subprocess.run(['netsh', 'wlan', 'show', 'interfaces'],
                                  capture_output=True, text=True, timeout=10)
            if 'connected' in result.stdout.lower():
                wifi_info = {'connected': True, 'status': 'connected'}
                # Extract SSID if available
                for line in result.stdout.split('\n'):
                    if 'SSID' in line and ':' in line:
                        wifi_info['ssid'] = line.split(':')[-1].strip()
                        break
                return wifi_info
            else:
                return {'connected': False, 'status': 'disconnected'}
        except Exception:
            return {'connected': False, 'status': 'unknown'}
    
    def _get_linux_wifi_info(self) -> Dict[str, Any]:
        """Get Wi-Fi information on Linux"""
        try:
            result = subprocess.run(['iwconfig'], capture_output=True, text=True, timeout=10)
            if 'ESSID:' in result.stdout:
                wifi_info = {'connected': True, 'status': 'connected'}
                # Extract SSID
                for line in result.stdout.split('\n'):
                    if 'ESSID:' in line:
                        ssid = line.split('ESSID:')[-1].split()[0].strip('"')
                        if ssid != 'off/any':
                            wifi_info['ssid'] = ssid
                        break
                return wifi_info
            else:
                return {'connected': False, 'status': 'disconnected'}
        except Exception:
            return {'connected': False, 'status': 'unknown'}
    
    def _get_geolocation(self) -> Dict[str, Any]:
        """Get geolocation information based on public IP"""
        try:
            import requests
            
            public_ip = self._get_public_ip()
            if public_ip == "unknown":
                return {'location': 'Unknown', 'error': 'Could not determine public IP'}
            
            geo_services = [
                f'https://ipapi.co/{public_ip}/json/',
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
                        
                        return {
                            'location': ', '.join(location_parts) if location_parts else 'Unknown',
                            'isp': geo_data.get('isp') or geo_data.get('org') or geo_data.get('as'),
                            'timezone': geo_data.get('timezone') or geo_data.get('timeZone'),
                            'coordinates': f"{geo_data.get('lat', geo_data.get('latitude', ''))},{geo_data.get('lon', geo_data.get('longitude', ''))}" if geo_data.get('lat') or geo_data.get('latitude') else None
                        }
                except Exception as e:
                    self.logger.debug(f"Failed to get geolocation from {geo_url}: {e}")
                    continue
            
            return {'location': f'IP: {public_ip} (Location lookup failed)'}
            
        except ImportError:
            self.logger.debug("requests module not available for geolocation lookup")
            return {'location': 'Geolocation unavailable (requests module missing)'}
        except Exception as e:
            self.logger.debug(f"Error getting geolocation: {e}")
            return {'location': 'Location detection failed'}
