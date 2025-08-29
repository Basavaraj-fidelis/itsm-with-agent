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
            if not info.get('product_name'):
                try:
                    result = subprocess.run(['systeminfo'], capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        for line in result.stdout.split('\n'):
                            if 'OS Name:' in line:
                                product_name = line.split(':', 1)[1].strip()
                                if product_name and product_name.lower() not in ['n/a', '', 'null']:
                                    info['product_name'] = product_name
                            elif 'OS Version:' in line:
                                os_version = line.split(':', 1)[1].strip()
                                if os_version and os_version.lower() not in ['n/a', '', 'null']:
                                    info['os_version'] = os_version
                except Exception as e:
                    self.logger.warning(f"systeminfo command failed: {e}")

            # Ensure we have a product name from platform module as fallback
            if not info.get('product_name'):
                try:
                    import platform
                    info['product_name'] = f"{platform.system()} {platform.release()}"
                except Exception:
                    info['product_name'] = "Windows"

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
        """Get USB storage devices on Windows with deduplication"""
        try:
            usb_devices = []
            seen_serials = set()
            seen_descriptions = set()
            
            # Get USB storage devices only
            cmd = [
                "powershell",
                "-Command",
                (
                    "Get-PnpDevice -Class DiskDrive,USB | "
                    "Where-Object { "
                    "$_.FriendlyName -notmatch 'Root Hub|Host Controller|HID|Human Interface|Keyboard|Mouse|Audio|Bluetooth|Wireless|WiFi|Network|Camera|Webcam|Microphone|Speaker|Headset|Gaming|Controller|Touchpad|Fingerprint|Biometric' -and "
                    "($_.FriendlyName -match 'USB|Storage|Drive|Disk|Flash|Thumb|Memory|Card|External|Portable|Mass Storage|SSD|HDD' -or $_.InstanceId -match 'USBSTOR') "
                    "} | "
                    "Select-Object FriendlyName, InstanceId, DeviceID | ConvertTo-Json"
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
                    if desc and self._is_storage_device(desc, device_id):
                        # Extract serial number for deduplication
                        serial = self._extract_serial_from_device_id(device_id)
                        
                        # Skip if we've already seen this device (by serial or description)
                        if serial and serial in seen_serials:
                            continue
                        if desc in seen_descriptions:
                            continue
                            
                        # Extract vendor and product info
                        vendor_id = self._extract_vendor_id_from_device_id(device_id)
                        product_id = self._extract_product_id_from_device_id(device_id)
                        manufacturer = self._extract_manufacturer_from_desc(desc)
                        
                        usb_devices.append({
                            'description': desc,
                            'device_id': device_id,
                            'device_type': 'USB Storage',
                            'vendor_id': vendor_id,
                            'product_id': product_id,
                            'manufacturer': manufacturer,
                            'serial_number': serial
                        })
                        
                        if serial:
                            seen_serials.add(serial)
                        seen_descriptions.add(desc)
            
            # Also check for removable drives, but only add if not already found
            try:
                drive_cmd = [
                    "powershell",
                    "-Command",
                    (
                        "Get-WmiObject -Class Win32_LogicalDisk | "
                        "Where-Object { $_.DriveType -eq 2 } | "
                        "Select-Object DeviceID, VolumeName, Size | ConvertTo-Json"
                    )
                ]
                drive_result = subprocess.run(drive_cmd, capture_output=True, text=True, timeout=20)
                if drive_result.returncode == 0 and drive_result.stdout:
                    drives = json.loads(drive_result.stdout)
                    if isinstance(drives, dict):
                        drives = [drives]
                    
                    # Only add removable drives if we don't have any USB storage devices yet
                    if not usb_devices:
                        for drive in drives:
                            device_id = drive.get('DeviceID', '')
                            volume_name = drive.get('VolumeName', 'Removable Drive')
                            size = drive.get('Size', 0)
                            if device_id:
                                size_gb = round(int(size) / (1024**3), 2) if size else 0
                                usb_devices.append({
                                    'description': f"{volume_name} ({device_id}) - {size_gb}GB",
                                    'device_id': f"REMOVABLE_{device_id}",
                                    'device_type': 'Removable Storage',
                                    'vendor_id': 'unknown',
                                    'product_id': 'unknown',
                                    'manufacturer': 'Unknown',
                                    'serial_number': None
                                })
            except Exception as e:
                self.logger.debug(f"Error getting removable drives: {e}")
            
            return usb_devices
        except Exception as e:
            self.logger.error(f"Error getting Windows USB storage devices: {e}")
            return []
    
    def _is_storage_device(self, description, device_id):
        """Check if device is a storage device based on description and ID"""
        storage_keywords = [
            'storage', 'drive', 'disk', 'flash', 'thumb', 'memory', 'card',
            'external', 'portable', 'mass storage', 'ssd', 'hdd', 'usb drive',
            'sd card', 'micro sd', 'cf card', 'compact flash'
        ]
        
        exclude_keywords = [
            'keyboard', 'mouse', 'audio', 'bluetooth', 'wireless', 'wifi',
            'network', 'camera', 'webcam', 'microphone', 'speaker', 'headset',
            'gaming', 'controller', 'touchpad', 'fingerprint', 'biometric',
            'hid', 'human interface', 'input', 'pointing', 'composite'
        ]
        
        desc_lower = description.lower()
        id_lower = device_id.lower()
        
        # Exclude non-storage devices
        for exclude in exclude_keywords:
            if exclude in desc_lower:
                return False
        
        # Include storage devices
        for storage in storage_keywords:
            if storage in desc_lower:
                return True
        
        # Check device ID for storage indicators
        if 'usbstor' in id_lower or 'disk&' in id_lower:
            return True
        
        return False

    def _extract_serial_from_device_id(self, device_id):
        """Extract serial number from device ID"""
        try:
            # Look for serial in various formats
            if '\\' in device_id:
                parts = device_id.split('\\')
                for part in parts:
                    if len(part) > 8 and not any(x in part.upper() for x in ['VID_', 'PID_', 'REV_', 'DISK&', 'USB&']):
                        # This might be a serial number
                        return part
            return None
        except Exception:
            return None

    def _extract_vendor_id_from_device_id(self, device_id):
        """Extract vendor ID from device ID"""
        try:
            import re
            match = re.search(r'VID_([0-9A-F]{4})', device_id, re.IGNORECASE)
            return match.group(1).lower() if match else 'unknown'
        except Exception:
            return 'unknown'

    def _extract_product_id_from_device_id(self, device_id):
        """Extract product ID from device ID"""
        try:
            import re
            match = re.search(r'PID_([0-9A-F]{4})', device_id, re.IGNORECASE)
            return match.group(1).lower() if match else 'unknown'
        except Exception:
            return 'unknown'

    def _extract_manufacturer_from_desc(self, description):
        """Extract manufacturer from description"""
        try:
            # Common manufacturer names
            manufacturers = ['SanDisk', 'Kingston', 'Samsung', 'Toshiba', 'Sony', 'Lexar', 'PNY', 'Corsair', 'HP', 'Dell']
            desc_upper = description.upper()
            for mfg in manufacturers:
                if mfg.upper() in desc_upper:
                    return mfg
            return 'Unknown'
        except Exception:
            return 'Unknown'

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