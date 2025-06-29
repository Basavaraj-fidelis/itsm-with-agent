
"""
Windows System Information Collector
Windows-specific system information gathering
"""

import os
import platform
import subprocess
import psutil
import logging
from datetime import datetime
import json
import re


class WindowsCollector:
    """Windows-specific system information collector"""
    
    def __init__(self):
        self.logger = logging.getLogger('WindowsCollector')
    
    def get_os_info(self):
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
                    hotfix_info = json.loads(result.stdout.strip())
                    if isinstance(hotfix_info, dict) and 'InstalledOn' in hotfix_info:
                        info['last_update'] = hotfix_info['InstalledOn']
            except Exception as e:
                self.logger.warning(f"PowerShell last update fetch failed: {e}")

            # Full list of installed patches
            try:
                ps_command = "Get-HotFix | Select-Object HotFixID, InstalledOn | ConvertTo-Json"
                result = subprocess.run(["powershell", "-Command", ps_command], capture_output=True, text=True, timeout=30)
                if result.returncode == 0 and result.stdout:
                    patches = json.loads(result.stdout.strip())
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
    
    def get_hardware_info(self):
        """Get Windows-specific hardware information"""
        try:
            info = {}
            
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
            
            # Get CPU model from registry
            try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                  r"HARDWARE\DESCRIPTION\System\CentralProcessor\0") as key:
                    info['cpu_model'] = winreg.QueryValueEx(key, "ProcessorNameString")[0]
            except Exception:
                pass
            
            return info
        except Exception as e:
            self.logger.error(f"Error getting Windows hardware info: {e}")
            return {}
    
    def get_usb_devices(self):
        """Get USB devices on Windows"""
        try:
            usb_devices = []
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
            return usb_devices
        except Exception as e:
            self.logger.error(f"Error getting Windows USB devices: {e}")
            return []
    
    def get_security_info(self):
        """Get Windows security information"""
        try:
            info = {}

            def _normalize_win_date(value):
                """Convert /Date(1750141848172)/ to readable date"""
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

            # Firewall Status
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

            # Antivirus Status + Last Scan
            try:
                ps_command = (
                    "Get-MpComputerStatus | "
                    "Select-Object -Property AMServiceEnabled,AntivirusEnabled,QuickScanStartTime,FullScanStartTime | ConvertTo-Json"
                )
                result = subprocess.run(["powershell", "-Command", ps_command],
                                        capture_output=True, text=True, timeout=10)
                if result.returncode == 0 and result.stdout:
                    status = json.loads(result.stdout.strip())
                    if isinstance(status, dict):
                        info['antivirus_status'] = "enabled" if status.get("AntivirusEnabled") else "disabled"
                        quick = _normalize_win_date(status.get('QuickScanStartTime'))
                        full = _normalize_win_date(status.get('FullScanStartTime'))
                        info['last_scan'] = f"{quick} / {full}"
                else:
                    info['antivirus_status'] = "unknown"
            except Exception:
                info['antivirus_status'] = "unknown"

            # Last Update Check
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

            # Automatic Updates Status
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
            self.logger.error(f"Error collecting Windows security info: {e}")
            return {}
    
    def get_software_info(self):
        """Get installed software on Windows"""
        try:
            software = []
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
            
            # Limit to top 50 packages to avoid overwhelming the API
            return software[:50]
        except Exception as e:
            self.logger.error(f"Error getting Windows software info: {e}")
            return []
    
    def get_virtualization_info(self):
        """Detect if running in a virtual machine on Windows"""
        try:
            vm_info = {
                'is_virtual': False,
                'hypervisor': 'unknown',
                'detection_methods': []
            }
            
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
            
            return vm_info
        except Exception as e:
            self.logger.error(f"Error detecting Windows virtualization: {e}")
            return {'is_virtual': False, 'hypervisor': 'unknown', 'detection_methods': []}
