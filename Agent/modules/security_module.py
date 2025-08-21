
"""
Security Information Collection Module
Collects security-related system information
"""

import platform
import subprocess
import json
import re
import psutil
from typing import Dict, Any
from datetime import datetime
from .base_module import BaseModule


class SecurityModule(BaseModule):
    """Security information collection module"""
    
    def __init__(self):
        super().__init__('Security')
        self.is_windows = platform.system().lower() == 'windows'
        self.is_linux = platform.system().lower() == 'linux'
        self.is_macos = platform.system().lower() == 'darwin'
    
    def collect(self) -> Dict[str, Any]:
        """Collect security information"""
        security_info = {
            'firewall_status': self._get_firewall_status(),
            'antivirus_status': self._get_antivirus_status(),
            'last_scan': self._get_last_security_scan(),
            'update_status': self._get_update_status(),
            'user_accounts': self._get_user_accounts(),
            'security_events': self._get_security_events()
        }
        
        return security_info
    
    def _get_firewall_status(self) -> str:
        """Get firewall status"""
        try:
            if self.is_windows:
                return self._get_windows_firewall_status()
            elif self.is_linux:
                return self._get_linux_firewall_status()
            elif self.is_macos:
                return self._get_macos_firewall_status()
        except Exception as e:
            self.logger.error(f"Error getting firewall status: {e}")
        
        return 'unknown'
    
    def _get_windows_firewall_status(self) -> str:
        """Get Windows firewall status"""
        try:
            result = subprocess.run([
                "powershell", "-Command", 
                "Get-NetFirewallProfile | Select-Object -ExpandProperty Enabled"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return "enabled" if "True" in result.stdout else "disabled"
        except Exception as e:
            self.logger.debug(f"Windows firewall check failed: {e}")
        
        return "unknown"
    
    def _get_linux_firewall_status(self) -> str:
        """Get Linux firewall status"""
        try:
            # Check UFW
            if self._command_exists('ufw'):
                result = subprocess.run(['ufw', 'status'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    return 'enabled' if 'active' in result.stdout.lower() else 'disabled'
            
            # Check iptables
            if self._command_exists('iptables'):
                result = subprocess.run(['iptables', '-L'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    return 'enabled' if len(result.stdout.split('\n')) > 10 else 'disabled'
        except Exception as e:
            self.logger.debug(f"Linux firewall check failed: {e}")
        
        return 'unknown'
    
    def _get_macos_firewall_status(self) -> str:
        """Get macOS firewall status"""
        try:
            result = subprocess.run([
                'sudo', '/usr/libexec/ApplicationFirewall/socketfilterfw', '--getglobalstate'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return 'enabled' if 'enabled' in result.stdout.lower() else 'disabled'
        except Exception as e:
            self.logger.debug(f"macOS firewall check failed: {e}")
        
        return 'unknown'
    
    def _get_antivirus_status(self) -> str:
        """Get antivirus status"""
        try:
            if self.is_windows:
                return self._get_windows_antivirus_status()
            else:
                return self._get_unix_antivirus_status()
        except Exception as e:
            self.logger.error(f"Error getting antivirus status: {e}")
        
        return 'unknown'
    
    def _get_windows_antivirus_status(self) -> str:
        """Get Windows Defender status"""
        try:
            ps_command = (
                "Get-MpComputerStatus | "
                "Select-Object -Property AntivirusEnabled | ConvertTo-Json"
            )
            result = subprocess.run(["powershell", "-Command", ps_command],
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and result.stdout:
                status = json.loads(result.stdout.strip())
                return "enabled" if status.get("AntivirusEnabled") else "disabled"
        except Exception as e:
            self.logger.debug(f"Windows antivirus check failed: {e}")
        
        return "unknown"
    
    def _get_unix_antivirus_status(self) -> str:
        """Get antivirus status on Unix-like systems"""
        av_processes = ['clamav', 'rkhunter', 'chkrootkit', 'sophos', 'avast', 'avg', 'norton', 'mcafee']
        
        try:
            for proc in psutil.process_iter(['name']):
                try:
                    if any(av in proc.info['name'].lower() for av in av_processes):
                        return 'enabled'
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            self.logger.debug(f"Unix antivirus check failed: {e}")
        
        return 'unknown'
    
    def _get_last_security_scan(self) -> str:
        """Get last security scan information"""
        try:
            if self.is_windows:
                return self._get_windows_last_scan()
        except Exception as e:
            self.logger.error(f"Error getting last scan info: {e}")
        
        return 'unknown'
    
    def _get_windows_last_scan(self) -> str:
        """Get Windows Defender last scan information"""
        try:
            ps_command = (
                "Get-MpComputerStatus | "
                "Select-Object -Property QuickScanStartTime,FullScanStartTime | ConvertTo-Json"
            )
            result = subprocess.run(["powershell", "-Command", ps_command],
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and result.stdout:
                status = json.loads(result.stdout.strip())
                quick = self._normalize_win_date(status.get('QuickScanStartTime'))
                full = self._normalize_win_date(status.get('FullScanStartTime'))
                return f"Quick: {quick} / Full: {full}"
        except Exception as e:
            self.logger.debug(f"Windows last scan check failed: {e}")
        
        return "unknown"
    
    def _get_update_status(self) -> Dict[str, Any]:
        """Get system update status"""
        try:
            if self.is_windows:
                return self._get_windows_update_status()
        except Exception as e:
            self.logger.error(f"Error getting update status: {e}")
        
        return {'last_check': 'unknown', 'automatic_updates': 'unknown'}
    
    def _get_windows_update_status(self) -> Dict[str, Any]:
        """Get Windows update status"""
        update_info = {}
        
        try:
            # Last update check
            ps = "(New-Object -ComObject Microsoft.Update.AutoUpdate).Results.LastSearchSuccessDate"
            result = subprocess.run(["powershell", "-Command", ps],
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0 and result.stdout.strip():
                update_info["last_check"] = result.stdout.strip()
            else:
                update_info["last_check"] = "Unknown"
        except Exception:
            update_info["last_check"] = "Unknown"
        
        try:
            # Automatic updates status
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
                update_info["automatic_updates"] = au_map.get(au, f"Unknown ({au})")
            else:
                update_info["automatic_updates"] = "Managed by policy or unknown"
        except Exception:
            update_info["automatic_updates"] = "Managed by policy or unknown"
        
        return update_info
    
    def _get_user_accounts(self) -> List[Dict[str, Any]]:
        """Get user account information"""
        users = []
        
        try:
            if self.is_windows:
                users = self._get_windows_users()
            elif self.is_linux:
                users = self._get_linux_users()
        except Exception as e:
            self.logger.error(f"Error getting user accounts: {e}")
        
        return users
    
    def _get_windows_users(self) -> List[Dict[str, Any]]:
        """Get Windows user accounts"""
        users = []
        
        try:
            result = subprocess.run([
                'net', 'user'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if line.strip() and not line.startswith('-') and 'User accounts for' not in line:
                        usernames = line.split()
                        for username in usernames:
                            if username.strip():
                                users.append({
                                    'username': username.strip(),
                                    'type': 'local',
                                    'status': 'active'
                                })
        except Exception as e:
            self.logger.debug(f"Windows users check failed: {e}")
        
        return users[:20]  # Limit to first 20 users
    
    def _get_linux_users(self) -> List[Dict[str, Any]]:
        """Get Linux user accounts"""
        users = []
        
        try:
            with open('/etc/passwd', 'r') as f:
                for line in f:
                    if line.strip():
                        parts = line.strip().split(':')
                        if len(parts) >= 7:
                            username = parts[0]
                            uid = int(parts[2])
                            shell = parts[6]
                            
                            # Skip system accounts (UID < 1000)
                            if uid >= 1000 and shell != '/bin/false' and shell != '/usr/sbin/nologin':
                                users.append({
                                    'username': username,
                                    'uid': uid,
                                    'shell': shell,
                                    'type': 'local'
                                })
        except Exception as e:
            self.logger.debug(f"Linux users check failed: {e}")
        
        return users
    
    def _get_security_events(self) -> List[Dict[str, Any]]:
        """Get recent security events"""
        events = []
        
        try:
            if self.is_windows:
                events = self._get_windows_security_events()
        except Exception as e:
            self.logger.error(f"Error getting security events: {e}")
        
        return events
    
    def _get_windows_security_events(self) -> List[Dict[str, Any]]:
        """Get Windows security events"""
        events = []
        
        try:
            ps_command = (
                "Get-WinEvent -FilterHashtable @{LogName='Security'; StartTime=(Get-Date).AddDays(-1)} "
                "-MaxEvents 10 | Select-Object TimeCreated, Id, LevelDisplayName, Message | ConvertTo-Json"
            )
            result = subprocess.run(["powershell", "-Command", ps_command],
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout:
                events_data = json.loads(result.stdout.strip())
                if isinstance(events_data, dict):
                    events_data = [events_data]
                
                for event in events_data:
                    events.append({
                        'time': event.get('TimeCreated'),
                        'event_id': event.get('Id'),
                        'level': event.get('LevelDisplayName'),
                        'message': event.get('Message', '')[:200] + '...' if len(event.get('Message', '')) > 200 else event.get('Message', '')
                    })
        except Exception as e:
            self.logger.debug(f"Windows security events check failed: {e}")
        
        return events
    
    def _normalize_win_date(self, value) -> str:
        """Convert Windows date format to readable date"""
        try:
            if isinstance(value, str) and value.startswith("/Date("):
                match = re.search(r"/Date\((\d+)\)/", value)
                if match:
                    timestamp_ms = int(match.group(1))
                    dt = datetime.fromtimestamp(timestamp_ms / 1000)
                    return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass
        return value if value else "N/A"
    
    def _command_exists(self, command: str) -> bool:
        """Check if a command exists in the system"""
        try:
            result = subprocess.run(['which', command], 
                                  capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except Exception:
            return False
